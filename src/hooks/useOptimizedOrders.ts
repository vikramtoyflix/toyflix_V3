import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useMemo, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_FSkXrLtW_fYLLGipAoq1Hw_ltq5Ij-J";

interface OrderFilters {
  searchText: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderNumber: string;
  dateFrom: string;
  dateTo: string;
  statuses: string[];
  paymentStatuses: string[];
  subscriptionPlans: string[];
  orderTypes: string[];
  sortDirection?: 'asc' | 'desc';
}

interface OptimizedOrdersResponse {
  orders: any[];
  totalCount: number;
}

const STALE_TIME = 5 * 60 * 1000;
const CACHE_TIME = 15 * 60 * 1000;
const MAX_USER_IDS = 1000; // Supabase limit for IN clause
const BATCH_SIZE = 1000; // Supabase limit per query

/**
 * Orders are fetched via admin-fetch-orders Edge Function (service role server-side).
 * No client-side Supabase admin key needed - avoids 401 errors.
 */

export const useOptimizedOrders = (filters: OrderFilters) => {
  const queryClient = useQueryClient();
  const { user } = useCustomAuth();

  // Create a stable query key based on filters
  const queryKey = useMemo(() => {
    const filterKey = {
      searchText: filters.searchText,
      customerName: filters.customerName,
      customerPhone: filters.customerPhone,
      customerEmail: filters.customerEmail,
      orderNumber: filters.orderNumber,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      statuses: [...filters.statuses].sort(),
      paymentStatuses: [...filters.paymentStatuses].sort(),
      subscriptionPlans: [...filters.subscriptionPlans].sort(),
      orderTypes: [...filters.orderTypes].sort(),
      sortDirection: filters.sortDirection || 'desc',
    };
    return ['optimized-orders', filterKey];
  }, [filters]);

  // **NEW: Batch fetch ALL matching users if needed**
  const fetchAllMatchingUsers = useCallback(async (): Promise<string[] | null> => {
    if (!filters.customerName && !filters.customerEmail) {
      return null; // No user filtering needed
    }

    console.log('🔍 Batch fetching ALL matching users...');
    
    let allMatchingUsers: any[] = [];
    let hasMore = true;
    let offset = 0;
    const MAX_PAGES = 20; // Safety cap: 20 × 1000 = 20,000 users max
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;
      let userQuery = supabase
        .from('custom_users')
        .select('id');

      // Apply user-specific search filters
      if (filters.customerName && filters.customerName.trim()) {
        const nameTerm = filters.customerName.trim();
        userQuery = userQuery.or(`first_name.ilike.%${nameTerm}%,last_name.ilike.%${nameTerm}%`);
      }

      if (filters.customerEmail && filters.customerEmail.trim()) {
        userQuery = userQuery.ilike('email', `%${filters.customerEmail.trim()}%`);
      }


      const { data: userBatch, error: userError } = await userQuery
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (userError) {
        console.error('❌ Error fetching user batch:', userError);
        throw userError;
      }

      if (!userBatch || userBatch.length === 0) {
        hasMore = false;
      } else {
        allMatchingUsers = allMatchingUsers.concat(userBatch);
        console.log(`📦 Fetched user batch: ${userBatch.length}, Total so far: ${allMatchingUsers.length}`);
        
        if (userBatch.length < BATCH_SIZE) {
          hasMore = false; // Last batch
        } else {
          offset += BATCH_SIZE;
        }
      }
    }

    console.log(`✅ Found ${allMatchingUsers.length} total matching users`);
    return allMatchingUsers.map(user => user.id);
  }, [filters.customerName, filters.customerEmail]);

  // Fetch orders via Edge Function (service role server-side - no 401)
  const fetchAllOrders = useCallback(async (): Promise<any[]> => {
    if (!user?.id) throw new Error('Admin login required');

    console.log('🚀 Fetching orders via Edge Function...');

    const userIdFilter = await fetchAllMatchingUsers();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-fetch-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Admin-User-Id': user.id,
      },
      body: JSON.stringify({
        filters: {
          orderNumber: filters.orderNumber?.trim() || undefined,
          customerPhone: filters.customerPhone?.trim() || undefined,
          statuses: filters.statuses.length ? filters.statuses : undefined,
          paymentStatuses: filters.paymentStatuses.length ? filters.paymentStatuses : undefined,
          subscriptionPlans: filters.subscriptionPlans.length ? filters.subscriptionPlans : undefined,
          orderTypes: filters.orderTypes.length ? filters.orderTypes : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          userIds: userIdFilter || undefined,
          sortDirection: filters.sortDirection || 'desc',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Admin fetch failed: ${res.status}`);
    }

    const { rentalOrders, queueOrders, users } = await res.json();
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    const transformedQueue = (queueOrders || []).map((q: any) => ({
      ...q,
      order_type: 'queue_order',
      subscription_plan: q.current_plan_id,
      rental_start_date: q.estimated_delivery_date,
      rental_end_date: null,
      toys_data: q.selected_toys,
      user_phone: null,
      coupon_code: q.applied_coupon,
      discount_amount: q.coupon_discount,
      isQueueOrder: true,
      cycle_number: q.queue_cycle_number,
      shipping_address: q.delivery_address,
    }));

    const allOrders = [
      ...(rentalOrders || []).map((o: any) => ({ ...o, isQueueOrder: false })),
      ...transformedQueue,
    ].map((o: any) => ({ ...o, custom_user: userMap.get(o.user_id) || null }));

    const sortAscending = filters.sortDirection === 'asc';
    allOrders.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });

    console.log(`✅ Fetched ${allOrders.length} orders via Edge Function`);
    return allOrders;
  }, [filters, user?.id]);


  // Optimized fetch function with batch loading
  const fetchOrders = useCallback(async (): Promise<OptimizedOrdersResponse> => {
    console.log('🚀 Fetching ALL orders with batch loading');
    console.log('🔍 Fetching orders (via Edge Function)...');
    
    try {
      // Step 1: Get all matching users (if user search is needed)
      const userIdFilter = await fetchAllMatchingUsers();
      
      // If user search returned no results, return empty
      if (userIdFilter && userIdFilter.length === 0) {
        return {
          orders: [],
          totalCount: 0
        };
      }

      // Step 2: Get all orders (Edge Function returns orders with custom_user already)
      const allOrders = await fetchAllOrders();

      // Step 3: Add fallback fields (orders already have custom_user from Edge Function)
      const ordersWithUsers = allOrders.map((order: any) => {
        const userData = order.custom_user;
        
        // DEBUG: Log first few orders to see what's happening
        if (allOrders.indexOf(order) < 3) {
          console.log(`🔍 Order ${order.order_number || order.id} mapping:`, {
            orderId: order.id,
            userId: order.user_id,
            userDataFound: !!userData,
            userData: userData || 'Not found'
          });
        }
        
        return {
          ...order,
          custom_user: userData || null,
          // Add fallback fields for when custom_user is null
          fallback_customer_name: userData 
            ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
            : 'Unknown User',
          fallback_customer_phone: userData?.phone || order.user_phone || 'No phone',
          fallback_customer_email: userData?.email || 'No email',
          user_data_available: !!userData,
        };
      });

      // Log statistics about user data availability
      const ordersWithUserData = ordersWithUsers.filter(order => order.user_data_available).length;
      const ordersWithoutUserData = ordersWithUsers.length - ordersWithUserData;
      
      console.log(`📊 User data statistics:`, {
        totalOrders: ordersWithUsers.length,
        withUserData: ordersWithUserData,
        withoutUserData: ordersWithoutUserData,
        userDataAvailability: `${((ordersWithUserData / ordersWithUsers.length) * 100).toFixed(1)}%`
      });

      // Step 4: Apply user-based filtering if needed
      let finalOrders = ordersWithUsers;
      if (userIdFilter && !filters.searchText) {
        console.log('🔍 Applying user-based filtering...');
        finalOrders = ordersWithUsers.filter(order => 
          userIdFilter.includes(order.user_id)
        );
      }

      // Step 5: Apply additional client-side filters for hybrid searches
      if (filters.searchText && filters.searchText.trim()) {
        console.log('🔍 Applying comprehensive client-side searchText filtering...');
        const searchText = filters.searchText.toLowerCase();
        finalOrders = finalOrders.filter(order => {
          const customerName = order.custom_user?.first_name || order.custom_user?.last_name 
            ? `${order.custom_user.first_name || ''} ${order.custom_user.last_name || ''}`.trim().toLowerCase()
            : order.fallback_customer_name.toLowerCase();
          const customerEmail = (order.custom_user?.email || order.fallback_customer_email || '').toLowerCase();
          const customerPhone = (order.custom_user?.phone || order.fallback_customer_phone || '').toLowerCase();
          const orderNumber = (order.order_number || '').toLowerCase();

          return customerName.includes(searchText) || 
                 customerEmail.includes(searchText) || 
                 customerPhone.includes(searchText) || 
                 orderNumber.includes(searchText);
        });
      }

      console.log(`✅ FINAL RESULT: ${finalOrders.length} orders loaded with comprehensive filtering`);

      return {
        orders: finalOrders,
        totalCount: finalOrders.length
      };

    } catch (error) {
      console.error('❌ Error in batch orders fetch:', error);
      throw error;
    }
  }, [filters, fetchAllMatchingUsers, fetchAllOrders]);

  // Use regular query instead of infinite query
  const {
    data,
    error,
    isFetching,
    status,
    refetch,
    isLoading
  } = useQuery<OptimizedOrdersResponse, Error>({
    queryKey,
    queryFn: fetchOrders,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Return orders directly (no pagination flattening needed)
  const allOrders = useMemo(() => {
    return data?.orders || [];
  }, [data]);

  // Get total count from data
  const totalCount = useMemo(() => {
    return data?.totalCount || 0;
  }, [data]);

  // Update order optimistically
  const updateOrderOptimistically = useCallback((orderId: string, updates: any) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        orders: oldData.orders.map((order: any) => 
          order.id === orderId ? { ...order, ...updates } : order
        )
      };
    });
  }, [queryClient, queryKey]);

  // Invalidate and refetch orders
  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Add new order optimistically
  const addOrderOptimistically = useCallback((newOrder: any) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        orders: [newOrder, ...oldData.orders],
        totalCount: oldData.totalCount + 1
      };
    });
  }, [queryClient, queryKey]);

  return {
    orders: allOrders,
    totalCount,
    error,
    // **REMOVED: No pagination functions**
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetching,
    isFetchingNextPage: false,
    isLoading,
    status,
    refetch,
    prefetchNextPage: () => {},
    updateOrderOptimistically,
    invalidateOrders,
    addOrderOptimistically,
    // Performance metrics
    performanceMetrics: {
      cacheHitRate: queryClient.getQueryCache().getAll().length,
      totalQueries: queryClient.getQueryCache().getAll().length,
      ordersPerPage: 0, // No pagination
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME
    }
  };
}; 
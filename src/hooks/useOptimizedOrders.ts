import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { supabase } from "@/integrations/supabase/client"; // Backup client
import { useMemo, useCallback } from "react";

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
 * ALTERNATIVE APPROACH: If supabaseAdmin fails, you can replace all instances of:
 * (supabaseAdmin as any) with supabase in the user fetching logic below
 * 
 * This will use the regular client which might have different permissions
 * but should work for fetching user data in most cases.
 */

export const useOptimizedOrders = (filters: OrderFilters) => {
  const queryClient = useQueryClient();

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
      statuses: filters.statuses.sort(),
      paymentStatuses: filters.paymentStatuses.sort(),
      subscriptionPlans: filters.subscriptionPlans.sort(),
      orderTypes: filters.orderTypes.sort(),
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

    while (hasMore) {
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

  // **NEW: Batch fetch ALL orders (including queue orders)**
  const fetchAllOrders = useCallback(async (): Promise<any[]> => {
    console.log('🚀 Batch fetching ALL orders (rental + queue)...');
    
    let allRentalOrders: any[] = [];
    let allQueueOrders: any[] = [];
    
    // Fetch rental orders
    let hasMoreRental = true;
    let offsetRental = 0;

    while (hasMoreRental) {
      // Build query for this batch
      let query = (supabaseAdmin as any)
        .from('rental_orders')
        .select(`
          id,
          order_number,
          user_id,
          status,
          total_amount,
          created_at,
          rental_start_date,
          rental_end_date,
          order_type,
          payment_status,
          user_phone,
          subscription_plan,
          coupon_code,
          discount_amount,
          toys_data
        `);

      // Apply non-user filters at database level for rental orders
      if (filters.orderNumber && filters.orderNumber.trim()) {
        query = query.ilike('order_number', `%${filters.orderNumber.trim()}%`);
      }

      if (filters.customerPhone && filters.customerPhone.trim()) {
        query = query.ilike('user_phone', `%${filters.customerPhone.trim()}%`);
      }

      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters.paymentStatuses.length > 0) {
        query = query.in('payment_status', filters.paymentStatuses);
      }

      if (filters.subscriptionPlans.length > 0) {
        query = query.in('subscription_plan', filters.subscriptionPlans);
      }

      if (filters.orderTypes.length > 0) {
        query = query.in('order_type', filters.orderTypes);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
      }

      const sortAscending = filters.sortDirection === 'asc';
      const { data: rentalBatch, error: rentalError } = await query
        .order('created_at', { ascending: sortAscending })
        .range(offsetRental, offsetRental + BATCH_SIZE - 1);

      if (rentalError) {
        console.error('❌ Error fetching rental order batch:', rentalError);
        throw rentalError;
      }

      if (!rentalBatch || rentalBatch.length === 0) {
        hasMoreRental = false;
      } else {
        allRentalOrders = allRentalOrders.concat(rentalBatch);
        console.log(`📦 Fetched rental order batch: ${rentalBatch.length}, Total so far: ${allRentalOrders.length}`);
        
        if (rentalBatch.length < BATCH_SIZE) {
          hasMoreRental = false; // Last batch
        } else {
          offsetRental += BATCH_SIZE;
        }
      }
    }

    // Fetch queue orders
    console.log('🔄 Fetching queue orders...');
    let hasMoreQueue = true;
    let offsetQueue = 0;

    while (hasMoreQueue) {
      let queueQuery = (supabaseAdmin as any)
        .from('queue_orders')
        .select(`
          id,
          order_number,
          user_id,
          status,
          total_amount,
          created_at,
          estimated_delivery_date,
          queue_order_type,
          queue_cycle_number,
          payment_status,
          current_plan_id,
          selected_toys,
          delivery_address
        `);

      // Apply filters to queue orders
      if (filters.orderNumber && filters.orderNumber.trim()) {
        queueQuery = queueQuery.ilike('order_number', `%${filters.orderNumber.trim()}%`);
      }

      if (filters.statuses.length > 0) {
        queueQuery = queueQuery.in('status', filters.statuses);
      }

      if (filters.paymentStatuses.length > 0) {
        queueQuery = queueQuery.in('payment_status', filters.paymentStatuses);
      }

      if (filters.dateFrom) {
        queueQuery = queueQuery.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        queueQuery = queueQuery.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
      }

      const sortAscending = filters.sortDirection === 'asc';
      const { data: queueBatch, error: queueError } = await queueQuery
        .order('created_at', { ascending: sortAscending })
        .range(offsetQueue, offsetQueue + BATCH_SIZE - 1);

      if (queueError) {
        console.error('❌ Error fetching queue order batch:', queueError);
        throw queueError;
      }

      if (!queueBatch || queueBatch.length === 0) {
        hasMoreQueue = false;
      } else {
        // Transform queue orders to match rental order format
        const transformedQueueBatch = queueBatch.map(queueOrder => ({
          ...queueOrder,
          // Map queue order fields to rental order fields for consistency
          order_type: 'queue_order',
          subscription_plan: queueOrder.current_plan_id,
          rental_start_date: queueOrder.estimated_delivery_date,
          rental_end_date: null,
          toys_data: queueOrder.selected_toys,
          user_phone: null, // Queue orders don't have phone directly
          coupon_code: queueOrder.applied_coupon,
          discount_amount: queueOrder.coupon_discount,
          isQueueOrder: true, // Flag to identify queue orders
          cycle_number: queueOrder.queue_cycle_number,
          shipping_address: queueOrder.delivery_address
        }));

        allQueueOrders = allQueueOrders.concat(transformedQueueBatch);
        console.log(`📦 Fetched queue order batch: ${queueBatch.length}, Total so far: ${allQueueOrders.length}`);
        
        if (queueBatch.length < BATCH_SIZE) {
          hasMoreQueue = false; // Last batch
        } else {
          offsetQueue += BATCH_SIZE;
        }
      }
    }

    // Combine and sort all orders
    const allOrders = [
      ...allRentalOrders.map(order => ({ ...order, isQueueOrder: false })),
      ...allQueueOrders
    ];

    // Sort by creation date based on sortDirection
    const sortAscending = filters.sortDirection === 'asc';
    allOrders.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });

    console.log(`✅ Found ${allOrders.length} total orders (${allRentalOrders.length} rental + ${allQueueOrders.length} queue)`);
    return allOrders;
  }, [filters]);

  // Optimized fetch function with batch loading
  const fetchOrders = useCallback(async (): Promise<OptimizedOrdersResponse> => {
    console.log('🚀 Fetching ALL orders with batch loading');
    console.log('🔍 DEBUG: Supabase client info:', {
      supabaseAdmin: !!supabaseAdmin,
      supabase: !!supabase
    });
    
    try {
      // DEBUGGING: Test simple user fetch first
      console.log('🧪 Testing simple user fetch...');
      const { data: testUsers, error: testError } = await supabase
        .from('custom_users')
        .select('id, first_name, last_name, phone')
        .limit(5);
      
      console.log('🧪 Test user fetch result:', {
        success: !testError,
        error: testError,
        userCount: testUsers?.length || 0,
        sampleUser: testUsers?.[0] || null
      });

      // Step 1: Get all matching users (if user search is needed)
      const userIdFilter = await fetchAllMatchingUsers();
      
      // If user search returned no results, return empty
      if (userIdFilter && userIdFilter.length === 0) {
        return {
          orders: [],
          totalCount: 0
        };
      }

      // Step 2: Get all orders
      const allOrders = await fetchAllOrders();

      // Step 3: Batch fetch user data for all orders with improved error handling
      const userIds = Array.from(new Set(
        allOrders
          .map((order: any) => order.user_id)
          .filter((id: any): id is string => typeof id === 'string' && id !== null)
      )) as string[];

      console.log(`👥 Fetching user data for ${userIds.length} unique users...`);

      // OPTIMIZED: Try smaller batches first, then individual queries as fallback
      console.log('🔧 Using optimized batch + individual fallback approach...');
      
      let allUsersData: any[] = [];
      const SMALL_BATCH_SIZE = 100; // Smaller batches that are more likely to work
      let failedBatches = 0;

      // Try smaller batch queries first
      for (let i = 0; i < userIds.length; i += SMALL_BATCH_SIZE) {
        const userIdsBatch = userIds.slice(i, i + SMALL_BATCH_SIZE);
        
        try {
          const { data: usersBatch, error: usersError } = await supabase
            .from('custom_users')
            .select('id, email, first_name, last_name, phone, subscription_plan')
            .in('id', userIdsBatch);

          if (!usersError && usersBatch) {
            allUsersData = allUsersData.concat(usersBatch);
            console.log(`✅ Batch fetch successful: ${usersBatch.length} users (batch ${Math.floor(i/SMALL_BATCH_SIZE) + 1})`);
          } else {
            console.warn(`⚠️ Batch failed, trying individual queries for batch ${Math.floor(i/SMALL_BATCH_SIZE) + 1}:`, usersError);
            failedBatches++;
            
            // Fallback to individual queries for this batch only
            for (const userId of userIdsBatch) {
              try {
                const { data: userData, error: userError } = await supabase
                  .from('custom_users')
                  .select('id, email, first_name, last_name, phone, subscription_plan')
                  .eq('id', userId)
                  .single();

                if (!userError && userData) {
                  allUsersData.push(userData);
                }
              } catch (singleUserError) {
                // Silent fail for individual queries
              }
            }
          }
        } catch (batchError) {
          console.warn(`⚠️ Batch exception, trying individual queries for batch ${Math.floor(i/SMALL_BATCH_SIZE) + 1}`);
          failedBatches++;
          
          // Fallback to individual queries for this batch only
          for (const userId of userIdsBatch) {
            try {
              const { data: userData, error: userError } = await supabase
                .from('custom_users')
                .select('id, email, first_name, last_name, phone, subscription_plan')
                .eq('id', userId)
                .single();

              if (!userError && userData) {
                allUsersData.push(userData);
              }
            } catch (singleUserError) {
              // Silent fail for individual queries
            }
          }
        }
      }

      console.log(`✅ Optimized user fetches completed: ${allUsersData.length} users found (${failedBatches} batches failed)`);

      // Create user lookup map
      const userMap = new Map(allUsersData.map((user: any) => [user.id, user]));
      console.log('🗺️ User map created:', {
        totalUsers: allUsersData.length,
        mapSize: userMap.size,
        sampleUserIds: Array.from(userMap.keys()).slice(0, 3)
      });

      // Enhance orders with user data and add fallback logic
      const ordersWithUsers = allOrders.map((order: any) => {
        const userData = userMap.get(order.user_id);
        
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
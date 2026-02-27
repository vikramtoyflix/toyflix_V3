import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
  is_active: boolean | null;
  last_login: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  updated_at: string | null;
}

export interface UserFilters {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'all';
  city?: string;
  state?: string;
  subscription_status?: 'all' | 'active_subscriber' | 'near_pickup' | 'new_cycle' | 'overdue' | 'inactive';
  created_from?: string; // Date filter for creation date from
  created_to?: string;   // Date filter for creation date to
  date_range?: 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'custom';
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Enhanced search function to handle multiple phone formats
const buildSearchQuery = (query: any, searchTerm: string) => {
  const trimmedTerm = searchTerm.trim();
  
  console.log('🔍 Building search query for term:', trimmedTerm);
  
  // Check if search term looks like a phone number
  const isPhoneNumber = /^\+?91?\d{8,12}$/.test(trimmedTerm.replace(/[\s\-]/g, ''));
  
  if (isPhoneNumber) {
    console.log('🔍 Phone number detected, creating variations for:', trimmedTerm);
    
    // Create phone number variations
    const phoneVariations = generatePhoneVariations(trimmedTerm);
    console.log('📱 Phone variations:', phoneVariations);
    
    // Build phone search queries
    const phoneQueries = phoneVariations.map(phone => `phone.eq.${phone}`);
    
    // Build the OR query with proper formatting
    const orConditions = [
      `first_name.ilike.%${trimmedTerm}%`,
      `last_name.ilike.%${trimmedTerm}%`,
      `email.ilike.%${trimmedTerm}%`,
      ...phoneQueries,
      `city.ilike.%${trimmedTerm}%`,
      `state.ilike.%${trimmedTerm}%`
    ].join(',');
    
    console.log('🔍 Phone search OR conditions:', orConditions);
    return query.or(orConditions);
  } else {
    // Regular text search with proper formatting
    const orConditions = [
      `first_name.ilike.%${trimmedTerm}%`,
      `last_name.ilike.%${trimmedTerm}%`,
      `email.ilike.%${trimmedTerm}%`,
      `phone.ilike.%${trimmedTerm}%`,
      `city.ilike.%${trimmedTerm}%`,
      `state.ilike.%${trimmedTerm}%`
    ].join(',');
    
    console.log('🔍 Regular search OR conditions:', orConditions);
    return query.or(orConditions);
  }
};

// Helper function to generate phone number variations
const generatePhoneVariations = (phoneInput: string): string[] => {
  const cleanPhone = phoneInput.replace(/[\s\-]/g, '');
  const variations: string[] = [];
  
  // Original input
  variations.push(cleanPhone);
  
  // Remove country codes
  if (cleanPhone.startsWith('+91')) {
    variations.push(cleanPhone.substring(3));
  }
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    variations.push(cleanPhone.substring(2));
  }
  
  // Add country codes
  const baseNumber = cleanPhone.replace(/^\+?91/, '');
  if (baseNumber.length === 10) {
    variations.push(`+91${baseNumber}`);
    variations.push(`91${baseNumber}`);
  }
  
  // Get last 10 digits for any longer numbers
  if (cleanPhone.length > 10) {
    const last10 = cleanPhone.slice(-10);
    variations.push(last10);
    variations.push(`+91${last10}`);
    variations.push(`91${last10}`);
  }
  
  // Remove duplicates and return
  return [...new Set(variations)];
};

export const useAdminUsers = (
  page: number = 1,
  pageSize: number = 50,
  filters: UserFilters = {}
) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', page, pageSize, filters],
    queryFn: async (): Promise<PaginatedUsersResponse> => {
      console.log('🔄 Fetching paginated admin users data...', { page, pageSize, filters });
      
      // Step 1: If subscription_status filter is applied, get filtered user IDs first
      let subscriptionFilteredUserIds: string[] | null = null;
      
      if (filters.subscription_status && filters.subscription_status !== 'all') {
        console.log('🔍 Applying subscription status filter:', filters.subscription_status);
        
        try {
          // Get all rental orders to determine user statuses
          const { data: rentalOrders, error: ordersError } = await (supabase as any)
            .from('rental_orders')
            .select(`
              id,
              user_id,
              status,
              rental_start_date,
              rental_end_date,
              cycle_number,
              created_at
            `)
            .order('created_at', { ascending: false });

          if (ordersError) {
            console.error('❌ Error fetching rental orders for filtering:', ordersError);
          } else {
            const today = new Date();
            const userOrdersMap: { [userId: string]: any[] } = {};
            
            // Group orders by user
            (rentalOrders || []).forEach((order: any) => {
              if (!userOrdersMap[order.user_id]) {
                userOrdersMap[order.user_id] = [];
              }
              userOrdersMap[order.user_id].push(order);
            });

            // Filter users based on subscription status
            const filteredUserIds: string[] = [];
            
            Object.entries(userOrdersMap).forEach(([userId, orders]) => {
              const currentOrder = orders[0]; // Most recent order
              
              if (!currentOrder) {
                if (filters.subscription_status === 'inactive') {
                  filteredUserIds.push(userId);
                }
                return;
              }

              const startDate = new Date(currentOrder.rental_start_date);
              const endDate = new Date(currentOrder.rental_end_date);
              const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const daysUntilPickup = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              let status = 'inactive';
              
              // Determine status based on order timing
              if (currentOrder.status === 'delivered' || currentOrder.status === 'active') {
                if (daysUntilPickup <= 3 && daysUntilPickup >= 0) {
                  status = 'near_pickup';
                } else if (daysUntilPickup < 0) {
                  status = 'overdue';
                } else if (daysPassed <= 7) {
                  status = 'new_cycle';
                } else {
                  status = 'active_subscriber';
                }
              } else if (currentOrder.status === 'pending' || currentOrder.status === 'confirmed') {
                status = 'new_cycle';
              }

              if (status === filters.subscription_status) {
                filteredUserIds.push(userId);
              }
            });

            // Also include users with no orders if filtering for 'inactive'
            if (filters.subscription_status === 'inactive') {
              const usersWithOrders = new Set(Object.keys(userOrdersMap));
              
              // Get all user IDs and add those without orders
              const { data: allUsers, error: allUsersError } = await supabase
                .from('custom_users')
                .select('id');
                
              if (!allUsersError && allUsers) {
                allUsers.forEach(user => {
                  if (!usersWithOrders.has(user.id)) {
                    filteredUserIds.push(user.id);
                  }
                });
              }
            }

            subscriptionFilteredUserIds = filteredUserIds;
            console.log(`🔍 Found ${filteredUserIds.length} users matching subscription status: ${filters.subscription_status}`);
          }
        } catch (error) {
          console.error('❌ Error applying subscription filter:', error);
        }
      }
      
      try {
        // Step 2: Build the query with filters
        let query = supabase
          .from('custom_users')
          .select(`
            id,
            email,
            phone,
            first_name,
            last_name,
            role,
            created_at,
            is_active,
            last_login,
            city,
            state,
            address_line1,
            updated_at
          `, { count: 'exact' });

        // Apply subscription status filter by user IDs (most restrictive filter first)
        if (subscriptionFilteredUserIds !== null) {
          if (subscriptionFilteredUserIds.length === 0) {
            // No users match the subscription filter, return empty result
            console.log('📭 No users match subscription filter, returning empty result');
            return {
              users: [],
              totalCount: 0,
              totalPages: 0,
              currentPage: page,
              pageSize
            };
          }
          query = query.in('id', subscriptionFilteredUserIds);
        }

        // Apply search filter
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          console.log('🔍 Applying search filter:', searchTerm);
          try {
            query = buildSearchQuery(query, searchTerm);
          } catch (searchError) {
            console.error('❌ Error building search query:', searchError);
            // Continue without search filter if it fails
          }
        }

        // Apply role filter
        if (filters.role && filters.role !== 'all') {
          query = query.eq('role', filters.role);
        }

        // Apply status filter
        if (filters.status && filters.status !== 'all') {
          query = query.eq('is_active', filters.status === 'active');
        }

        // Apply city filter
        if (filters.city && filters.city.trim()) {
          query = query.ilike('city', `%${filters.city.trim()}%`);
        }

        // Apply state filter
        if (filters.state && filters.state.trim()) {
          query = query.ilike('state', `%${filters.state.trim()}%`);
        }

        // Apply creation date filters
        if (filters.date_range && filters.date_range !== 'all') {
          const now = new Date();
          let fromDate: string | null = null;
          let toDate: string | null = null;

          switch (filters.date_range) {
            case 'today':
              fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
              toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
              break;
            case 'yesterday':
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
              toDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1).toISOString();
              break;
            case 'last_7_days':
              fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
              break;
            case 'last_30_days':
              fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
              break;
            case 'last_3_months':
              fromDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString();
              break;
            case 'last_6_months':
              fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString();
              break;
            case 'custom':
              fromDate = filters.created_from || null;
              toDate = filters.created_to || null;
              break;
          }

          if (fromDate) {
            query = query.gte('created_at', fromDate);
          }
          if (toDate) {
            query = query.lt('created_at', toDate);
          }
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        query = query
          .order('created_at', { ascending: false })
          .range(from, to);

        console.log('🔍 Executing query with filters:', { 
          search: filters.search, 
          role: filters.role, 
          status: filters.status,
          subscription_status: filters.subscription_status
        });

        const { data: users, error: currentError, count } = await query;

        if (currentError) {
          console.error('❌ Error fetching users from custom_users:', currentError);
          console.error('❌ Error details:', {
            code: currentError.code,
            message: currentError.message,
            details: currentError.details
          });
          
          // Fallback to admin_users_view with same filters
          console.log('📊 Fallback: Querying admin_users_view...');
          let fallbackQuery = supabase
            .from('admin_users_view')
            .select('*', { count: 'exact' });

          // Apply subscription status filter to fallback too
          if (subscriptionFilteredUserIds !== null) {
            if (subscriptionFilteredUserIds.length === 0) {
              console.log('📭 No users match subscription filter in fallback, returning empty result');
              return {
                users: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: page,
                pageSize
              };
            }
            fallbackQuery = fallbackQuery.in('id', subscriptionFilteredUserIds);
          }

          // Apply same filters to fallback
          if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.trim();
            try {
              fallbackQuery = buildSearchQuery(fallbackQuery, searchTerm);
            } catch (fallbackSearchError) {
              console.error('❌ Error building fallback search query:', fallbackSearchError);
            }
          }

          if (filters.role && filters.role !== 'all') {
            fallbackQuery = fallbackQuery.eq('role', filters.role);
          }

          if (filters.status && filters.status !== 'all') {
            fallbackQuery = fallbackQuery.eq('is_active', filters.status === 'active');
          }

          if (filters.city && filters.city.trim()) {
            fallbackQuery = fallbackQuery.ilike('city', `%${filters.city.trim()}%`);
          }

          if (filters.state && filters.state.trim()) {
            fallbackQuery = fallbackQuery.ilike('state', `%${filters.state.trim()}%`);
          }

          fallbackQuery = fallbackQuery
            .order('created_at', { ascending: false })
            .range(from, to);

          const { data: adminViewUsers, error: adminViewError, count: adminViewCount } = await fallbackQuery;

          if (adminViewError) {
            console.error('❌ admin_users_view query also failed:', adminViewError);
            throw new Error(`Failed to fetch users from any source: ${adminViewError.message}`);
          }

          const totalCount = adminViewCount || 0;
          const totalPages = Math.ceil(totalCount / pageSize);

          console.log(`✅ Found ${adminViewUsers?.length || 0} users from admin_users_view (page ${page}/${totalPages})`);
          
          return {
            users: (adminViewUsers || []).map(user => ({
              ...user,
              role: user.role as 'admin' | 'user'
            })),
            totalCount,
            totalPages,
            currentPage: page,
            pageSize
          };
        }
        
        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        console.log(`✅ Found ${users?.length || 0} users from custom_users (page ${page}/${totalPages}, total: ${totalCount})`);
        
        return {
          users: (users || []).map(user => ({
            ...user,
            role: user.role as 'admin' | 'user'
          })),
          totalCount,
          totalPages,
          currentPage: page,
          pageSize
        };
        
      } catch (error) {
        console.error('❌ Error in user fetch:', error);
        // Return empty result instead of throwing to prevent admin panel crash
        console.warn('⚠️ Returning empty user list due to fetch error.');
        return {
          users: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize
        };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - fresher data
    gcTime: 1000 * 60 * 5, // 5 minutes cache
    refetchInterval: false, // Manual refresh only
    refetchOnWindowFocus: true, // Refresh when window gains focus
    refetchOnMount: true, // Always fetch on mount
    retry: (failureCount, error) => {
      console.log(`🔄 Admin users query retry attempt ${failureCount + 1}:`, error.message);
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Set up real-time subscription for user changes
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for admin users...');
    
    const setupSubscription = () => {
      try {
        // Clear any existing timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Remove existing subscription
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
        }

        const channel = supabase
          .channel('admin-users-realtime')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events
              schema: 'public',
              table: 'custom_users'
            },
            (payload) => {
              const userId = (payload.new as any)?.id || (payload.old as any)?.id || 'unknown';
              console.log('📡 Real-time user change detected:', payload.eventType, userId);
              
              // Invalidate queries for all pages and filters
              queryClient.invalidateQueries({ queryKey: ['admin-users'] });
              
              // Also refetch current query to ensure immediate update
              refetch();
            }
          )
          .subscribe((status, err) => {
            console.log('📡 Admin users subscription status:', status);
            
            if (err) {
              console.error('❌ Admin users subscription error:', err);
              // Reconnect after error
              reconnectTimeoutRef.current = setTimeout(() => {
                console.log('🔄 Reconnecting admin users subscription after error...');
                setupSubscription();
              }, 5000);
              return;
            }

            switch (status) {
              case 'SUBSCRIBED':
                console.log('✅ Successfully subscribed to admin users changes');
                break;
              case 'TIMED_OUT':
                console.warn('⏰ Admin users subscription timed out, reconnecting...');
                reconnectTimeoutRef.current = setTimeout(setupSubscription, 3000);
                break;
              case 'CLOSED':
                console.warn('🔒 Admin users subscription closed, reconnecting...');
                reconnectTimeoutRef.current = setTimeout(setupSubscription, 3000);
                break;
              case 'CHANNEL_ERROR':
                console.error('💥 Admin users subscription channel error, reconnecting...');
                reconnectTimeoutRef.current = setTimeout(setupSubscription, 5000);
                break;
            }
          });

        subscriptionRef.current = channel;
      } catch (error) {
        console.error('❌ Error setting up admin users subscription:', error);
        // Retry setup after error
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Retrying admin users subscription setup...');
          setupSubscription();
        }, 10000);
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up admin users subscription...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        } catch (error) {
          console.error('❌ Error removing admin users subscription:', error);
        }
      }
    };
  }, [queryClient, refetch]);

  // Return the correct structure
  return {
    data, // Contains the paginated response
    isLoading,
    error,
    refetch,
    forceRefresh: async () => {
      console.log('🔄 Force refreshing admin users data...');
      // Clear cache and refetch
      queryClient.removeQueries({ queryKey: ['admin-users'] });
      return refetch();
    }
  };
};

// Hook for getting user statistics
export const useUserStats = () => {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      console.log('📊 Fetching user statistics...');
      
      try {
        // Get total users count
        const { count: totalUsers, error: totalError } = await supabase
          .from('custom_users')
          .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Get active users count
        const { count: activeUsers, error: activeError } = await supabase
          .from('custom_users')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (activeError) throw activeError;

        // Get admin users count
        const { count: adminUsers, error: adminError } = await supabase
          .from('custom_users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (adminError) throw adminError;

        // Get users created in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: recentUsers, error: recentError } = await supabase
          .from('custom_users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (recentError) throw recentError;

        return {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
          adminUsers: adminUsers || 0,
          regularUsers: (totalUsers || 0) - (adminUsers || 0),
          recentUsers: recentUsers || 0
        };
      } catch (error) {
        console.error('❌ Error fetching user statistics:', error);
        return {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          regularUsers: 0,
          recentUsers: 0
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  });
};

// New interface for user subscription status
export interface UserSubscriptionStatus {
  user_id: string;
  status: 'near_pickup' | 'active_subscriber' | 'new_cycle' | 'overdue' | 'inactive';
  priority: 'high' | 'medium' | 'low';
  current_order?: any;
  days_until_pickup?: number;
  cycle_number?: number;
  subscription_plan?: string;
}

// New hook to fetch user subscription statuses
export const useUsersSubscriptionStatus = () => {
  return useQuery({
    queryKey: ['users-subscription-status'],
    queryFn: async (): Promise<{ [userId: string]: UserSubscriptionStatus }> => {
      console.log('🔄 Fetching user subscription statuses...');
      
      try {
        // Get all rental orders with user info
        const { data: rentalOrders, error: ordersError } = await (supabase as any)
          .from('rental_orders')
          .select(`
            id,
            user_id,
            user_phone,
            status,
            rental_start_date,
            rental_end_date,
            cycle_number,
            subscription_plan,
            created_at,
            toys_delivered_count,
            toys_returned_count
          `)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('❌ Error fetching rental orders:', ordersError);
          return {};
        }

        const statusMap: { [userId: string]: UserSubscriptionStatus } = {};
        const today = new Date();
        
        // Process each user's orders
        const userOrdersMap: { [userId: string]: any[] } = {};
        
        (rentalOrders || []).forEach((order: any) => {
          if (!userOrdersMap[order.user_id]) {
            userOrdersMap[order.user_id] = [];
          }
          userOrdersMap[order.user_id].push(order);
        });

        // Calculate status for each user
        Object.entries(userOrdersMap).forEach(([userId, orders]) => {
          const currentOrder = orders[0]; // Most recent order
          
          if (!currentOrder) {
            statusMap[userId] = {
              user_id: userId,
              status: 'inactive',
              priority: 'low'
            };
            return;
          }

          const startDate = new Date(currentOrder.rental_start_date);
          const endDate = new Date(currentOrder.rental_end_date);
          const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysUntilPickup = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let status: UserSubscriptionStatus['status'] = 'inactive';
          let priority: UserSubscriptionStatus['priority'] = 'low';
          
          // Determine status based on order timing
          if (currentOrder.status === 'delivered' || currentOrder.status === 'active') {
            if (daysUntilPickup <= 3 && daysUntilPickup >= 0) {
              status = 'near_pickup';
              priority = 'high';
            } else if (daysUntilPickup < 0) {
              status = 'overdue';
              priority = 'high';
            } else if (daysPassed <= 7) {
              status = 'new_cycle';
              priority = 'medium';
            } else {
              status = 'active_subscriber';
              priority = 'medium';
            }
          } else if (currentOrder.status === 'pending' || currentOrder.status === 'confirmed') {
            status = 'new_cycle';
            priority = 'medium';
          }

          statusMap[userId] = {
            user_id: userId,
            status,
            priority,
            current_order: currentOrder,
            days_until_pickup: daysUntilPickup,
            cycle_number: currentOrder.cycle_number,
            subscription_plan: currentOrder.subscription_plan
          };
        });

        console.log('✅ User subscription statuses calculated:', Object.keys(statusMap).length);
        return statusMap;
        
      } catch (error) {
        console.error('❌ Error fetching subscription statuses:', error);
        return {};
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });
};

// New hook for priority metrics
export const useUserPriorityMetrics = () => {
  const { data: statusMap } = useUsersSubscriptionStatus();
  
  return useMemo(() => {
    if (!statusMap) {
      return {
        nearPickup: 0,
        activeSubscribers: 0,
        newCycles: 0,
        overdue: 0
      };
    }

    const statuses = Object.values(statusMap);
    
    return {
      nearPickup: statuses.filter(s => s.status === 'near_pickup').length,
      activeSubscribers: statuses.filter(s => s.status === 'active_subscriber').length,
      newCycles: statuses.filter(s => s.status === 'new_cycle').length,
      overdue: statuses.filter(s => s.status === 'overdue').length
    };
  }, [statusMap]);
};

import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { StaticWebAppWooCommerceService } from '@/services/staticWebAppWooCommerceService';
import { supabase } from '@/integrations/supabase/client';
import { HybridUser } from './useHybridAuth';

export interface HybridOrder {
  id: string;
  source: 'woocommerce' | 'supabase';
  created_at: string;
  status: string;
  total_amount: number;
  currency?: string;
  items?: any[];
  shipping_address?: any;
  // WooCommerce specific fields
  wc_order_id?: string;
}

// Fast orders hook - checks user source first
export const useHybridOrders = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['hybrid-orders', user?.id, (user as any)?.source],
    queryFn: async (): Promise<HybridOrder[]> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      const hybridUser = user as any as HybridUser;
      console.log('📦 Fetching hybrid orders for user:', hybridUser.id, 'source:', hybridUser.source);

      // Check if user has WooCommerce data flag
      if (hybridUser.source === 'woocommerce' || hybridUser.has_woocommerce_data) {
        return fetchWooCommerceOrdersOptimized(hybridUser);
      } else {
        return fetchSupabaseOrders(hybridUser);
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Optimized WooCommerce order fetching
const fetchWooCommerceOrdersOptimized = async (user: HybridUser): Promise<HybridOrder[]> => {
  try {
    console.log('📦 Fetching WooCommerce orders for migrated user:', user.id);
    
    // For migrated users, we need to find their WooCommerce user ID by phone
    // This is a one-time lookup that could be cached
    let woocommerceUserId = user.wc_user_id;
    
    if (!woocommerceUserId) {
      console.log('🔍 Looking up WooCommerce user ID by phone...');
              const wcUser = await StaticWebAppWooCommerceService.getUserByPhone(user.phone);
      
      if (!wcUser) {
        console.log('❌ No WooCommerce user found for phone:', user.phone);
        return [];
      }
      
      woocommerceUserId = wcUser.ID.toString();
      console.log('✅ Found WooCommerce user ID:', woocommerceUserId);
    }

            const orders = await StaticWebAppWooCommerceService.getUserOrders(woocommerceUserId);
    
    if (!orders || orders.length === 0) {
      console.log('No WooCommerce orders found for user');
      return [];
    }

    // Transform WooCommerce orders to hybrid format
    const hybridOrders: HybridOrder[] = orders.map((wcOrder) => ({
      id: `wc_${wcOrder.order_id}`,
      source: 'woocommerce' as const,
      created_at: wcOrder.created_at,
                status: StaticWebAppWooCommerceService.mapOrderStatus(wcOrder.post_status),
      total_amount: parseFloat(wcOrder.total_amount || '0'),
      currency: wcOrder.currency || 'INR',
      wc_order_id: wcOrder.order_id.toString(),
      items: [], // Loaded separately for performance
      shipping_address: {
        first_name: wcOrder.billing_first_name,
        last_name: wcOrder.billing_last_name,
        phone: wcOrder.billing_phone,
        address_1: wcOrder.billing_address_1,
        city: wcOrder.billing_city,
        state: wcOrder.billing_state,
        postcode: wcOrder.billing_postcode
      }
    }));

    console.log('✅ WooCommerce orders fetched:', hybridOrders.length);
    return hybridOrders;
    
  } catch (error) {
    console.error('❌ Error fetching WooCommerce orders:', error);
    return [];
  }
};

// Fetch orders from Supabase database
const fetchSupabaseOrders = async (user: HybridUser): Promise<HybridOrder[]> => {
  try {
    console.log('📦 Fetching Supabase orders for user ID:', user.id);
    
    // STEP 1: Get orders without problematic JOIN
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Supabase orders query error:', ordersError);
      throw ordersError;
    }

    console.log('✅ Supabase orders fetched:', ordersData?.length);

    // STEP 2: Get order items separately
    const orderIds = ordersData?.map(order => order.id) || [];
    let orderItemsData: any[] = [];
    let toysData: any[] = [];

    if (orderIds.length > 0) {
      // Get order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, toy_id, quantity, rental_price, unit_price, total_price')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('⚠️ Error fetching order items (continuing without them):', itemsError);
      } else {
        orderItemsData = itemsData || [];
        console.log('✅ Order items fetched:', orderItemsData.length);

        // Get toys for the items
        const toyIds = [...new Set(orderItemsData.map(item => item.toy_id))];
        if (toyIds.length > 0) {
          const { data: toysDataResult, error: toysError } = await supabase
            .from('toys')
            .select('id, name, image_url')
            .in('id', toyIds);

          if (toysError) {
            console.error('⚠️ Error fetching toys (continuing without them):', toysError);
          } else {
            toysData = toysDataResult || [];
            console.log('✅ Toys fetched:', toysData.length);
          }
        }
      }
    }

    // STEP 3: Combine the data
    const hybridOrders: HybridOrder[] = ordersData?.map(order => {
      const orderItems = orderItemsData.filter(item => item.order_id === order.id);
      
      const items = orderItems.map(item => {
        const toy = toysData.find(t => t.id === item.toy_id);
        return {
          id: item.id,
          name: toy?.name || 'Unknown Item',
          quantity: item.quantity || 1,
          price: item.rental_price || item.unit_price || item.total_price || 0,
          toy_id: item.toy_id,
          image_url: toy?.image_url
        };
      });

      return {
        id: order.id,
        source: 'supabase' as const,
        created_at: order.created_at,
        status: order.status,
        total_amount: order.total_amount || 0,
        currency: 'INR',
        items: items,
        shipping_address: order.shipping_address
      };
    }) || [];

    console.log('✅ Supabase hybrid orders assembled:', hybridOrders.length);
    return hybridOrders;
    
  } catch (error) {
    console.error('❌ Error fetching Supabase orders:', error);
    return [];
  }
};

// Hook for current rentals
export const useHybridCurrentRentals = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['hybrid-current-rentals', user?.id, (user as any)?.source],
    queryFn: async () => {
      if (!user) {
        throw new Error('No user logged in');
      }

      const hybridUser = user as any as HybridUser;
      console.log('🏠 Fetching current rentals for user:', hybridUser.id);

      if (hybridUser.source === 'woocommerce' || hybridUser.has_woocommerce_data) {
        // For WooCommerce users, show recent delivered orders
        try {
          const orders = await fetchWooCommerceOrdersOptimized(hybridUser);
          const recentOrders = orders
            .filter(order => order.status === 'delivered' || order.status === 'completed')
            .slice(0, 3);
          
          console.log('✅ WooCommerce current rentals:', recentOrders.length);
          return recentOrders;
        } catch (error) {
          console.error('❌ Error fetching WooCommerce current rentals:', error);
          return [];
        }
      } else {
        // Supabase users - use simplified query (without returned_date filter)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', hybridUser.id)
          .in('status', ['shipped', 'delivered'])
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('❌ Error fetching Supabase current rentals:', ordersError);
          return [];
        }

        // Get order items separately if needed
        const orderIds = ordersData?.map(order => order.id) || [];
        let orderItemsData: any[] = [];
        let toysData: any[] = [];

        if (orderIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('id, order_id, toy_id, quantity, rental_price, unit_price, total_price')
            .in('order_id', orderIds);

          if (itemsError) {
            console.error('⚠️ Error fetching current rental items:', itemsError);
          } else {
            orderItemsData = itemsData || [];
            console.log('✅ Current rental items fetched:', orderItemsData.length);

            // Get toys for the items
            const toyIds = [...new Set(orderItemsData.map(item => item.toy_id))];
            if (toyIds.length > 0) {
              const { data: toysDataResult, error: toysError } = await supabase
                .from('toys')
                .select('id, name, image_url, category, age_range')
                .in('id', toyIds);

              if (toysError) {
                console.error('⚠️ Error fetching toys for current rentals:', toysError);
              } else {
                toysData = toysDataResult || [];
                console.log('✅ Toys for current rentals fetched:', toysData.length);
              }
            }
          }
        }

        return ordersData?.map(order => {
          const orderItems = orderItemsData.filter(item => item.order_id === order.id);
          
          const items = orderItems.map(item => {
            const toy = toysData.find(t => t.id === item.toy_id);
            return {
              id: item.id,
              name: toy?.name || 'Unknown Item',
              quantity: item.quantity || 1,
              price: item.rental_price || item.unit_price || item.total_price || 0,
              toy_id: item.toy_id,
              image_url: toy?.image_url,
              toy: {
                id: toy?.id,
                name: toy?.name || 'Unknown Item',
                image_url: toy?.image_url,
                category: toy?.category,
                age_range: toy?.age_range
              }
            };
          });
          
          return {
            id: order.id,
            source: 'supabase' as const,
            created_at: order.created_at,
            status: order.status,
            total_amount: order.total_amount || 0,
            items: items
          };
        }) || [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook for WooCommerce subscriptions (optimized)
export const useHybridSubscriptions = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['hybrid-subscriptions', user?.id, (user as any)?.source],
    queryFn: async () => {
      if (!user) {
        throw new Error('No user logged in');
      }

      const hybridUser = user as any as HybridUser;
      console.log('🔄 Fetching subscriptions for user:', hybridUser.id);

      if (hybridUser.source === 'woocommerce' || hybridUser.has_woocommerce_data) {
        try {
          // Find WooCommerce user ID
          let woocommerceUserId = hybridUser.wc_user_id;
          
          if (!woocommerceUserId) {
            const wcUser = await StaticWebAppWooCommerceService.getUserByPhone(hybridUser.phone);
            if (!wcUser) return [];
            woocommerceUserId = wcUser.ID.toString();
          }

          const subscriptions = await StaticWebAppWooCommerceService.getUserSubscriptions(woocommerceUserId);
          console.log('✅ WooCommerce subscriptions fetched:', subscriptions.length);
          
          return subscriptions.map(sub => ({
            id: `wc_sub_${sub.subscription_id}`,
            source: 'woocommerce' as const,
            status: StaticWebAppWooCommerceService.mapSubscriptionStatus(sub.post_status),
            created_at: sub.created_at,
            plan_id: 'woocommerce_legacy',
            billing_period: sub.billing_period,
            total_amount: parseFloat(sub.total_amount || '0'),
            next_payment_date: sub.next_payment_date,
          }));
        } catch (error) {
          console.error('❌ Error fetching WooCommerce subscriptions:', error);
          return [];
        }
      } else {
        try {
          // Supabase subscriptions
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', hybridUser.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching Supabase subscriptions:', error);
            return [];
          }

          return data.map(sub => ({
            ...sub,
            source: 'supabase' as const
          }));
        } catch (error: any) {
          console.error('❌ Error in Supabase subscription query:', error.message);
          return [];
        }
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on failure
  });
}; 
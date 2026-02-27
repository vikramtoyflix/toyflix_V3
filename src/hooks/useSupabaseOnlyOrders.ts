import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseOrder {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  discount_amount: number;
  coupon_code?: string;
  shipping_address?: any;
  delivery_instructions?: string;
  order_type: string;
  rental_start_date?: string;
  rental_end_date?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  toy_id?: string;
  subscription_category?: string;
  age_group?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  toy?: {
    id: string;
    name: string;
    image_url?: string;
    category?: string;
    age_range?: string;
    description?: string;
  };
}

export interface SupabaseSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  current_period_start?: string;
  current_period_end?: string;
  pause_balance?: number;
  auto_renew: boolean;
  subscription_type?: string;
  ride_on_toy_id?: string;
  created_at: string;
  updated_at: string;
}

// Main orders hook - uses only Supabase data
export const useSupabaseOnlyOrders = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['supabase-orders', user?.id],
    queryFn: async (): Promise<SupabaseOrder[]> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('📦 Fetching Supabase-only orders for user:', user.id);

      try {
        // STEP 1: Get orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('❌ Supabase orders query error:', ordersError);
          throw ordersError;
        }

        console.log('✅ Supabase orders fetched:', ordersData?.length || 0);

        if (!ordersData || ordersData.length === 0) {
          return [];
        }

        // STEP 2: Get order items and toys in parallel
        const orderIds = ordersData.map(order => order.id);
        
        const [orderItemsResult, toysResult] = await Promise.all([
          // Get order items
          supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds),
          
          // Get all toys that might be referenced
          supabase
            .from('toys')
            .select('id, name, image_url, category, age_range, description')
        ]);

        const orderItemsData = orderItemsResult.data || [];
        const toysData = toysResult.data || [];

        console.log('✅ Order items fetched:', orderItemsData.length);
        console.log('✅ Toys fetched:', toysData.length);

        // STEP 3: Create a toy lookup map for performance
        const toyMap = new Map();
        toysData.forEach(toy => {
          toyMap.set(toy.id, toy);
        });

        // STEP 4: Combine the data
        const orders: SupabaseOrder[] = ordersData.map(order => {
          const orderItems = orderItemsData.filter(item => item.order_id === order.id);
          
          const items: OrderItem[] = orderItems.map(item => ({
            id: item.id,
            order_id: item.order_id,
            toy_id: item.toy_id,
            subscription_category: item.subscription_category,
            age_group: item.age_group,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            total_price: item.total_price,
            toy: item.toy_id ? toyMap.get(item.toy_id) : undefined
          }));

          return {
            id: order.id,
            user_id: order.user_id,
            status: order.status,
            total_amount: order.total_amount || 0,
            base_amount: order.base_amount || 0,
            gst_amount: order.gst_amount || 0,
            discount_amount: order.discount_amount || 0,
            coupon_code: order.coupon_code,
            shipping_address: order.shipping_address,
            delivery_instructions: order.delivery_instructions,
            order_type: order.order_type,
            rental_start_date: order.rental_start_date,
            rental_end_date: order.rental_end_date,
            created_at: order.created_at,
            updated_at: order.updated_at,
            items: items
          };
        });

        console.log('✅ Supabase orders assembled:', orders.length);
        return orders;
        
      } catch (error) {
        console.error('❌ Error fetching Supabase orders:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Current rentals hook - uses only Supabase data
export const useSupabaseCurrentRentals = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['supabase-current-rentals', user?.id],
    queryFn: async (): Promise<SupabaseOrder[]> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('🏠 Fetching Supabase current rentals for user:', user.id);

      try {
        // Get orders that are shipped or delivered (current rentals)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['shipped', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(10); // Limit to recent rentals

        if (ordersError) {
          console.error('❌ Error fetching current rentals:', ordersError);
          throw ordersError;
        }

        console.log('✅ Current rental orders fetched:', ordersData?.length || 0);

        if (!ordersData || ordersData.length === 0) {
          return [];
        }

        // Get order items and toys
        const orderIds = ordersData.map(order => order.id);
        
        const [orderItemsResult, toysResult] = await Promise.all([
          supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds),
          
          supabase
            .from('toys')
            .select('id, name, image_url, category, age_range, description')
        ]);

        const orderItemsData = orderItemsResult.data || [];
        const toysData = toysResult.data || [];

        // Create toy lookup map
        const toyMap = new Map();
        toysData.forEach(toy => {
          toyMap.set(toy.id, toy);
        });

        // Combine the data
        const rentals: SupabaseOrder[] = ordersData.map(order => {
          const orderItems = orderItemsData.filter(item => item.order_id === order.id);
          
          const items: OrderItem[] = orderItems.map(item => ({
            id: item.id,
            order_id: item.order_id,
            toy_id: item.toy_id,
            subscription_category: item.subscription_category,
            age_group: item.age_group,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            total_price: item.total_price,
            toy: item.toy_id ? toyMap.get(item.toy_id) : undefined
          }));

          return {
            id: order.id,
            user_id: order.user_id,
            status: order.status,
            total_amount: order.total_amount || 0,
            base_amount: order.base_amount || 0,
            gst_amount: order.gst_amount || 0,
            discount_amount: order.discount_amount || 0,
            coupon_code: order.coupon_code,
            shipping_address: order.shipping_address,
            delivery_instructions: order.delivery_instructions,
            order_type: order.order_type,
            rental_start_date: order.rental_start_date,
            rental_end_date: order.rental_end_date,
            created_at: order.created_at,
            updated_at: order.updated_at,
            items: items
          };
        });

        console.log('✅ Current rentals assembled:', rentals.length);
        console.log('🏠 Rental toys:', rentals.flatMap(r => r.items || []).map(item => item.toy?.name).filter(Boolean));
        
        return rentals;

      } catch (error) {
        console.error('❌ Error fetching current rentals:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Subscriptions hook - uses only Supabase data
export const useSupabaseSubscriptions = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['supabase-subscriptions', user?.id],
    queryFn: async (): Promise<SupabaseSubscription[]> => {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('🔄 Fetching Supabase subscriptions for user:', user.id);

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching subscriptions:', error);
          throw error;
        }

        console.log('✅ Subscriptions fetched:', data?.length || 0);
        return data || [];

      } catch (error) {
        console.error('❌ Error in subscription query:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Payment orders hook - for payment history
export const useSupabasePayments = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['supabase-payments', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('💳 Fetching payment orders for user:', user.id);

      try {
        const { data, error } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching payments:', error);
          throw error;
        }

        console.log('✅ Payment orders fetched:', data?.length || 0);
        return data || [];

      } catch (error) {
        console.error('❌ Error in payment query:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}; 
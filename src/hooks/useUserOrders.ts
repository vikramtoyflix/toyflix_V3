import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useEffect } from 'react';

export interface UserOrder {
  id: string;
  user_id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  rental_start_date: string | null;
  rental_end_date: string | null;
  returned_date: string | null;
  shipping_address: any;
  order_items?: OrderItem[];
  source?: 'legacy' | 'rental_orders'; // Track data source
  cycle_number?: number; // For rental orders
}

export interface OrderItem {
  id: string;
  order_id: string;
  toy_id: string;
  quantity: number;
  rental_price: number | null;
  created_at: string;
  toy?: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

export const useUserOrders = () => {
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for order updates (both tables)
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up hybrid real-time subscriptions for user:', user.id);
    
    // Subscribe to old orders table
    const legacyChannel = supabase
      .channel(`user-legacy-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📦 Legacy order update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['user-orders', user.id] });
          queryClient.invalidateQueries({ queryKey: ['current-rentals', user.id] });
        }
      )
      .subscribe();

    // Subscribe to rental_orders table
    const rentalChannel = supabase
      .channel(`user-rental-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🏠 Rental order update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['user-orders', user.id] });
          queryClient.invalidateQueries({ queryKey: ['current-rentals', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up hybrid order subscriptions');
      supabase.removeChannel(legacyChannel);
      supabase.removeChannel(rentalChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user logged in');

      console.log('📦 Fetching HYBRID user orders for:', user.id);
      console.log('📦 User details:', { 
        id: user.id, 
        phone: user.phone, 
        email: user.email,
        first_name: user.first_name 
      });

      // 🚨 CRITICAL FIX: Query by both user ID and phone number to handle ID mismatches
      console.log('🔍 STEP 1: Querying by user ID first...');
      
      // STEP 1: Get orders from BOTH tables using user ID
      const { data: legacyOrdersById, error: legacyErrorById } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: rentalOrdersById, error: rentalErrorById } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('✅ Orders by user ID - Legacy:', legacyOrdersById?.length || 0, 'Rental:', rentalOrdersById?.length || 0);

      // 🚨 CRITICAL FIX: If no orders found by user ID, try phone-based lookup
      let legacyOrdersByPhone = [];
      let rentalOrdersByPhone = [];
      
      if ((!legacyOrdersById || legacyOrdersById.length === 0) && (!rentalOrdersById || rentalOrdersById.length === 0)) {
        console.log('🔍 STEP 2: No orders found by user ID, trying phone-based lookup...');
        console.log('📱 Searching for phone:', user.phone);
        
        // Try to find orders by phone number in shipping_address
        const { data: legacyByPhone, error: legacyPhoneError } = await supabase
          .from('orders')
          .select('*')
          .or(`shipping_address->>phone.eq.${user.phone},shipping_address->>phone.eq.+91${user.phone.replace(/^\+91/, '')}`)
          .order('created_at', { ascending: false });

        const { data: rentalByPhone, error: rentalPhoneError } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .or(`shipping_address->>phone.eq.${user.phone},shipping_address->>phone.eq.+91${user.phone.replace(/^\+91/, '')}`)
          .order('created_at', { ascending: false });

        if (!legacyPhoneError && legacyByPhone) {
          legacyOrdersByPhone = legacyByPhone;
          console.log('✅ Found legacy orders by phone:', legacyOrdersByPhone.length);
        }

        if (!rentalPhoneError && rentalByPhone) {
          rentalOrdersByPhone = rentalByPhone;
          console.log('✅ Found rental orders by phone:', rentalOrdersByPhone.length);
        }

        // 🚨 CRITICAL FIX: Also try to find by user phone in custom_users table cross-reference
        if (legacyOrdersByPhone.length === 0 && rentalOrdersByPhone.length === 0) {
          console.log('🔍 STEP 3: Trying custom_users phone cross-reference...');
          
          // Find all custom_users with the same phone
          const { data: usersWithSamePhone, error: usersError } = await supabase
            .from('custom_users')
            .select('id')
            .eq('phone', user.phone);

          if (!usersError && usersWithSamePhone && usersWithSamePhone.length > 0) {
            const userIds = usersWithSamePhone.map(u => u.id);
            console.log('📱 Found', userIds.length, 'users with same phone, checking their orders...');

            // Try legacy orders with these user IDs
            const { data: legacyByUserIds, error: legacyUserIdsError } = await supabase
              .from('orders')
              .select('*')
              .in('user_id', userIds)
              .order('created_at', { ascending: false });

            // Try rental orders with these user IDs
            const { data: rentalByUserIds, error: rentalUserIdsError } = await (supabase as any)
              .from('rental_orders')
              .select('*')
              .in('user_id', userIds)
              .order('created_at', { ascending: false });

            if (!legacyUserIdsError && legacyByUserIds) {
              legacyOrdersByPhone = legacyByUserIds;
              console.log('✅ Found legacy orders by user phone cross-ref:', legacyOrdersByPhone.length);
            }

            if (!rentalUserIdsError && rentalByUserIds) {
              rentalOrdersByPhone = rentalByUserIds;
              console.log('✅ Found rental orders by user phone cross-ref:', rentalOrdersByPhone.length);
            }
          }
        }
      }

      // Combine results: prioritize user ID matches, fallback to phone matches
      const finalLegacyOrders = (legacyOrdersById && legacyOrdersById.length > 0) ? legacyOrdersById : legacyOrdersByPhone;
      const finalRentalOrders = (rentalOrdersById && rentalOrdersById.length > 0) ? rentalOrdersById : rentalOrdersByPhone;

      console.log('📊 Final order counts - Legacy:', finalLegacyOrders.length, 'Rental:', finalRentalOrders.length);

      // STEP 2: Process legacy orders (existing logic)
      let legacyOrders: UserOrder[] = [];
      
      if (finalLegacyOrders && finalLegacyOrders.length > 0) {
        const orderIds = finalLegacyOrders.map(order => order.id);
        
        // Get order items for legacy orders
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) {
          console.error('⚠️ Error fetching legacy order items:', itemsError);
        }

        // Get toys for the items
        const toyIds = [...new Set(itemsData?.map(item => item.toy_id) || [])];
        let toysData: any[] = [];

        if (toyIds.length > 0) {
          const { data: toysResult, error: toysError } = await supabase
            .from('toys')
            .select('id, name, image_url')
            .in('id', toyIds);

          if (toysError) {
            console.error('⚠️ Error fetching toys:', toysError);
          } else {
            toysData = toysResult || [];
          }
        }

        // Combine legacy orders with items
        legacyOrders = finalLegacyOrders.map(order => {
          const orderItems = itemsData?.filter(item => item.order_id === order.id) || [];
          
          const itemsWithToys = orderItems.map(item => ({
            ...item,
            toy: toysData.find(toy => toy.id === item.toy_id) || null
          }));

          return {
            ...order,
            order_items: itemsWithToys,
            source: 'legacy' as const
          };
        });
      }

      // STEP 3: Process rental orders (convert toys_data JSONB to order_items format)
      let rentalOrders: UserOrder[] = [];
      
      if (finalRentalOrders && finalRentalOrders.length > 0) {
        rentalOrders = finalRentalOrders.map((order: any) => {
          // Convert toys_data JSONB to order_items format
          const orderItems = Array.isArray(order.toys_data) 
            ? order.toys_data.map((toy: any, index: number) => ({
                id: `${order.id}-item-${index}`,
                order_id: order.id,
                toy_id: toy.toy_id || toy.id,
                quantity: toy.quantity || 1,
                rental_price: toy.unit_price || toy.rental_price || 0,
                created_at: order.created_at,
                toy: {
                  id: toy.toy_id || toy.id,
                  name: toy.name || 'Unknown Toy',
                  image_url: toy.image_url || null
                }
              }))
            : [];

          return {
            id: order.id,
            user_id: order.user_id,
            status: order.status,
            total_amount: order.total_amount,
            created_at: order.created_at,
            updated_at: order.updated_at || order.created_at,
            rental_start_date: order.rental_start_date,
            rental_end_date: order.rental_end_date,
            returned_date: order.returned_date,
            shipping_address: order.shipping_address,
            order_items: orderItems,
            source: 'rental_orders' as const,
            cycle_number: order.cycle_number
          };
        });
      }

      // STEP 4: Combine and deduplicate orders
      const allOrders = [...legacyOrders, ...rentalOrders];
      
      // Remove duplicates based on legacy_order_id mapping
      const uniqueOrders = allOrders.filter((order, index, self) => {
        // If it's a rental order with legacy_order_id, check for duplicates
        if (order.source === 'rental_orders') {
          const rentalOrder = finalRentalOrders?.find((r: any) => r.id === order.id);
          if (rentalOrder?.legacy_order_id) {
            // Check if we already have the legacy version
            const hasDuplicateLegacy = self.some(o => 
              o.source === 'legacy' && o.id === rentalOrder.legacy_order_id
            );
            if (hasDuplicateLegacy) {
              return false; // Skip this rental order, we already have the legacy version
            }
          }
        }
        return true;
      });

      // Sort by created_at descending
      uniqueOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('📦 HYBRID orders summary:', {
        legacy: legacyOrders.length,
        rental: rentalOrders.length,
        total: allOrders.length,
        unique: uniqueOrders.length,
        foundByUserId: (legacyOrdersById?.length || 0) + (rentalOrdersById?.length || 0),
        foundByPhone: legacyOrdersByPhone.length + rentalOrdersByPhone.length
      });

      console.log('📦 Final orders details:', uniqueOrders.map(order => ({
        id: order.id.slice(0, 8),
        status: order.status,
        total_amount: order.total_amount,
        items: order.order_items?.length || 0,
        source: order.source,
        cycle: order.cycle_number
      })));

      if (uniqueOrders.length === 0) {
        console.log('⚠️ NO ORDERS FOUND - This indicates a session/ID mismatch issue!');
        console.log('🔧 User ID:', user.id);
        console.log('📱 User Phone:', user.phone);
        console.log('💡 Consider checking user authentication flow');
      }

      return uniqueOrders as UserOrder[];
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

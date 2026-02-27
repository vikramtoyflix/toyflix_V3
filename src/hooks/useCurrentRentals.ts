import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useEffect } from 'react';

export interface CurrentRental {
  id: string;
  user_id: string;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  returned_date: string | null;
  created_at: string;
  order_items?: RentalItem[];
  toy?: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
    age_range: string;
  };
  source?: 'legacy' | 'rental_orders'; // Track data source
  cycle_number?: number; // For rental orders
}

export interface RentalItem {
  id: string;
  toy_id: string;
  quantity: number;
  rental_price: number | null;
  toy?: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
    age_range: string;
  };
}

export const useCurrentRentals = () => {
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for rental status updates (both tables)
  useEffect(() => {
    if (!user) return;

    console.log('🏠 Setting up hybrid real-time rentals subscriptions for user:', user.id);
    
    // Subscribe to legacy orders table
    const legacyChannel = supabase
      .channel(`user-legacy-rentals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🏠 Legacy rental update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['current-rentals', user.id] });
        }
      )
      .subscribe();

    // Subscribe to rental_orders table
    const rentalChannel = supabase
      .channel(`user-rental-updates-${user.id}`)
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
          queryClient.invalidateQueries({ queryKey: ['current-rentals', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('🏠 Cleaning up hybrid rentals subscriptions');
      supabase.removeChannel(legacyChannel);
      supabase.removeChannel(rentalChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['current-rentals', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user logged in');

      console.log('🏠 Fetching HYBRID current rentals for:', user.id);
      console.log('🏠 Looking for orders with status: shipped, delivered');

      // 🚨 CRITICAL FIX: Query by both user ID and phone number to handle ID mismatches
      console.log('🔍 STEP 1: Querying by user ID first...');

      // STEP 1: Get current rentals from legacy orders table
      let legacyRentals: CurrentRental[] = [];
      
      try {
        const { data: legacyData, error: legacyError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              toy:toys (
                id,
                name,
                image_url,
                category,
                age_range
              )
            )
          `)
          .eq('user_id', user.id)
          .in('status', ['shipped', 'delivered'])
          .is('returned_date', null)
          .order('created_at', { ascending: false });
        
        if (legacyError) {
          console.error('⚠️ Error fetching legacy rentals (continuing):', legacyError);
        } else if (legacyData) {
          // Flatten legacy data to show individual rental items
          legacyData.forEach(order => {
            order.order_items?.forEach(item => {
              legacyRentals.push({
                id: order.id,
                user_id: order.user_id,
                status: order.status,
                rental_start_date: order.rental_start_date || order.created_at,
                rental_end_date: order.rental_end_date || order.created_at,
                returned_date: order.returned_date,
                created_at: order.created_at,
                toy: item.toy,
                source: 'legacy'
              });
            });
          });
        }
      } catch (err) {
        console.error('⚠️ Legacy rentals query failed (continuing):', err);
      }

      // STEP 2: Get current rentals from rental_orders table
      let rentalOrderRentals: CurrentRental[] = [];
      
      try {
        const { data: rentalData, error: rentalError } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['shipped', 'delivered', 'confirmed', 'pending'])
          .is('returned_date', null)
          .order('created_at', { ascending: false });
        
        if (rentalError) {
          console.error('⚠️ Error fetching rental orders (continuing):', rentalError);
        } else if (rentalData) {
          // Convert rental orders to current rentals format
          rentalData.forEach((order: any) => {
            if (Array.isArray(order.toys_data)) {
              order.toys_data.forEach((toy: any) => {
                if (!toy.returned) { // Only show non-returned toys
                  rentalOrderRentals.push({
                    id: order.id,
                    user_id: order.user_id,
                    status: order.status,
                    rental_start_date: order.rental_start_date || order.created_at,
                    rental_end_date: order.rental_end_date || order.created_at,
                    returned_date: order.returned_date,
                    created_at: order.created_at,
                    toy: {
                      id: toy.toy_id || toy.id,
                      name: toy.name || 'Unknown Toy',
                      image_url: toy.image_url || null,
                      category: toy.category || 'Unknown',
                      age_range: order.age_group || 'Unknown'
                    },
                    source: 'rental_orders',
                    cycle_number: order.cycle_number
                  });
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('⚠️ Rental orders query failed (continuing):', err);
      }

      console.log('✅ Current rentals by user ID - Legacy:', legacyRentals.length, 'Rental:', rentalOrderRentals.length);

      // 🚨 CRITICAL FIX: If no rentals found by user ID, try phone-based lookup
      if (legacyRentals.length === 0 && rentalOrderRentals.length === 0) {
        console.log('🔍 STEP 3: No rentals found by user ID, trying phone-based lookup...');
        console.log('📱 Searching for phone:', user.phone);
        
        // Try to find rentals by phone number in shipping_address
        try {
          const { data: legacyByPhone, error: legacyPhoneError } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                *,
                toy:toys (
                  id,
                  name,
                  image_url,
                  category,
                  age_range
                )
              )
            `)
            .or(`shipping_address->>phone.eq.${user.phone},shipping_address->>phone.eq.+91${user.phone.replace(/^\+91/, '')}`)
            .in('status', ['shipped', 'delivered'])
            .is('returned_date', null)
            .order('created_at', { ascending: false });

          if (!legacyPhoneError && legacyByPhone) {
            legacyByPhone.forEach(order => {
              order.order_items?.forEach(item => {
                legacyRentals.push({
                  id: order.id,
                  user_id: order.user_id,
                  status: order.status,
                  rental_start_date: order.rental_start_date || order.created_at,
                  rental_end_date: order.rental_end_date || order.created_at,
                  returned_date: order.returned_date,
                  created_at: order.created_at,
                  toy: item.toy,
                  source: 'legacy'
                });
              });
            });
            console.log('✅ Found legacy rentals by phone:', legacyRentals.length);
          }

          const { data: rentalByPhone, error: rentalPhoneError } = await (supabase as any)
            .from('rental_orders')
            .select('*')
            .or(`shipping_address->>phone.eq.${user.phone},shipping_address->>phone.eq.+91${user.phone.replace(/^\+91/, '')}`)
            .in('status', ['shipped', 'delivered', 'confirmed', 'pending'])
            .is('returned_date', null)
            .order('created_at', { ascending: false });

          if (!rentalPhoneError && rentalByPhone) {
            rentalByPhone.forEach((order: any) => {
              if (Array.isArray(order.toys_data)) {
                order.toys_data.forEach((toy: any) => {
                  if (!toy.returned) {
                    rentalOrderRentals.push({
                      id: order.id,
                      user_id: order.user_id,
                      status: order.status,
                      rental_start_date: order.rental_start_date || order.created_at,
                      rental_end_date: order.rental_end_date || order.created_at,
                      returned_date: order.returned_date,
                      created_at: order.created_at,
                      toy: {
                        id: toy.toy_id || toy.id,
                        name: toy.name || 'Unknown Toy',
                        image_url: toy.image_url || null,
                        category: toy.category || 'Unknown',
                        age_range: order.age_group || 'Unknown'
                      },
                      source: 'rental_orders',
                      cycle_number: order.cycle_number
                    });
                  }
                });
              }
            });
            console.log('✅ Found rental orders by phone:', rentalOrderRentals.length);
          }

          // 🚨 CRITICAL FIX: Also try custom_users phone cross-reference for rentals
          if (legacyRentals.length === 0 && rentalOrderRentals.length === 0) {
            console.log('🔍 STEP 4: Trying custom_users phone cross-reference for rentals...');
            
            const { data: usersWithSamePhone, error: usersError } = await supabase
              .from('custom_users')
              .select('id')
              .eq('phone', user.phone);

            if (!usersError && usersWithSamePhone && usersWithSamePhone.length > 0) {
              const userIds = usersWithSamePhone.map(u => u.id);
              console.log('📱 Found', userIds.length, 'users with same phone, checking their rentals...');

              // Try legacy rentals with these user IDs
              const { data: legacyByUserIds, error: legacyUserIdsError } = await supabase
                .from('orders')
                .select(`
                  *,
                  order_items (
                    *,
                    toy:toys (
                      id,
                      name,
                      image_url,
                      category,
                      age_range
                    )
                  )
                `)
                .in('user_id', userIds)
                .in('status', ['shipped', 'delivered'])
                .is('returned_date', null)
                .order('created_at', { ascending: false });

              if (!legacyUserIdsError && legacyByUserIds) {
                legacyByUserIds.forEach(order => {
                  order.order_items?.forEach(item => {
                    legacyRentals.push({
                      id: order.id,
                      user_id: order.user_id,
                      status: order.status,
                      rental_start_date: order.rental_start_date || order.created_at,
                      rental_end_date: order.rental_end_date || order.created_at,
                      returned_date: order.returned_date,
                      created_at: order.created_at,
                      toy: item.toy,
                      source: 'legacy'
                    });
                  });
                });
                console.log('✅ Found legacy rentals by user phone cross-ref:', legacyRentals.length);
              }

              // Try rental orders with these user IDs
              const { data: rentalByUserIds, error: rentalUserIdsError } = await (supabase as any)
                .from('rental_orders')
                .select('*')
                .in('user_id', userIds)
                .in('status', ['shipped', 'delivered', 'confirmed', 'pending'])
                .is('returned_date', null)
                .order('created_at', { ascending: false });

              if (!rentalUserIdsError && rentalByUserIds) {
                rentalByUserIds.forEach((order: any) => {
                  if (Array.isArray(order.toys_data)) {
                    order.toys_data.forEach((toy: any) => {
                      if (!toy.returned) {
                        rentalOrderRentals.push({
                          id: order.id,
                          user_id: order.user_id,
                          status: order.status,
                          rental_start_date: order.rental_start_date || order.created_at,
                          rental_end_date: order.rental_end_date || order.created_at,
                          returned_date: order.returned_date,
                          created_at: order.created_at,
                          toy: {
                            id: toy.toy_id || toy.id,
                            name: toy.name || 'Unknown Toy',
                            image_url: toy.image_url || null,
                            category: toy.category || 'Unknown',
                            age_range: order.age_group || 'Unknown'
                          },
                          source: 'rental_orders',
                          cycle_number: order.cycle_number
                        });
                      }
                    });
                  }
                });
                console.log('✅ Found rental orders by user phone cross-ref:', rentalOrderRentals.length);
              }
            }
          }
        } catch (phoneSearchError) {
          console.error('⚠️ Phone-based rental search failed:', phoneSearchError);
        }
      }

      // STEP 3: Combine and deduplicate rentals
      const allRentals = [...legacyRentals, ...rentalOrderRentals];
      
      // Remove duplicates based on legacy_order_id mapping
      const uniqueRentals = allRentals.filter((rental, index, self) => {
        // If it's a rental order, check if we already have the legacy version
        if (rental.source === 'rental_orders') {
          const hasDuplicateLegacy = self.some(r => 
            r.source === 'legacy' && r.id === rental.id
          );
          if (hasDuplicateLegacy) {
            return false; // Skip this rental order, we already have the legacy version
          }
        }
        return true;
      });

      // Sort by rental start date (most recent first)
      uniqueRentals.sort((a, b) => new Date(b.rental_start_date).getTime() - new Date(a.rental_start_date).getTime());

      console.log('🏠 HYBRID rentals summary:', {
        legacy: legacyRentals.length,
        rental_orders: rentalOrderRentals.length,
        total: allRentals.length,
        unique: uniqueRentals.length
      });

      console.log('🏠 Current rental toys:', uniqueRentals.map(r => ({
        toy: r.toy?.name,
        status: r.status,
        start_date: r.rental_start_date,
        source: r.source,
        cycle: r.cycle_number
      })));

      if (uniqueRentals.length === 0) {
        console.log('⚠️ NO CURRENT RENTALS FOUND - This may indicate a session/ID mismatch issue!');
        console.log('🔧 User ID:', user.id);
        console.log('📱 User Phone:', user.phone);
      }

      return uniqueRentals;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

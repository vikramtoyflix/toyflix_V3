import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export interface Toy {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subscription_category?: string | null;
  age_range: string;
  brand: string | null;
  pack: string | null;
  retail_price: number | null;
  rental_price: number | null;
  image_url: string | null;
  available_quantity: number;
  total_quantity: number;
  rating: number;
  min_age: number | null;
  max_age: number | null;
  show_strikethrough_pricing: boolean;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

type ToyCategory = Database['public']['Enums']['toy_category'];

// Helper function to identify migrated toys
const isMigratedToy = (toy: any): boolean => {
  // Migrated toys typically have:
  // 1. ₹100 dummy pricing
  // 2. Plan-related names
  // 3. Specific patterns from old website
  
  const hasPlansInName = toy.name?.toLowerCase().includes('plan') || 
                        toy.name?.toLowerCase().includes('month');
  const hasDummyPricing = toy.retail_price === 100;
  
  return hasPlansInName || hasDummyPricing;
};

export const useToys = (includeInactive = false) => {
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchRef = useRef<number>(0);
  
  const queryResult = useQuery({
    queryKey: ['toys', includeInactive],
    queryFn: async (): Promise<Toy[]> => {
      console.log('🧸 Fetching toys (filtering out migrated toys)...');
      
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching toys:', error);
        throw error;
      }

      // Filter out migrated toys to keep only current inventory
      const currentToys = (data || []).filter(toy => {
        const isMigrated = isMigratedToy(toy);
        
        // Log for debugging (only first few)
        if (data.indexOf(toy) < 3) {
          console.log(`🔍 ${toy.name}: ${isMigrated ? 'MIGRATED' : 'CURRENT'} (₹${toy.retail_price})`);
        }
        
        return !isMigrated;
      });

      if (!includeInactive) {
        const activeToys = currentToys.filter(toy => 
          toy.available_quantity && toy.available_quantity > 0
        );
        console.log(`✅ Returning ${activeToys.length} active current toys (filtered out ${data.length - currentToys.length} migrated toys)`);
        return activeToys;
      }

      console.log(`✅ Returning ${currentToys.length} current toys (filtered out ${data.length - currentToys.length} migrated toys)`);
      return currentToys;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Smarter debounced refetch with minimum interval
  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefetch = now - lastRefetchRef.current;
    const minimumInterval = 5000; // 5 seconds minimum between refetches

    if (timeSinceLastRefetch < minimumInterval) {
      console.log('Skipping refetch - too soon since last refetch');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      console.log('Smart debounced refetch executing...');
      lastRefetchRef.current = Date.now();
      queryResult.refetch();
    }, 3000); // Increased debounce to 3 seconds
  }, [queryResult.refetch]);

  // Optimized real-time subscription with smart debouncing
  useEffect(() => {
    console.log('Setting up optimized real-time subscription for toys...');
    
    const setupSubscription = () => {
      // Prevent multiple subscriptions
      if (isSubscribedRef.current || channelRef.current) {
        console.log('Subscription already exists, skipping setup');
        return;
      }

      try {
        const channel = supabase
          .channel(`toys-changes-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'toys'
            },
            (payload) => {
              console.log('Real-time toys change detected:', payload.eventType);
              
              // Only refetch for significant changes
              if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                console.log('Significant change detected, triggering refetch');
                debouncedRefetch();
              } else if (payload.eventType === 'UPDATE') {
                // For updates, only refetch if important fields changed
                const { new: newRecord, old: oldRecord } = payload;
                const importantFields = ['name', 'available_quantity', 'is_featured', 'display_order'];
                const hasImportantChange = importantFields.some(field => 
                  newRecord?.[field] !== oldRecord?.[field]
                );
                
                if (hasImportantChange) {
                  console.log('Important field updated, triggering refetch');
                  debouncedRefetch();
                } else {
                  console.log('Minor update, skipping refetch');
                }
              }
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.error('Subscription error:', err);
              isSubscribedRef.current = false;
              channelRef.current = null;
              return;
            }

            switch (status) {
              case 'SUBSCRIBED':
                console.log('Successfully subscribed to toys changes');
                isSubscribedRef.current = true;
                break;
              case 'TIMED_OUT':
              case 'CLOSED':
              case 'CHANNEL_ERROR':
                console.error(`Subscription ${status}, cleaning up...`);
                isSubscribedRef.current = false;
                channelRef.current = null;
                break;
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        isSubscribedRef.current = false;
        channelRef.current = null;
      }
    };

    // Delay subscription setup to prevent immediate syncing on page load
    const subscriptionTimer = setTimeout(setupSubscription, 2000);

    return () => {
      console.log('Cleaning up real-time subscription...');
      clearTimeout(subscriptionTimer);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          console.log('Channel removed successfully');
        } catch (error) {
          console.error('Error removing subscription:', error);
        }
        channelRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [debouncedRefetch]);

  return {
    ...queryResult,
    forceRefresh: () => {
      console.log('Force refreshing toys data...');
      lastRefetchRef.current = Date.now();
      return queryResult.refetch();
    }
  };
};

export const useToysByCategory = (category?: string) => {
  return useQuery({
    queryKey: ['toys', 'category', category],
    queryFn: async () => {
      console.log('Fetching toys by category:', category);
      let query = supabase.from('toys').select('*');
      
      if (category && category !== 'all') {
        query = query.eq('category', category as ToyCategory);
      }
      
      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('name');

      if (error) {
        console.error('Error fetching toys by category:', error);
        throw error;
      }
      
      console.log('Toys by category fetched:', data?.length, 'toys');
      return data as Toy[];
    },
    enabled: !!category,
    // Improved caching for category queries
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (failureCount < 2) {
        console.log(`Category query retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
  });
};

// Hook for admin to get migrated toys (for plan tracking)
export const useMigratedToys = () => {
  return useQuery({
    queryKey: ['migrated-toys'],
    queryFn: async (): Promise<Toy[]> => {
      console.log('📦 Fetching migrated toys for admin use...');
      
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .or('retail_price.eq.100,name.ilike.%Plan%,name.ilike.%Month%')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching migrated toys:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} migrated toys`);
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook to get all toys (current + migrated) for admin purposes
export const useAllToys = () => {
  return useQuery({
    queryKey: ['all-toys'],
    queryFn: async (): Promise<{ current: Toy[], migrated: Toy[] }> => {
      console.log('🔍 Fetching all toys with separation...');
      
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching all toys:', error);
        throw error;
      }

      const current: Toy[] = [];
      const migrated: Toy[] = [];

      (data || []).forEach(toy => {
        if (isMigratedToy(toy)) {
          migrated.push(toy);
        } else {
          current.push(toy);
        }
      });

      console.log(`✅ Split toys: ${current.length} current, ${migrated.length} migrated`);
      return { current, migrated };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

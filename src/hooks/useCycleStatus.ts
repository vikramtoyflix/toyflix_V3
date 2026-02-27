import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorHandling';

export interface CycleStatus {
  has_active_subscription: boolean;
  cycle_status: 'selection' | 'delivery_pending' | 'toys_in_possession' | 'return_pending' | 'cycle_complete';
  toys_in_possession: boolean;
  selection_window_active: boolean;
  days_in_current_cycle: number;
  plan_id: string | null;
}

// Fallback cycle status for when RPC function doesn't exist
const getDefaultCycleStatus = (): CycleStatus => ({
  has_active_subscription: false,
  cycle_status: 'selection',
  toys_in_possession: false,
  selection_window_active: true, // Default to true for better UX
  days_in_current_cycle: 0,
  plan_id: null
});

export const useCycleStatus = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['cycleStatus', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // For users with +91 phone numbers (WooCommerce users), check rental_orders table directly
      if (user.phone?.startsWith('+91')) {
        console.log('⏭️ Using rental_orders based cycle status for WooCommerce user');
        
        try {
          // Check the latest rental order for this user to get selection window status
          const { data: rentalOrders, error: rentalError } = await supabase
            .from('rental_orders')
            .select('selection_window_status, manual_selection_control, subscription_plan')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (rentalError) {
            console.warn('⚠️ Error fetching rental orders for WooCommerce user:', rentalError);
            return getDefaultCycleStatus();
          }

          const latestOrder = rentalOrders?.[0];
          if (latestOrder) {
            // Determine if selection window is active based on rental order status
            const isSelectionActive = latestOrder.selection_window_status === 'manual_open' || 
                                    latestOrder.selection_window_status === 'force_open' ||
                                    (latestOrder.selection_window_status === 'auto' && latestOrder.manual_selection_control);

            return {
              has_active_subscription: true,
              cycle_status: 'selection',
              toys_in_possession: false,
              selection_window_active: isSelectionActive,
              days_in_current_cycle: 21, // Default for display
              plan_id: latestOrder.subscription_plan || 'silver-pack'
            };
          }
        } catch (error) {
          console.warn('⚠️ Error in WooCommerce cycle status logic:', error);
        }
        
        return getDefaultCycleStatus();
      }
      
      try {
        const { data, error } = await supabase.rpc('get_user_cycle_status', {
          user_id_param: user.id
        });

        if (error) {
          // Use centralized error handling
          logError('Cycle status RPC function issue', error);
          return getDefaultCycleStatus();
        }
        
        return data?.[0] as CycleStatus || getDefaultCycleStatus();
      } catch (error: any) {
        // Use centralized error handling for any other errors
        logError('Cycle status query failed', error);
        return getDefaultCycleStatus();
      }
    },
    enabled: !!user?.id, // Now enabled for all users including +91
    // Optimize caching for cycle status data
    staleTime: 30 * 1000, // 30 seconds - cycle status can change more frequently
    gcTime: 2 * 60 * 1000, // 2 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch on reconnect as cycle status might change
    retry: false, // Don't retry on failure, use fallback instead
  });
};

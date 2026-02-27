
import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { supabase } from '@/integrations/supabase/client';
import { Toy } from '@/hooks/useToys';

export interface CurrentCycleToy extends Toy {
  rental_start_date?: string;
  rental_end_date?: string;
  return_due_date?: string;
}

export const useCurrentCycleToys = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['currentCycleToys', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get current cycle toys from user_entitlements
      const { data: entitlements, error: entitlementsError } = await supabase
        .from('user_entitlements')
        .select('current_cycle_toys, subscription_id')
        .eq('user_id', user.id)
        .single();

      if (entitlementsError || !entitlements?.current_cycle_toys) {
        return [];
      }

      // Safely convert Json array to string array
      const toyIds = Array.isArray(entitlements.current_cycle_toys) 
        ? entitlements.current_cycle_toys.filter((id): id is string => typeof id === 'string')
        : [];

      if (toyIds.length === 0) return [];

      // Get toy details
      const { data: toys, error: toysError } = await supabase
        .from('toys')
        .select('*')
        .in('id', toyIds);

      if (toysError) throw toysError;

      // Get subscription info for rental dates
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('toys_delivered_date, toys_return_due_date')
        .eq('id', entitlements.subscription_id)
        .single();

      if (subError) throw subError;

      // Combine toy data with rental dates
      return (toys || []).map(toy => ({
        ...toy,
        rental_start_date: subscription?.toys_delivered_date,
        rental_end_date: subscription?.toys_return_due_date,
        return_due_date: subscription?.toys_return_due_date
      })) as CurrentCycleToy[];
    },
    enabled: !!user?.id,
  });
};

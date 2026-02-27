import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { toast } from '@/hooks/use-toast';

export const useSubscriptionUpdate = () => {
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, active }: { plan?: string; active?: boolean }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const updates: any = {};
      if (plan !== undefined) updates.subscription_plan = plan;
      if (active !== undefined) updates.subscription_active = active;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('custom_users')
        .update(updates)
        .eq('id', user.id)
        .select('subscription_plan, subscription_active, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate subscription queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['fixed-subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      
      toast({
        title: "Subscription Updated",
        description: `Plan: ${data.subscription_plan}, Active: ${data.subscription_active}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}; 
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionUpgrade } from '@/services/subscription/subscriptionUpgrade';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { toast } from '@/hooks/use-toast';

export const useSubscriptionUpgrade = () => {
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ newPlanId }: { newPlanId: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const result = await SubscriptionUpgrade.upgradePlan(user.id, newPlanId);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to upgrade plan');
      }
      
      return result;
    },
    onSuccess: (result) => {
      // Track subscription upgrade
      try {
        if (typeof window !== 'undefined' && window.cbq && user?.id) {
          window.cbq('track', 'UpgradeSubscription', {
            user_id: user.id,
            subscription_id: result.data?.id,
            old_plan_id: result.data?.old_plan_id,
            new_plan_id: result.data?.plan_id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      // Invalidate subscription queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-data'] });
      
      toast({
        title: "Plan Upgraded Successfully! 🎉",
        description: "Your subscription plan has been updated and cycle numbers are preserved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}; 
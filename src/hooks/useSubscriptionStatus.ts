import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { SubscriptionCore } from '@/services/subscription/subscriptionCore';

export type SubscriptionStatus = 'none' | 'active' | 'paused' | 'expired' | 'cancelled';

export const useSubscriptionStatus = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'none';

      // Check for active subscription first
      const activeSubscription = await SubscriptionCore.getActiveSubscription(user.id);
      if (activeSubscription) {
        return activeSubscription.status as SubscriptionStatus;
      }

      // Check for expired/cancelled subscription
      const anySubscription = await SubscriptionCore.getSubscriptionForUpgrade(user.id);
      if (anySubscription) {
        return anySubscription.status as SubscriptionStatus;
      }

      return 'none';
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const getStatusDisplayText = (status: SubscriptionStatus, planId: string, isCurrentPlan: boolean): string => {
  if (!isCurrentPlan) {
    switch (status) {
      case 'expired': return 'Reactivate Subscription';
      case 'cancelled': return 'Restart Subscription';
      case 'active':
      case 'paused': return 'Switch to This Plan';
      default: return 'Get Started';
    }
  }

  // Current plan actions
  switch (status) {
    case 'active':
      return planId === 'discovery-delight' ? 'Renew for Next Month' : 'Manage Your Toys';
    case 'paused': return 'Resume Subscription';
    case 'expired': return 'Reactivate Plan';
    case 'cancelled': return 'Restart Plan';
    default: return 'Get Started';
  }
};

export const getStatusActionType = (status: SubscriptionStatus, planId: string, isCurrentPlan: boolean): 'renewal' | 'upgrade' | 'reactivation' | 'new' => {
  if (!isCurrentPlan) {
    switch (status) {
      case 'expired':
      case 'cancelled': return 'reactivation';
      case 'active':
      case 'paused': return 'upgrade';
      default: return 'new';
    }
  }

  // Current plan actions
  switch (status) {
    case 'active':
      return planId === 'discovery-delight' ? 'renewal' : 'upgrade';
    case 'paused':
    case 'expired':
    case 'cancelled': return 'reactivation';
    default: return 'new';
  }
};

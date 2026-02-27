import { useMemo } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';

export interface PricingContext {
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  currentPlanId: string | null;
  canManageQueue: boolean;
  isLoading: boolean;
}

export const usePricingContext = (): PricingContext => {
  const { user } = useCustomAuth();
  const { data: subscriptionData, isLoading: subscriptionLoading } = useUserSubscription();
  const { data: cycleStatus, isLoading: cycleLoading } = useCycleStatus();

  // Memoize the computed values to prevent unnecessary re-renders
  const pricingContext = useMemo(() => {
    // Only consider active and paused subscriptions for hasActiveSubscription
    // This preserves the existing logic for active users while allowing
    // the enhanced upgrade flow to handle expired/cancelled subscriptions
    const hasActiveSubscription = !!subscriptionData?.subscription;
    const currentPlanId = subscriptionData?.subscription?.plan_id || null;
    const canManageQueue = cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession;
    const isLoading = subscriptionLoading || cycleLoading;

    return {
      isAuthenticated: !!user,
      hasActiveSubscription,
      currentPlanId,
      canManageQueue,
      isLoading,
    };
  }, [
    user,
    subscriptionData?.subscription,
    cycleStatus?.selection_window_active,
    cycleStatus?.toys_in_possession,
    subscriptionLoading,
    cycleLoading,
  ]);

  return pricingContext;
};

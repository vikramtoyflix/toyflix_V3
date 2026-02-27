
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';

export type UserFlowType = 'new_user' | 'existing_user_manage_queue' | 'existing_user_no_access';

export const useUserFlow = () => {
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  const { data: cycleStatus } = useCycleStatus();

  const getUserFlowType = (): UserFlowType => {
    if (!user) return 'new_user';
    
    // Check if user has an active subscription
    if (!subscriptionData?.subscription) {
      return 'new_user';
    }

    // User has subscription - check if they can manage queue
    // Allow queue management if selection window is active OR if user doesn't have toys in possession
    if (cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession) {
      return 'existing_user_manage_queue';
    }

    return 'existing_user_no_access';
  };

  return {
    flowType: getUserFlowType(),
    hasSubscription: !!subscriptionData?.subscription,
    canManageQueue: cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession,
    cycleStatus
  };
};

import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { SubscriptionService } from '@/services/subscriptionService';
import { logError } from '@/utils/errorHandling';

// Fallback subscription data when queries fail
const getDefaultSubscriptionData = () => ({
  subscription: null,
  entitlements: null,
  plan: null
});

export const useUserSubscription = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['userSubscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const result = await SubscriptionService.queryUserEntitlements(user.id);
        if (result.success) {
          return result.data;
        }
        
        // Silently use fallback for expected failures
        return getDefaultSubscriptionData();
      } catch (error: any) {
        // Use centralized error handling
        logError('Subscription query failed', error);
        return getDefaultSubscriptionData();
      }
    },
    enabled: !!user?.id,
    // Optimize caching for user subscription data
    staleTime: 1 * 60 * 1000, // 1 minute - subscription data can change
    gcTime: 3 * 60 * 1000, // 3 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch on reconnect as subscription status might change
    retry: false, // Don't retry on failure, use fallback instead
  });
};

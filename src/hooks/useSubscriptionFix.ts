import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';

// Fixed subscription hook that properly checks subscription_active field
export const useFixedSubscriptionStatus = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['fixed-subscription-status', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          hasActiveSubscription: false,
          subscriptionPlan: null,
          source: null
        };
      }

      console.log('🔍 Checking subscription status for user:', user.id);

      // 1. First check subscriptions table
      try {
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('status, plan_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);

        if (!subscriptionError && subscriptionData && subscriptionData.length > 0) {
          console.log('✅ Found active subscription in subscriptions table');
          return {
            hasActiveSubscription: true,
            subscriptionPlan: subscriptionData[0].plan_id,
            source: 'subscriptions_table'
          };
        }
      } catch (error) {
        console.log('Subscriptions table not accessible or empty');
      }

      // 2. FALLBACK: Check user's subscription_active field
      try {
        const { data: userData, error: userError } = await supabase
          .from('custom_users')
          .select('subscription_active, subscription_plan')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          console.log('✅ User subscription status:', {
            subscription_active: userData.subscription_active,
            subscription_plan: userData.subscription_plan
          });

          if (userData.subscription_active === true) {
            console.log('✅ Using subscription_active=true as fallback');
            return {
              hasActiveSubscription: true,
              subscriptionPlan: userData.subscription_plan || 'basic',
              source: 'user_profile'
            };
          }
        }
      } catch (error) {
        console.error('Error checking user subscription status:', error);
      }

      // 3. No subscription found
      console.log('❌ No active subscription found');
      return {
        hasActiveSubscription: false,
        subscriptionPlan: null,
        source: null
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds for faster updates
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}; 
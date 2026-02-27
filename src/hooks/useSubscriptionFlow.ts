import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useNavigate } from 'react-router-dom';
import { Toy } from '@/hooks/useToys';

export type SubscriptionFlowAction = 
  | 'redirect_to_auth'
  | 'redirect_to_subscription' 
  | 'show_queue_management'
  | 'show_access_restricted';

export const useSubscriptionFlow = () => {
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  const { data: subscriptionData } = useUserSubscription();
  const { data: cycleStatus } = useCycleStatus();

  const handleToyAction = (toy: Toy) => {
    console.log('Handling toy action for:', toy.name, { user: !!user });

    // For authenticated users with existing subscriptions, handle queue management
    if (user && subscriptionData?.subscription) {
      // Check if user can manage queue (selection window active OR no toys in possession)
      const canManageQueue = cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession;
      
      if (canManageQueue) {
        console.log('User can manage queue, redirecting to subscription flow for queue management');
        // Track subscription flow started for queue management
        try {
          if (typeof window !== 'undefined' && window.cbq && user?.id) {
            window.cbq('track', 'StartSubscriptionFlow', {
              user_id: user.id,
              flow_type: 'queue_management',
              has_subscription: true,
              can_manage_queue: true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Analytics tracking error:', error);
        }
        
        navigate('/subscription-flow');
        return;
      }

      // User has subscription but cannot modify queue
      console.log('User cannot modify queue at this time');
      navigate('/subscription-flow'); // This will show the restricted access message
      return;
    }

    // For ALL users (guest and authenticated without subscription):
    // Redirect to auth page with subscription flow as return URL
    // Track subscription flow started for new/unauthenticated users
    try {
      if (typeof window !== 'undefined' && window.cbq) {
        window.cbq('track', 'StartSubscriptionFlow', {
          user_id: user?.id || 'guest',
          flow_type: 'new_subscription',
          has_subscription: false,
          is_authenticated: !!user,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
    
    console.log('Redirecting to auth for subscription flow access');
    const subscriptionFlowUrl = '/subscription-flow';
    navigate(`/auth?redirect=${encodeURIComponent(subscriptionFlowUrl)}`);
  };

  const getFlowStatus = () => {
    if (!user) return 'unauthenticated';
    if (!subscriptionData?.subscription) return 'no_subscription';
    
    const canManageQueue = cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession;
    if (canManageQueue) return 'can_manage_queue';
    
    return 'queue_restricted';
  };

  return {
    handleToyAction,
    flowStatus: getFlowStatus(),
    hasSubscription: !!subscriptionData?.subscription,
    canManageQueue: cycleStatus?.selection_window_active || !cycleStatus?.toys_in_possession,
  };
};


import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation } from '@/types/subscription';
import { SubscriptionCore } from './subscriptionCore';

export class SubscriptionPauseResume {
  /**
   * Pause subscription
   */
  static async pauseSubscription(userId: string, months: number): Promise<SubscriptionOperation> {
    try {
      console.log(`Pausing subscription for user ${userId} for ${months} months`);
      
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No active subscription found', error: 'NO_SUBSCRIPTION' };
      }

      if (subscription.pause_balance < months) {
        return { 
          success: false, 
          message: `Insufficient pause balance. Available: ${subscription.pause_balance} months`, 
          error: 'INSUFFICIENT_PAUSE_BALANCE' 
        };
      }

      // Update subscription status and extend end date
      const extendedEndDate = new Date(subscription.end_date);
      extendedEndDate.setMonth(extendedEndDate.getMonth() + months);

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'paused',
          end_date: extendedEndDate.toISOString(),
          pause_balance: subscription.pause_balance - months,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      // Track subscription pause
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'PauseSubscription', {
            user_id: userId,
            subscription_id: subscription.id,
            months_paused: months,
            pause_balance_remaining: subscription.pause_balance - months,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }

      // Create pause record
      const pauseRecord = {
        user_id: userId,
        subscription_id: subscription.id,
        pause_start_date: new Date().toISOString(),
        months_paused: months
      };

      const { error: pauseError } = await supabase
        .from('pause_records')
        .insert(pauseRecord);

      if (pauseError) throw pauseError;

      return { success: true, message: `Subscription paused for ${months} months` };

    } catch (error: any) {
      console.error('Error in pauseSubscription:', error);
      return { 
        success: false, 
        message: 'Failed to pause subscription', 
        error: error.message 
      };
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(userId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`Resuming subscription for user ${userId}`);
      
      const subscription = await SubscriptionCore.getPausedSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No paused subscription found', error: 'NO_PAUSED_SUBSCRIPTION' };
      }

      // Update pause record
      const { error: pauseError } = await supabase
        .from('pause_records')
        .update({ pause_end_date: new Date().toISOString() })
        .eq('subscription_id', subscription.id)
        .is('pause_end_date', null);

      if (pauseError) throw pauseError;

      // Reactivate subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      // Track subscription resume
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'ResumeSubscription', {
            user_id: userId,
            subscription_id: subscription.id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }

      return { success: true, message: 'Subscription resumed successfully' };

    } catch (error: any) {
      console.error('Error in resumeSubscription:', error);
      return { 
        success: false, 
        message: 'Failed to resume subscription', 
        error: error.message 
      };
    }
  }
}

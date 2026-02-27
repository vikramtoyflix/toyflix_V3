
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation } from '@/types/subscription';
import { PlanService } from '../planService';
import { EntitlementService } from '../entitlementService';
import { BillingService } from '../billingService';
import { SubscriptionCore } from './subscriptionCore';
import { CycleManagementService } from '../cycleManagementService';

export class SubscriptionLifecycle {
  /**
   * Generate monthly cycle - reset quotas and value caps
   */
  static async generateMonthlyCycle(userId: string): Promise<SubscriptionOperation> {
    try {
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'No active subscription found'
        };
      }

      const plan = PlanService.getPlan(subscription.plan_id);
      if (!plan) {
        return {
          success: false,
          message: 'Invalid plan configuration'
        };
      }

      // Initialize new cycle
      const cycleResult = await CycleManagementService.initializeCycle(subscription.id, userId);
      if (!cycleResult.success) {
        return cycleResult;
      }

      // Reset entitlements for new cycle
      const { error: entitlementError } = await supabase
        .from('user_entitlements')
        .update({
          standard_toys_remaining: plan.features.standardToys,
          big_toys_remaining: plan.features.bigToys,
          books_remaining: plan.features.books,
          premium_toys_remaining: plan.features.premiumToys || 0,
          value_cap_remaining: plan.features.valueCapMax,
          current_month: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription.id);

      if (entitlementError) throw entitlementError;

      return {
        success: true,
        message: 'Monthly cycle generated successfully',
        data: { subscription, plan, cycleInfo: cycleResult.data }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to generate monthly cycle',
        error: error.message
      };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`Cancelling subscription for user ${userId}`);
      
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No active subscription found', error: 'NO_SUBSCRIPTION' };
      }

      // Update subscription to cancel at period end
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          auto_renew: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      // Revoke special entitlements
      await EntitlementService.revokeEntitlements(userId, subscription.id);

      return { success: true, message: 'Subscription cancelled successfully' };

    } catch (error: any) {
      console.error('Error in cancelSubscription:', error);
      return { 
        success: false, 
        message: 'Failed to cancel subscription', 
        error: error.message 
      };
    }
  }

  /**
   * Renew subscription
   */
  static async renewSubscription(userId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`Renewing subscription for user ${userId}`);
      
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No active subscription found', error: 'NO_SUBSCRIPTION' };
      }

      const plan = PlanService.getPlan(subscription.plan_id);
      if (!plan) {
        return { success: false, message: 'Invalid plan configuration', error: 'INVALID_PLAN' };
      }

      // Extend subscription period
      const newEndDate = new Date(subscription.end_date);
      newEndDate.setMonth(newEndDate.getMonth() + plan.duration);

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          end_date: newEndDate.toISOString(),
          pause_balance: plan.features.pauseMonthsAllowed, // Reset pause balance
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      // Create billing record
      await BillingService.createBillingRecord(userId, subscription.id, plan.price);

      return { success: true, message: 'Subscription renewed successfully' };

    } catch (error: any) {
      console.error('Error in renewSubscription:', error);
      return { 
        success: false, 
        message: 'Failed to renew subscription', 
        error: error.message 
      };
    }
  }
}

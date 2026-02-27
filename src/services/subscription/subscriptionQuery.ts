
import { SubscriptionOperation } from '@/types/subscription';
import { PlanService } from '../planService';
import { EntitlementService } from '../entitlementService';
import { SubscriptionCore } from './subscriptionCore';

export class SubscriptionQuery {
  /**
   * Get user entitlements and subscription details
   */
  static async queryUserEntitlements(userId: string): Promise<SubscriptionOperation> {
    try {
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No active subscription found', error: 'NO_SUBSCRIPTION' };
      }

      const entitlements = await EntitlementService.getUserEntitlements(userId);
      const plan = PlanService.getPlan(subscription.plan_id);

      return { 
        success: true, 
        message: 'Entitlements retrieved successfully',
        data: {
          subscription,
          entitlements,
          plan
        }
      };

    } catch (error: any) {
      console.error('Error in queryUserEntitlements:', error);
      return { 
        success: false, 
        message: 'Failed to retrieve entitlements', 
        error: error.message 
      };
    }
  }
}


import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation } from '@/types/subscription';
import { PlanService } from '../planService';
import { EntitlementService } from '../entitlementService';
import { BillingService } from '../billingService';
import { SubscriptionCore } from './subscriptionCore';
import { SubscriptionPerks } from './subscriptionPerks';

export class SubscriptionCreation {
  /**
   * Subscribe user to a plan with selected toys
   */
  static async subscribe(planId: string, userId: string, selectedToys?: any[]): Promise<SubscriptionOperation> {
    try {
      console.log(`🎯 [SubscriptionCreation] Starting subscription process for user ${userId} to plan ${planId}`, { selectedToys });
      console.log(`⚠️ [SubscriptionCreation] WARNING: This should only be called for NEW subscribers. Existing subscribers should use SubscriptionUpgrade.upgradePlan()`);
      
      const plan = PlanService.getPlan(planId);
      if (!plan) {
        return { success: false, message: 'Invalid plan ID', error: 'INVALID_PLAN' };
      }

      // Check if user already has an active subscription
      const existingSubscription = await SubscriptionCore.getActiveSubscription(userId);
      if (existingSubscription) {
        // SCENARIO 1: Same plan renewal (especially for Discovery Delight monthly cycles)
        if (existingSubscription.plan_id === planId) {
          console.log(`🔄 [SubscriptionCreation] User ${userId} renewing same plan ${planId} - routing to renewal service`);
          
          // Import lifecycle service for renewals
          const { SubscriptionLifecycle } = await import('./subscriptionLifecycle');
          return await SubscriptionLifecycle.renewSubscription(userId);
        }
        
        // SCENARIO 2: Plan upgrade (Discovery Delight → Silver/Gold, etc.)
        else {
          console.log(`🔄 [SubscriptionCreation] User ${userId} upgrading from ${existingSubscription.plan_id} to ${planId} - routing to upgrade service`);
          
          // Import upgrade service dynamically to avoid circular dependencies
          const { SubscriptionUpgrade } = await import('./subscriptionUpgrade');
          return await SubscriptionUpgrade.upgradePlan(userId, planId);
        }
      }

      // Check for expired/cancelled subscriptions (lapsed users)
      const expiredSubscription = await SubscriptionCore.getSubscriptionForUpgrade(userId);
      if (expiredSubscription && (expiredSubscription.status === 'expired' || expiredSubscription.status === 'cancelled')) {
        // SCENARIO 3 & 4: Lapsed or cancelled users wanting to reactivate
        console.log(`🔄 [SubscriptionCreation] User ${userId} reactivating subscription from ${expiredSubscription.status} status to plan ${planId}`);
        
        // Import upgrade service to handle reactivation (it has logic for expired/cancelled users)
        const { SubscriptionUpgrade } = await import('./subscriptionUpgrade');
        return await SubscriptionUpgrade.upgradePlan(userId, planId);
      }

      // SCENARIO 5: Truly new user (no subscription history)
      console.log(`🆕 [SubscriptionCreation] New user ${userId} creating first subscription for plan ${planId}`);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration);

      // Create subscription record with proper type casting
      const subscription = {
        user_id: userId,
        plan_id: planId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        current_period_start: startDate.toISOString(),
        current_period_end: new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()).toISOString(),
        current_cycle_start: startDate.toISOString().split('T')[0],
        current_cycle_end: new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()).toISOString().split('T')[0],
        pause_balance: plan.features.pauseMonthsAllowed,
        auto_renew: plan.type === 'monthly',
        cycle_status: 'delivery_pending' as const  // Type cast to the enum value
      };

      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (subError) {
        console.error('Error creating subscription:', subError);
        throw subError;
      }

      if (!subscriptionData) {
        throw new Error('Failed to create subscription - no data returned');
      }

      console.log('Subscription created successfully:', subscriptionData.id);

      // Track subscription creation
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          const totalToySlots = plan.features.standardToys + plan.features.bigToys +
                                plan.features.stemToys + plan.features.educationalToys +
                                plan.features.books;
          
          window.cbq('track', 'Subscribe', {
            user_id: userId,
            subscription_id: subscriptionData.id,
            plan_id: planId,
            plan_name: plan.name,
            value: plan.price,
            currency: 'INR',
            duration: plan.duration,
            toy_slots: totalToySlots,
            auto_renew: subscriptionData.auto_renew,
            selected_toys_count: selectedToys?.length || 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }

      // Create initial entitlements
      await EntitlementService.createInitialEntitlement(userId, subscriptionData.id, planId);

      // Store selected toys in user entitlements if provided
      if (selectedToys && selectedToys.length > 0) {
        console.log('Storing selected toys in entitlements:', selectedToys);
        const toyIds = selectedToys.map(toy => typeof toy === 'string' ? toy : toy.id);
        
        const { error: entitlementError } = await supabase
          .from('user_entitlements')
          .update({
            current_cycle_toys: toyIds,
            toys_in_possession: false,
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscriptionData.id)
          .eq('user_id', userId);

        if (entitlementError) {
          console.error('Error updating entitlements with toys:', entitlementError);
        } else {
          console.log('Successfully stored selected toys in entitlements');
        }
      }

      // Create billing record
      await BillingService.createBillingRecord(userId, subscriptionData.id, plan.price);

      // Assign special perks for Gold Pack
      if (PlanService.hasSpecialPerks(planId)) {
        await SubscriptionPerks.assignOneTimePerks(userId, subscriptionData.id);
      }

      console.log(`Subscription created successfully for user ${userId}`);
      return { 
        success: true, 
        message: 'Subscription created successfully', 
        data: {
          id: subscriptionData.id,
          user_id: subscriptionData.user_id,
          plan_id: subscriptionData.plan_id,
          status: subscriptionData.status as 'active' | 'paused' | 'cancelled' | 'expired',
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date,
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          pause_balance: subscriptionData.pause_balance,
          auto_renew: subscriptionData.auto_renew,
          created_at: subscriptionData.created_at,
          updated_at: subscriptionData.updated_at
        }
      };

    } catch (error: any) {
      console.error('Error in subscribe:', error);
      return { 
        success: false, 
        message: 'Failed to create subscription', 
        error: error.message 
      };
    }
  }
}

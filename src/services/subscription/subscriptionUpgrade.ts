
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation, ProrationCalculation, Subscription } from '@/types/subscription';
import { PlanService } from '../planService';
import { EntitlementService } from '../entitlementService';
import { BillingService } from '../billingService';
import { SubscriptionCore } from './subscriptionCore';

export class SubscriptionUpgrade {
  /**
   * Enhanced upgrade eligibility check - determines upgrade vs new subscription flow
   */
  static async checkUpgradeEligibility(userId: string): Promise<{
    isEligibleForUpgrade: boolean;
    subscriptionStatus: 'active' | 'paused' | 'expired' | 'cancelled' | 'none';
    currentPlanId: string | null;
    shouldResetCycle: boolean;
    currentCycleInfo: any | null;
  }> {
    try {
      // Check for any existing subscription (including expired/cancelled)
      const existingSubscription = await SubscriptionCore.getSubscriptionForUpgrade(userId);
      
      if (!existingSubscription) {
        return {
          isEligibleForUpgrade: false,
          subscriptionStatus: 'none',
          currentPlanId: null,
          shouldResetCycle: false,
          currentCycleInfo: null
        };
      }

      // Get current cycle info from rental orders
      const currentCycleInfo = await SubscriptionCore.getCurrentCycleFromRentalOrders(userId);

      // Determine if cycle should reset based on subscription status
      const shouldResetCycle = existingSubscription.status === 'expired' || existingSubscription.status === 'cancelled';

      return {
        isEligibleForUpgrade: true,
        subscriptionStatus: existingSubscription.status,
        currentPlanId: existingSubscription.plan_id,
        shouldResetCycle,
        currentCycleInfo
      };
    } catch (error) {
      console.error('Error checking upgrade eligibility:', error);
      return {
        isEligibleForUpgrade: false,
        subscriptionStatus: 'none',
        currentPlanId: null,
        shouldResetCycle: false,
        currentCycleInfo: null
      };
    }
  }

  /**
   * Calculate upgrade requirements and proration without performing the upgrade
   */
static async calculateUpgradeRequirements(userId: string, newPlanId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`Calculating upgrade requirements for user ${userId} to ${newPlanId}`);
      
      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        return { success: false, message: 'No active subscription found', error: 'NO_SUBSCRIPTION' };
      }

      const currentPlan = PlanService.getPlan(subscription.plan_id);
      const newPlan = PlanService.getPlan(newPlanId);
      
      if (!currentPlan || !newPlan) {
        return { success: false, message: 'Invalid plan configuration', error: 'INVALID_PLAN' };
      }

      // Calculate proration
      const proration = this.calculateProration(subscription, currentPlan, newPlan);

      return { 
        success: true, 
        message: 'Upgrade requirements calculated successfully', 
        data: { 
          proration, 
          currentSubscription: subscription,
          currentPlan,
          newPlan
        } 
      };

    } catch (error: any) {
      console.error('Error calculating upgrade requirements:', error);
      return { 
        success: false, 
        message: 'Failed to calculate upgrade requirements', 
        error: error.message 
      };
    }
  }

  /**
   * Enhanced upgrade plan method with proper cycle handling
   */
  static async upgradePlan(userId: string, newPlanId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`🔄 [SubscriptionUpgrade] Upgrading plan for user ${userId} to ${newPlanId}`);
      console.log(`✅ [SubscriptionUpgrade] This is the CORRECT service for existing subscribers changing plans`);
      
      // Check upgrade eligibility first
      const eligibility = await this.checkUpgradeEligibility(userId);
      
      if (!eligibility.isEligibleForUpgrade) {
        return { success: false, message: 'No subscription found for upgrade', error: 'NO_SUBSCRIPTION' };
      }

      const currentPlan = PlanService.getPlan(eligibility.currentPlanId || '');
      const newPlan = PlanService.getPlan(newPlanId);
      
      if (!currentPlan || !newPlan) {
        return { success: false, message: 'Invalid plan configuration', error: 'INVALID_PLAN' };
      }

      console.log(`📊 Upgrade context:`, {
        currentStatus: eligibility.subscriptionStatus,
        currentPlan: eligibility.currentPlanId,
        newPlan: newPlanId,
        shouldResetCycle: eligibility.shouldResetCycle,
        cycleInfo: eligibility.currentCycleInfo
      });

      // Handle different upgrade scenarios based on subscription status
      switch (eligibility.subscriptionStatus) {
        case 'active':
        case 'paused':
          // Active/paused users: Update existing subscription with cycle preservation
          console.log(`✅ [SubscriptionUpgrade] Updating existing ${eligibility.subscriptionStatus} subscription`);
          return await this.updateExistingSubscription(userId, newPlanId, newPlan, eligibility);
          
        case 'expired':
          // Expired users: Create new subscription with reset cycle (returning customer)
          console.log(`🔄 [SubscriptionUpgrade] Creating new subscription for expired user (returning customer)`);
          return await this.createNewSubscriptionForExpiredUser(userId, newPlanId, newPlan);
          
        case 'cancelled':
          // Cancelled users: Create new subscription with reset cycle (restarting customer)
          console.log(`🔄 [SubscriptionUpgrade] Creating new subscription for cancelled user (restarting customer)`);
          return await this.createNewSubscriptionForCancelledUser(userId, newPlanId, newPlan);
          
        default:
          console.error(`❌ [SubscriptionUpgrade] Unknown subscription status: ${eligibility.subscriptionStatus}`);
          return { success: false, message: 'Invalid subscription status', error: 'INVALID_STATUS' };
      }

    } catch (error: any) {
      console.error('❌ Error in upgradePlan:', error);
      return { 
        success: false, 
        message: 'Failed to upgrade plan', 
        error: error.message 
      };
    }
  }

  /**
   * Create new subscription for expired/cancelled users (reset cycle, new customer pricing)
   */
  private static async createNewSubscriptionForExpiredUser(userId: string, newPlanId: string, newPlan: any): Promise<SubscriptionOperation> {
    try {
      console.log('🆕 Creating new subscription for expired/cancelled user');

      // Create new subscription record
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + newPlan.duration);

      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: newPlanId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          pause_balance: newPlan.features.pauseMonthsAllowed,
          auto_renew: true,
          // Reset cycle tracking
          cycle_number: 1,
          cycle_start_date: startDate.toISOString().split('T')[0],
          cycle_end_date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial entitlements for new subscription
      await EntitlementService.createInitialEntitlement(userId, newSubscription.id, newPlanId);

      return { 
        success: true, 
        message: 'New subscription created successfully for expired user',
        data: { subscriptionId: newSubscription.id }
      };

    } catch (error: any) {
      console.error('❌ Error creating new subscription for expired user:', error);
      throw error;
    }
  }

  /**
   * Create new subscription for cancelled users (reset cycle, restarting customer)
   */
  private static async createNewSubscriptionForCancelledUser(userId: string, newPlanId: string, newPlan: any): Promise<SubscriptionOperation> {
    try {
      console.log('🔄 Creating new subscription for cancelled user (restarting customer)');

      // Create new subscription record with reset cycle
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + newPlan.duration);

      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: newPlanId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          pause_balance: newPlan.features.pauseMonthsAllowed,
          auto_renew: true,
          // Reset cycle tracking for restarting customer
          cycle_number: 1,
          cycle_start_date: startDate.toISOString().split('T')[0],
          cycle_end_date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial entitlements for new subscription
      await EntitlementService.createInitialEntitlement(userId, newSubscription.id, newPlanId);

      return { 
        success: true, 
        message: 'New subscription created successfully for cancelled user',
        data: { subscriptionId: newSubscription.id }
      };

    } catch (error: any) {
      console.error('❌ Error creating new subscription for cancelled user:', error);
      throw error;
    }
  }

  /**
   * Update existing subscription for active/paused users (preserve cycle, immediate/delayed benefits)
   */
  private static async updateExistingSubscription(userId: string, newPlanId: string, newPlan: any, eligibility: any): Promise<SubscriptionOperation> {
    try {
      console.log('🔄 Updating existing subscription with cycle preservation');

      const subscription = await SubscriptionCore.getActiveSubscription(userId);
      if (!subscription) {
        throw new Error('Active subscription not found');
      }

      // For immediate upgrades (same cycle length or immediate effect)
      const isImmediateUpgrade = this.isImmediateUpgrade(subscription.plan_id, newPlanId);
      
      if (isImmediateUpgrade) {
        // Update plan immediately, keep cycle timing
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            plan_id: newPlanId,
            pause_balance: newPlan.features.pauseMonthsAllowed,
            updated_at: new Date().toISOString()
            // Preserve all cycle tracking fields
          })
          .eq('id', subscription.id);

        if (updateError) throw updateError;

        // Update entitlements immediately
        await EntitlementService.updateEntitlementsForPlanChange(userId, subscription.id, newPlanId);

      } else {
        // Delayed upgrade: Plan changes after current cycle completes
        // Store the pending upgrade for later processing
        const cycleInfo = eligibility.currentCycleInfo;
        const nextCycleStartDate = cycleInfo ? new Date(cycleInfo.cycleEndDate.getTime() + 24 * 60 * 60 * 1000) : new Date();
        
        // Update subscription with pending plan change
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            // Keep current plan_id for now
            pause_balance: newPlan.features.pauseMonthsAllowed,
            updated_at: new Date().toISOString(),
            // Store pending upgrade info (you may need to add these columns)
            pending_plan_id: newPlanId,
            plan_change_effective_date: nextCycleStartDate.toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.warn('⚠️ Could not store pending upgrade info, proceeding with immediate upgrade');
          // Fallback to immediate upgrade if pending columns don't exist
          const { error: fallbackError } = await supabase
            .from('subscriptions')
            .update({ 
              plan_id: newPlanId,
              pause_balance: newPlan.features.pauseMonthsAllowed,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          if (fallbackError) throw fallbackError;
          await EntitlementService.updateEntitlementsForPlanChange(userId, subscription.id, newPlanId);
        }
      }

      return { 
        success: true, 
        message: isImmediateUpgrade ? 
          'Plan upgraded immediately with cycle preservation' : 
          'Plan upgrade scheduled for next cycle'
      };

    } catch (error: any) {
      console.error('❌ Error updating existing subscription:', error);
      throw error;
    }
  }

  /**
   * Determine if upgrade should happen immediately or be delayed
   */
  private static isImmediateUpgrade(currentPlanId: string, newPlanId: string): boolean {
    // Silver Pack to Gold Pack = immediate upgrade (same duration)
    if (currentPlanId === 'silver-pack' && newPlanId === 'gold-pack') {
      return true;
    }
    
    // Gold Pack to Silver Pack = immediate downgrade (same duration)
    if (currentPlanId === 'gold-pack' && newPlanId === 'silver-pack') {
      return true;
    }
    
    // Different duration plans = delayed upgrade (wait for cycle completion)
    const currentPlan = PlanService.getPlan(currentPlanId);
    const newPlan = PlanService.getPlan(newPlanId);
    
    if (currentPlan && newPlan && currentPlan.duration !== newPlan.duration) {
      return false; // Different durations = delayed
    }
    
    return true; // Default to immediate
  }

  /**
   * Check if user is in selection window for toy selection
   */
  static async isInSelectionWindow(userId: string): Promise<boolean> {
    try {
      const cycleInfo = await SubscriptionCore.getCurrentCycleFromRentalOrders(userId);
      
      if (!cycleInfo) {
        return false;
      }

      // Selection window is typically days 24-30 of a 30-day cycle
      const { dayInCycle } = cycleInfo;
      return dayInCycle >= 24 && dayInCycle <= 30;
      
    } catch (error) {
      console.error('Error checking selection window:', error);
      return false;
    }
  }

  /**
   * Get upgrade pricing information for modal display
   */
  static async getUpgradePricing(userId: string, newPlanId: string): Promise<{
    currentPlan: any;
    newPlan: any;
    isNewCustomerPricing: boolean;
    paymentAmount: number;
    effectiveDate: string;
    cycleImpact: string;
  } | null> {
    try {
      const eligibility = await this.checkUpgradeEligibility(userId);
      const newPlan = PlanService.getPlan(newPlanId);
      
      if (!newPlan) return null;

      const currentPlan = eligibility.currentPlanId ? 
        PlanService.getPlan(eligibility.currentPlanId) : null;

      // Determine pricing type
      const isNewCustomerPricing = eligibility.shouldResetCycle;
      const paymentAmount = newPlan.price; // Always full price as per requirements

      // Determine when upgrade takes effect
      let effectiveDate = 'Immediately';
      let cycleImpact = 'Benefits start immediately';

      if (eligibility.subscriptionStatus === 'active' || eligibility.subscriptionStatus === 'paused') {
        const isImmediate = currentPlan ? 
          this.isImmediateUpgrade(eligibility.currentPlanId!, newPlanId) : 
          true;
          
        if (!isImmediate) {
          effectiveDate = 'After current cycle completes';
          cycleImpact = 'Payment now, benefits start next cycle';
        }
      }

      return {
        currentPlan,
        newPlan,
        isNewCustomerPricing,
        paymentAmount,
        effectiveDate,
        cycleImpact
      };

    } catch (error) {
      console.error('Error getting upgrade pricing:', error);
      return null;
    }
  }

  private static calculateProration(
    subscription: Subscription, 
    currentPlan: any, 
    newPlan: any
  ): ProrationCalculation {
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const totalDays = Math.ceil((endDate.getTime() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const creditAmount = (currentPlan.price * daysRemaining) / totalDays;
    const newPlanProration = (newPlan.price * daysRemaining) / (newPlan.duration * 30);
    
    // Calculate the difference to determine if payment is needed or refund is due
    const priceDifference = newPlanProration - creditAmount;
    const refundDue = Math.max(0, -priceDifference); // Refund if difference is negative
    const additionalChargeRequired = Math.max(0, priceDifference); // Charge if difference is positive

    return {
      daysRemaining,
      creditAmount,
      newPlanProration,
      refundDue,
      additionalChargeRequired,
      requiresPayment: additionalChargeRequired > 0
    };
  }
}

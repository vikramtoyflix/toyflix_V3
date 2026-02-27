import { supabase } from "@/integrations/supabase/client";
import { addDays, addMonths, parseISO, differenceInDays, format, isAfter, isBefore } from "date-fns";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  billing_cycle: BillingCycle;
  auto_renewal: boolean;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  next_billing_date: string;
  grace_period_end?: string;
  pause_count: number;
  extension_days: number;
  free_months_added: number;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

interface BillingAdjustment {
  type: 'credit' | 'debit' | 'refund' | 'discount';
  amount: number;
  reason: string;
  reference_id?: string;
  effective_date: string;
  notes?: string;
}

interface PlanChangeResult {
  prorated_amount: number;
  effective_date: string;
  new_billing_date: string;
  credit_applied?: number;
  additional_charge?: number;
}

interface ExtensionResult {
  new_end_date: string;
  days_added: number;
  total_extension_days: number;
  remaining_extension_allowance: number;
}

interface SubscriptionAction {
  id: string;
  subscription_id: string;
  action_type: ActionType;
  action_data: any;
  performed_by: string;
  performed_at: string;
  notes?: string;
  amount_change?: number;
  effective_date: string;
}

// ================================================================================================
// ENUMS AND TYPES
// ================================================================================================

type SubscriptionPlan = 'trial' | 'basic' | 'standard' | 'premium' | 'enterprise';
type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'pending' | 'suspended';
type BillingCycle = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
type PaymentMethod = 'card' | 'upi' | 'net_banking' | 'wallet' | 'cash';
type ActionType = 'plan_change' | 'pause' | 'resume' | 'cancel' | 'extend' | 'add_free_month' | 'billing_update' | 'credit' | 'refund';

// ================================================================================================
// CONSTANTS AND BUSINESS RULES
// ================================================================================================

const SUBSCRIPTION_PLANS = {
  trial: { price: 499, max_toys: 3, features: ['Basic support'], max_extensions: 30 },
  basic: { price: 999, max_toys: 5, features: ['Standard support', 'Free replacement'], max_extensions: 90 },
  standard: { price: 1499, max_toys: 8, features: ['Priority support', 'Free delivery'], max_extensions: 180 },
  premium: { price: 1999, max_toys: 12, features: ['Premium support', 'All features'], max_extensions: 365 },
  enterprise: { price: 2999, max_toys: 999, features: ['Unlimited toys', 'Dedicated support'], max_extensions: 730 }
};

const BILLING_CYCLES = {
  monthly: { multiplier: 1, discount: 0 },
  quarterly: { multiplier: 3, discount: 0.05 },
  'semi-annual': { multiplier: 6, discount: 0.10 },
  annual: { multiplier: 12, discount: 0.15 }
};

const BUSINESS_RULES = {
  MAX_EXTENSION_DAYS_PER_ACTION: 365,
  MAX_FREE_MONTHS_PER_SUBSCRIPTION: 2,
  MAX_PAUSE_COUNT_PER_YEAR: 3,
  MAX_PAUSE_DURATION_DAYS: 90,
  GRACE_PERIOD_DAYS: 3,
  MIN_REFUND_AMOUNT: 100,
  MAX_REFUND_PERCENTAGE: 0.8,
  PLAN_CHANGE_COOLDOWN_DAYS: 30
};

// ================================================================================================
// SUBSCRIPTION EXTENSION SERVICE
// ================================================================================================

export class SubscriptionExtensionService {
  
  // ================================================================================================
  // EXTENSION MANAGEMENT
  // ================================================================================================

  /**
   * Extend a subscription by adding days to the current period
   */
  static async extendSubscription(
    userId: string, 
    days: number, 
    reason: string,
    performedBy?: string
  ): Promise<ExtensionResult> {
    try {
      // Input validation
      if (days <= 0 || days > BUSINESS_RULES.MAX_EXTENSION_DAYS_PER_ACTION) {
        throw new Error(`Extension days must be between 1 and ${BUSINESS_RULES.MAX_EXTENSION_DAYS_PER_ACTION}`);
      }

      // Get current subscription
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      // Check extension limits
      const planLimits = SUBSCRIPTION_PLANS[subscription.plan_type];
      const totalExtensionAfter = subscription.extension_days + days;
      
      if (totalExtensionAfter > planLimits.max_extensions) {
        throw new Error(`Extension would exceed plan limit of ${planLimits.max_extensions} days`);
      }

      // Calculate new end date
      const currentEndDate = parseISO(subscription.current_period_end);
      const newEndDate = addDays(currentEndDate, days);

      // Start transaction
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          current_period_end: newEndDate.toISOString(),
          extension_days: totalExtensionAfter,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      // Log the action
      await this.logSubscriptionAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subscription_id: subscription.id,
        action_type: 'extend',
        action_data: {
          extension_days: days,
          new_end_date: newEndDate.toISOString(),
          reason
        },
        performed_by: performedBy || 'system',
        performed_at: new Date().toISOString(),
        notes: reason,
        effective_date: new Date().toISOString()
      });

      // Update related rental orders if any
      await this.updateRentalOrdersForExtension(userId, newEndDate);

      return {
        new_end_date: newEndDate.toISOString(),
        days_added: days,
        total_extension_days: totalExtensionAfter,
        remaining_extension_allowance: planLimits.max_extensions - totalExtensionAfter
      };

    } catch (error) {
      console.error('Extension error:', error);
      throw error;
    }
  }

  /**
   * Add a free month to the subscription
   */
  static async addFreeMonth(
    userId: string, 
    reason: string,
    performedBy?: string
  ): Promise<ExtensionResult> {
    try {
      // Get current subscription
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      // Check free month limits
      if (subscription.free_months_added >= BUSINESS_RULES.MAX_FREE_MONTHS_PER_SUBSCRIPTION) {
        throw new Error(`Maximum ${BUSINESS_RULES.MAX_FREE_MONTHS_PER_SUBSCRIPTION} free months already added`);
      }

      // Calculate new end date (30 days)
      const freeDays = 30;
      const currentEndDate = parseISO(subscription.current_period_end);
      const newEndDate = addDays(currentEndDate, freeDays);

      // Update subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          current_period_end: newEndDate.toISOString(),
          extension_days: subscription.extension_days + freeDays,
          free_months_added: subscription.free_months_added + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to add free month: ${updateError.message}`);
      }

      // Log the action
      await this.logSubscriptionAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subscription_id: subscription.id,
        action_type: 'add_free_month',
        action_data: {
          free_month_added: true,
          new_end_date: newEndDate.toISOString(),
          reason
        },
        performed_by: performedBy || 'system',
        performed_at: new Date().toISOString(),
        notes: reason,
        effective_date: new Date().toISOString()
      });

      const planLimits = SUBSCRIPTION_PLANS[subscription.plan_type];
      
      return {
        new_end_date: newEndDate.toISOString(),
        days_added: freeDays,
        total_extension_days: subscription.extension_days + freeDays,
        remaining_extension_allowance: planLimits.max_extensions - (subscription.extension_days + freeDays)
      };

    } catch (error) {
      console.error('Free month error:', error);
      throw error;
    }
  }

  /**
   * Pause a subscription for specified days
   */
  static async pauseSubscription(
    userId: string, 
    pauseDays: number,
    reason?: string,
    performedBy?: string
  ): Promise<void> {
    try {
      // Validation
      if (pauseDays <= 0 || pauseDays > BUSINESS_RULES.MAX_PAUSE_DURATION_DAYS) {
        throw new Error(`Pause duration must be between 1 and ${BUSINESS_RULES.MAX_PAUSE_DURATION_DAYS} days`);
      }

      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      if (subscription.status !== 'active') {
        throw new Error('Only active subscriptions can be paused');
      }

      // Check pause limits
      if (subscription.pause_count >= BUSINESS_RULES.MAX_PAUSE_COUNT_PER_YEAR) {
        throw new Error(`Maximum ${BUSINESS_RULES.MAX_PAUSE_COUNT_PER_YEAR} pauses per year reached`);
      }

      // Calculate new dates
      const currentEndDate = parseISO(subscription.current_period_end);
      const pauseEndDate = addDays(currentEndDate, pauseDays);

      // Update subscription
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'paused',
          current_period_end: pauseEndDate.toISOString(),
          pause_count: subscription.pause_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (updateError) {
        throw new Error(`Failed to pause subscription: ${updateError.message}`);
      }

      // Log the action
      await this.logSubscriptionAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subscription_id: subscription.id,
        action_type: 'pause',
        action_data: {
          pause_days: pauseDays,
          pause_end_date: pauseEndDate.toISOString(),
          reason: reason || 'User requested pause'
        },
        performed_by: performedBy || 'system',
        performed_at: new Date().toISOString(),
        notes: reason,
        effective_date: new Date().toISOString()
      });

      // Update rental orders status
      await this.updateRentalOrdersForPause(userId, true);

    } catch (error) {
      console.error('Pause subscription error:', error);
      throw error;
    }
  }

  /**
   * Resume a paused subscription
   */
  static async resumeSubscription(
    userId: string,
    reason?: string,
    performedBy?: string
  ): Promise<void> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found for user');
      }

      if (subscription.status !== 'paused') {
        throw new Error('Only paused subscriptions can be resumed');
      }

      // Update subscription
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'paused');

      if (updateError) {
        throw new Error(`Failed to resume subscription: ${updateError.message}`);
      }

      // Log the action
      await this.logSubscriptionAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subscription_id: subscription.id,
        action_type: 'resume',
        action_data: {
          resume_date: new Date().toISOString(),
          reason: reason || 'User requested resume'
        },
        performed_by: performedBy || 'system',
        performed_at: new Date().toISOString(),
        notes: reason,
        effective_date: new Date().toISOString()
      });

      // Update rental orders status
      await this.updateRentalOrdersForPause(userId, false);

    } catch (error) {
      console.error('Resume subscription error:', error);
      throw error;
    }
  }

  // ================================================================================================
  // PLAN MANAGEMENT
  // ================================================================================================

  /**
   * Upgrade subscription plan
   */
  static async upgradePlan(
    userId: string, 
    newPlan: SubscriptionPlan, 
    effectiveDate?: Date,
    reason?: string,
    performedBy?: string
  ): Promise<PlanChangeResult> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      const currentPlanPrice = SUBSCRIPTION_PLANS[subscription.plan_type].price;
      const newPlanPrice = SUBSCRIPTION_PLANS[newPlan].price;

      if (newPlanPrice <= currentPlanPrice) {
        throw new Error('Use downgradePlan method for plan downgrades');
      }

      return await this.processPlanChange(
        subscription, 
        newPlan, 
        effectiveDate, 
        reason || 'Plan upgrade',
        performedBy
      );

    } catch (error) {
      console.error('Upgrade plan error:', error);
      throw error;
    }
  }

  /**
   * Downgrade subscription plan
   */
  static async downgradePlan(
    userId: string, 
    newPlan: SubscriptionPlan, 
    effectiveDate?: Date,
    reason?: string,
    performedBy?: string
  ): Promise<PlanChangeResult> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found for user');
      }

      const currentPlanPrice = SUBSCRIPTION_PLANS[subscription.plan_type].price;
      const newPlanPrice = SUBSCRIPTION_PLANS[newPlan].price;

      if (newPlanPrice >= currentPlanPrice) {
        throw new Error('Use upgradePlan method for plan upgrades');
      }

      return await this.processPlanChange(
        subscription, 
        newPlan, 
        effectiveDate, 
        reason || 'Plan downgrade',
        performedBy
      );

    } catch (error) {
      console.error('Downgrade plan error:', error);
      throw error;
    }
  }

  /**
   * Calculate prorated amount for plan change
   */
  static async calculatePlanChangeAmount(
    currentPlan: SubscriptionPlan, 
    newPlan: SubscriptionPlan, 
    remainingDays: number,
    billingCycle: BillingCycle = 'monthly'
  ): Promise<number> {
    try {
      const currentPlanData = SUBSCRIPTION_PLANS[currentPlan];
      const newPlanData = SUBSCRIPTION_PLANS[newPlan];
      const cycleData = BILLING_CYCLES[billingCycle];

      if (!currentPlanData || !newPlanData || !cycleData) {
        throw new Error('Invalid plan or billing cycle');
      }

      // Calculate effective monthly prices after cycle discounts
      const currentMonthlyPrice = currentPlanData.price * (1 - cycleData.discount);
      const newMonthlyPrice = newPlanData.price * (1 - cycleData.discount);

      // Calculate daily rates
      const daysInMonth = 30; // Standardized month
      const currentDailyRate = currentMonthlyPrice / daysInMonth;
      const newDailyRate = newMonthlyPrice / daysInMonth;

      // Calculate prorated amounts
      const currentProrated = currentDailyRate * remainingDays;
      const newProrated = newDailyRate * remainingDays;

      // Return the difference (positive for additional charge, negative for credit)
      return Math.round((newProrated - currentProrated) * 100) / 100;

    } catch (error) {
      console.error('Calculate plan change amount error:', error);
      throw error;
    }
  }

  // ================================================================================================
  // BILLING ADJUSTMENTS
  // ================================================================================================

  /**
   * Apply credit to user account
   */
  static async applyCredit(
    userId: string, 
    amount: number, 
    reason: string,
    referenceId?: string,
    performedBy?: string
  ): Promise<void> {
    try {
      if (amount <= 0) {
        throw new Error('Credit amount must be positive');
      }

      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found for user');
      }

      // Create billing adjustment record
      const adjustment: BillingAdjustment = {
        type: 'credit',
        amount,
        reason,
        reference_id: referenceId,
        effective_date: new Date().toISOString(),
        notes: `Credit applied: ${reason}`
      };

      await this.processBillingAdjustment(userId, adjustment, performedBy);

    } catch (error) {
      console.error('Apply credit error:', error);
      throw error;
    }
  }

  /**
   * Process refund for an order
   */
  static async processRefund(
    orderId: string, 
    amount: number, 
    reason: string,
    performedBy?: string
  ): Promise<void> {
    try {
      if (amount < BUSINESS_RULES.MIN_REFUND_AMOUNT) {
        throw new Error(`Minimum refund amount is ₹${BUSINESS_RULES.MIN_REFUND_AMOUNT}`);
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Validate refund amount
      const maxRefund = order.total_amount * BUSINESS_RULES.MAX_REFUND_PERCENTAGE;
      if (amount > maxRefund) {
        throw new Error(`Maximum refund amount is ₹${maxRefund.toFixed(2)} (${BUSINESS_RULES.MAX_REFUND_PERCENTAGE * 100}% of order)`);
      }

      // Create billing adjustment
      const adjustment: BillingAdjustment = {
        type: 'refund',
        amount,
        reason,
        reference_id: orderId,
        effective_date: new Date().toISOString(),
        notes: `Refund processed for order ${orderId}: ${reason}`
      };

      await this.processBillingAdjustment(order.user_id, adjustment, performedBy);

      // Update order status
      await supabase
        .from('rental_orders')
        .update({
          status: 'refunded',
          refund_amount: amount,
          refund_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

    } catch (error) {
      console.error('Process refund error:', error);
      throw error;
    }
  }

  /**
   * Adjust billing for a user
   */
  static async adjustBilling(
    userId: string, 
    adjustment: BillingAdjustment,
    performedBy?: string
  ): Promise<void> {
    try {
      await this.processBillingAdjustment(userId, adjustment, performedBy);
    } catch (error) {
      console.error('Adjust billing error:', error);
      throw error;
    }
  }

  // ================================================================================================
  // HELPER METHODS
  // ================================================================================================

  /**
   * Get current active subscription for user
   */
  private static async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Process plan change with prorated billing
   */
  private static async processPlanChange(
    subscription: UserSubscription,
    newPlan: SubscriptionPlan,
    effectiveDate?: Date,
    reason?: string,
    performedBy?: string
  ): Promise<PlanChangeResult> {
    const effective = effectiveDate || new Date();
    const currentEndDate = parseISO(subscription.current_period_end);
    const remainingDays = differenceInDays(currentEndDate, effective);

    if (remainingDays <= 0) {
      throw new Error('Cannot change plan for expired subscription period');
    }

    // Calculate prorated amount
    const proratedAmount = await this.calculatePlanChangeAmount(
      subscription.plan_type,
      newPlan,
      remainingDays,
      subscription.billing_cycle
    );

    const newPlanData = SUBSCRIPTION_PLANS[newPlan];
    const cycleData = BILLING_CYCLES[subscription.billing_cycle];
    const newBaseAmount = newPlanData.price * cycleData.multiplier;
    const newTotalAmount = newBaseAmount * (1 - cycleData.discount);

    // Update subscription
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: newPlan,
        base_amount: newBaseAmount,
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', subscription.user_id)
      .eq('id', subscription.id);

    if (updateError) {
      throw new Error(`Failed to update subscription plan: ${updateError.message}`);
    }

    // Log the action
    await this.logSubscriptionAction({
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscription_id: subscription.id,
      action_type: 'plan_change',
      action_data: {
        from_plan: subscription.plan_type,
        to_plan: newPlan,
        prorated_amount: proratedAmount,
        effective_date: effective.toISOString(),
        reason
      },
      performed_by: performedBy || 'system',
      performed_at: new Date().toISOString(),
      notes: reason,
      amount_change: proratedAmount,
      effective_date: effective.toISOString()
    });

    // Handle billing adjustment if needed
    if (Math.abs(proratedAmount) > 0.01) {
      const adjustment: BillingAdjustment = {
        type: proratedAmount > 0 ? 'debit' : 'credit',
        amount: Math.abs(proratedAmount),
        reason: `Plan change from ${subscription.plan_type} to ${newPlan}`,
        reference_id: subscription.id,
        effective_date: effective.toISOString()
      };

      await this.processBillingAdjustment(subscription.user_id, adjustment, performedBy);
    }

    return {
      prorated_amount: proratedAmount,
      effective_date: effective.toISOString(),
      new_billing_date: subscription.next_billing_date,
      additional_charge: proratedAmount > 0 ? proratedAmount : undefined,
      credit_applied: proratedAmount < 0 ? Math.abs(proratedAmount) : undefined
    };
  }

  /**
   * Process billing adjustment
   */
  private static async processBillingAdjustment(
    userId: string,
    adjustment: BillingAdjustment,
    performedBy?: string
  ): Promise<void> {
    // Insert billing adjustment record
    const { error: insertError } = await supabase
      .from('billing_adjustments')
      .insert({
        user_id: userId,
        type: adjustment.type,
        amount: adjustment.amount,
        reason: adjustment.reason,
        reference_id: adjustment.reference_id,
        effective_date: adjustment.effective_date,
        notes: adjustment.notes,
        performed_by: performedBy || 'system',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      throw new Error(`Failed to create billing adjustment: ${insertError.message}`);
    }
  }

  /**
   * Log subscription action for audit trail
   */
  private static async logSubscriptionAction(action: SubscriptionAction): Promise<void> {
    const { error } = await supabase
      .from('subscription_actions')
      .insert(action);

    if (error) {
      console.error('Failed to log subscription action:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Update rental orders for extension
   */
  private static async updateRentalOrdersForExtension(
    userId: string,
    newEndDate: Date
  ): Promise<void> {
    await supabase
      .from('rental_orders')
      .update({
        return_date: newEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed', 'delivered']);
  }

  /**
   * Update rental orders for pause/resume
   */
  private static async updateRentalOrdersForPause(
    userId: string,
    isPaused: boolean
  ): Promise<void> {
    const newStatus = isPaused ? 'paused' : 'active';
    
    await supabase
      .from('rental_orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('status', isPaused ? ['pending', 'confirmed', 'delivered'] : ['paused']);
  }

  // ================================================================================================
  // VALIDATION METHODS
  // ================================================================================================

  /**
   * Validate extension request
   */
  static async validateExtensionRequest(
    userId: string,
    days: number
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      if (days <= 0 || days > BUSINESS_RULES.MAX_EXTENSION_DAYS_PER_ACTION) {
        return {
          valid: false,
          reason: `Extension days must be between 1 and ${BUSINESS_RULES.MAX_EXTENSION_DAYS_PER_ACTION}`
        };
      }

      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        return { valid: false, reason: 'No active subscription found' };
      }

      const planLimits = SUBSCRIPTION_PLANS[subscription.plan_type];
      const totalExtensionAfter = subscription.extension_days + days;

      if (totalExtensionAfter > planLimits.max_extensions) {
        return {
          valid: false,
          reason: `Extension would exceed plan limit of ${planLimits.max_extensions} days`
        };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, reason: 'Validation error occurred' };
    }
  }

  /**
   * Validate plan change request
   */
  static async validatePlanChangeRequest(
    userId: string,
    newPlan: SubscriptionPlan
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        return { valid: false, reason: 'No active subscription found' };
      }

      if (subscription.plan_type === newPlan) {
        return { valid: false, reason: 'Cannot change to the same plan' };
      }

      if (!SUBSCRIPTION_PLANS[newPlan]) {
        return { valid: false, reason: 'Invalid plan selected' };
      }

      // Check cooldown period
      const { data: recentChanges } = await supabase
        .from('subscription_actions')
        .select('performed_at')
        .eq('subscription_id', subscription.id)
        .eq('action_type', 'plan_change')
        .gte('performed_at', addDays(new Date(), -BUSINESS_RULES.PLAN_CHANGE_COOLDOWN_DAYS).toISOString())
        .limit(1);

      if (recentChanges && recentChanges.length > 0) {
        return {
          valid: false,
          reason: `Plan changes are limited to once per ${BUSINESS_RULES.PLAN_CHANGE_COOLDOWN_DAYS} days`
        };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, reason: 'Validation error occurred' };
    }
  }

  // ================================================================================================
  // UTILITY METHODS
  // ================================================================================================

  /**
   * Get subscription statistics
   */
  static async getSubscriptionStats(userId: string): Promise<any> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      return null;
    }

    const planLimits = SUBSCRIPTION_PLANS[subscription.plan_type];
    const currentPeriodStart = parseISO(subscription.current_period_start);
    const currentPeriodEnd = parseISO(subscription.current_period_end);
    const now = new Date();

    const daysUsed = Math.max(0, differenceInDays(now, currentPeriodStart));
    const totalDays = differenceInDays(currentPeriodEnd, currentPeriodStart);
    const daysRemaining = Math.max(0, differenceInDays(currentPeriodEnd, now));

    return {
      subscription,
      plan_limits: planLimits,
      usage: {
        days_used: daysUsed,
        total_days: totalDays,
        days_remaining: daysRemaining,
        usage_percentage: Math.min(100, (daysUsed / totalDays) * 100)
      },
      limits: {
        extension_allowance: planLimits.max_extensions - subscription.extension_days,
        free_months_allowance: BUSINESS_RULES.MAX_FREE_MONTHS_PER_SUBSCRIPTION - subscription.free_months_added,
        pause_allowance: BUSINESS_RULES.MAX_PAUSE_COUNT_PER_YEAR - subscription.pause_count
      }
    };
  }
}

export default SubscriptionExtensionService; 
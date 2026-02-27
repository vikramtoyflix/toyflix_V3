import { supabase } from '@/integrations/supabase/client';
import { checkToyStock } from '@/utils/stockValidation';
import { UserEntitlement } from '@/types/subscription';
import { PlanService } from './planService';

export class EntitlementService {
  /**
   * Create initial entitlements for a new subscription
   */
  static async createInitialEntitlement(userId: string, subscriptionId: string, planId: string): Promise<void> {
    const plan = PlanService.getPlan(planId);
    if (!plan) throw new Error('Invalid plan ID');

    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    nextBillingDate.setDate(1);

    const entitlement = {
      user_id: userId,
      subscription_id: subscriptionId,
      current_month: currentMonth.toISOString(),
      standard_toys_remaining: plan.features.standardToys,
      big_toys_remaining: plan.features.bigToys,
      books_remaining: plan.features.books,
      premium_toys_remaining: plan.features.premiumToys || 0,
      value_cap_remaining: plan.features.valueCapMax,
      early_access: planId === 'gold-pack',
      reservation_enabled: planId === 'gold-pack',
      roller_coaster_delivered: false,
      coupe_ride_delivered: false,
      next_billing_date: nextBillingDate.toISOString()
    };

    const { error } = await supabase
      .from('user_entitlements')
      .insert(entitlement);

    if (error) {
      console.error('Error creating initial entitlement:', error);
      throw error;
    }

    console.log(`Initial entitlements created for user ${userId}`);
  }

  /**
   * Reset monthly entitlements (quotas and value caps)
   */
  static async resetMonthlyEntitlements(userId: string, subscriptionId: string, planId: string): Promise<void> {
    const plan = PlanService.getPlan(planId);
    if (!plan) throw new Error('Invalid plan ID');

    const currentMonth = new Date();
    currentMonth.setDate(1);

    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    nextBillingDate.setDate(1);

    const { error } = await supabase
      .from('user_entitlements')
      .update({
        current_month: currentMonth.toISOString(),
        standard_toys_remaining: plan.features.standardToys,
        big_toys_remaining: plan.features.bigToys,
        books_remaining: plan.features.books,
        premium_toys_remaining: plan.features.premiumToys || 0,
        value_cap_remaining: plan.features.valueCapMax,
        next_billing_date: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error('Error resetting monthly entitlements:', error);
      throw error;
    }

    console.log(`Monthly entitlements reset for user ${userId}`);
  }

  /**
   * Update entitlements when user changes plan
   */
  static async updateEntitlementsForPlanChange(userId: string, subscriptionId: string, newPlanId: string): Promise<void> {
    const newPlan = PlanService.getPlan(newPlanId);
    if (!newPlan) throw new Error('Invalid plan ID');

    const { error } = await supabase
      .from('user_entitlements' as any)
      .update({
        standard_toys_remaining: newPlan.features.standardToys,
        big_toys_remaining: newPlan.features.bigToys,
        books_remaining: newPlan.features.books,
        premium_toys_remaining: newPlan.features.premiumToys || 0,
        value_cap_remaining: newPlan.features.valueCapMax,
        early_access: newPlanId === 'gold-pack',
        reservation_enabled: newPlanId === 'gold-pack',
        roller_coaster_delivered: false,
        coupe_ride_delivered: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error('Error updating entitlements for plan change:', error);
      throw error;
    }

    // If upgrading to Gold Pack, assign perks
    if (newPlanId === 'gold-pack') {
      await this.enableGoldPackPerks(userId, subscriptionId);
    }

    console.log(`Entitlements updated for plan change to ${newPlanId}`);
  }

  /**
   * Enable Gold Pack specific perks
   */
  static async enableGoldPackPerks(userId: string, subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_entitlements' as any)
      .update({
        early_access: true,
        reservation_enabled: true,
        roller_coaster_delivered: false,
        coupe_ride_delivered: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error('Error enabling Gold Pack perks:', error);
      throw error;
    }

    console.log(`Gold Pack perks enabled for user ${userId}`);
  }

  /**
   * Revoke entitlements when subscription is cancelled
   */
  static async revokeEntitlements(userId: string, subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_entitlements' as any)
      .update({
        standard_toys_remaining: 0,
        big_toys_remaining: 0,
        books_remaining: 0,
        premium_toys_remaining: 0,
        value_cap_remaining: 0,
        early_access: false,
        reservation_enabled: false,
        roller_coaster_delivered: false,
        coupe_ride_delivered: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error('Error revoking entitlements:', error);
      throw error;
    }

    console.log(`Entitlements revoked for user ${userId}`);
  }

  /**
   * Get user's current entitlements
   */
  static async getUserEntitlements(userId: string): Promise<UserEntitlement | null> {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user entitlements:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      user_id: data.user_id,
      subscription_id: data.subscription_id,
      current_month: data.current_month,
      standard_toys_remaining: data.standard_toys_remaining,
      big_toys_remaining: data.big_toys_remaining,
      books_remaining: data.books_remaining,
      premium_toys_remaining: data.premium_toys_remaining,
      value_cap_remaining: data.value_cap_remaining,
      early_access: data.early_access,
      reservation_enabled: data.reservation_enabled,
      roller_coaster_delivered: data.roller_coaster_delivered,
      coupe_ride_delivered: data.coupe_ride_delivered,
      next_billing_date: data.next_billing_date,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  /**
   * Consume toy quota (when user selects toys) - Legacy method without stock validation
   */
  static async consumeToyQuota(userId: string, toyType: 'standard' | 'big' | 'premium' | 'books', quantity: number = 1): Promise<boolean> {
    console.warn('⚠️  Using legacy consumeToyQuota without stock validation. Consider using consumeToyQuotaWithStockValidation instead.');
    
    const entitlements = await this.getUserEntitlements(userId);
    if (!entitlements) return false;

    const quotaField = `${toyType}_remaining`;
    const currentQuota = entitlements[quotaField as keyof UserEntitlement] as number || 0;

    if (currentQuota < quantity) {
      console.log(`Insufficient quota for ${toyType}. Available: ${currentQuota}, Requested: ${quantity}`);
      return false;
    }

    const newQuota = currentQuota - quantity;
    const updateData = {
      [quotaField]: newQuota,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_entitlements' as any)
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error consuming toy quota:', error);
      return false;
    }

    console.log(`Consumed ${quantity} ${toyType} quota for user ${userId}`);
    return true;
  }

  /**
   * Consume toy quota with stock validation (when user selects specific toys)
   */
  static async consumeToyQuotaWithStockValidation(
    userId: string, 
    toyId: string, 
    toyType: 'standard' | 'big' | 'premium' | 'books', 
    quantity: number = 1
  ): Promise<{ success: boolean; message?: string; stockInfo?: any }> {
    try {
      // Step 1: Validate toy stock availability
      console.log(`🔍 Validating stock for toy ${toyId} before consuming quota...`);
      
      const stockInfo = await checkToyStock(toyId);
      
      if (!stockInfo) {
        return {
          success: false,
          message: "Toy not found or unavailable",
          stockInfo: null
        };
      }
      
      if (!stockInfo.isInStock) {
        return {
          success: false,
          message: `${stockInfo.name} is currently out of stock`,
          stockInfo
        };
      }
      
      if (stockInfo.available_quantity < quantity) {
        return {
          success: false,
          message: `Insufficient stock. Available: ${stockInfo.available_quantity}, Requested: ${quantity}`,
          stockInfo
        };
      }

      // Step 2: Check quota availability
      const entitlements = await this.getUserEntitlements(userId);
      if (!entitlements) {
        return {
          success: false,
          message: "User entitlements not found",
          stockInfo
        };
      }

      const quotaField = `${toyType}_remaining`;
      const currentQuota = entitlements[quotaField as keyof UserEntitlement] as number || 0;

      if (currentQuota < quantity) {
        return {
          success: false,
          message: `Insufficient quota for ${toyType}. Available: ${currentQuota}, Requested: ${quantity}`,
          stockInfo
        };
      }

      // Step 3: Consume quota (both stock and quota are available)
      const newQuota = currentQuota - quantity;
      const updateData = {
        [quotaField]: newQuota,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_entitlements' as any)
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('Error consuming toy quota:', error);
        return {
          success: false,
          message: "Failed to update quota",
          stockInfo
        };
      }

      console.log(`✅ Successfully consumed ${quantity} ${toyType} quota for user ${userId} for toy ${stockInfo.name}`);
      
      return {
        success: true,
        message: `Successfully selected ${stockInfo.name}`,
        stockInfo
      };

    } catch (error) {
      console.error('Error in consumeToyQuotaWithStockValidation:', error);
      return {
        success: false,
        message: "Error processing toy selection",
        stockInfo: null
      };
    }
  }

  /**
   * Consume value cap (when toys are assigned)
   */
  static async consumeValueCap(userId: string, amount: number): Promise<boolean> {
    const entitlements = await this.getUserEntitlements(userId);
    if (!entitlements) return false;

    if (entitlements.value_cap_remaining < amount) {
      console.log(`Insufficient value cap. Available: ${entitlements.value_cap_remaining}, Requested: ${amount}`);
      return false;
    }

    const { error } = await supabase
      .from('user_entitlements' as any)
      .update({
        value_cap_remaining: entitlements.value_cap_remaining - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error consuming value cap:', error);
      return false;
    }

    console.log(`Consumed ₹${amount} value cap for user ${userId}`);
    return true;
  }
}

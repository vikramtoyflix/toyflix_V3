import { createClient } from '@supabase/supabase-js';

class EntitlementsCreator {
  constructor() {
    this.supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';
    
    this.client = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  getPlanConfiguration(planId) {
    // Map the plan IDs to their entitlement values
    const planConfigs = {
      'basic': {
        standard_toys_remaining: 2,
        big_toys_remaining: 0,
        books_remaining: 1,
        premium_toys_remaining: 0,
        value_cap_remaining: 1500,
        early_access: false,
        reservation_enabled: false
      },
      'premium': {
        standard_toys_remaining: 3,
        big_toys_remaining: 1,
        books_remaining: 2,
        premium_toys_remaining: 0,
        value_cap_remaining: 3000,
        early_access: false,
        reservation_enabled: false
      },
      'family': {
        standard_toys_remaining: 4,
        big_toys_remaining: 1,
        books_remaining: 3,
        premium_toys_remaining: 1,
        value_cap_remaining: 5000,
        early_access: true,
        reservation_enabled: true
      },
      // Legacy plan mappings
      'discovery-delight': {
        standard_toys_remaining: 2,
        big_toys_remaining: 0,
        books_remaining: 1,
        premium_toys_remaining: 0,
        value_cap_remaining: 1500,
        early_access: false,
        reservation_enabled: false
      },
      'silver-pack': {
        standard_toys_remaining: 3,
        big_toys_remaining: 1,
        books_remaining: 2,
        premium_toys_remaining: 0,
        value_cap_remaining: 3000,
        early_access: false,
        reservation_enabled: false
      },
      'gold-pack': {
        standard_toys_remaining: 4,
        big_toys_remaining: 1,
        books_remaining: 3,
        premium_toys_remaining: 1,
        value_cap_remaining: 5000,
        early_access: true,
        reservation_enabled: true
      }
    };

    return planConfigs[planId] || planConfigs['basic']; // Default to basic if plan not found
  }

  async findSubscriptionsWithoutEntitlements() {
    this.log('Finding subscriptions without entitlements...');

    try {
      // Get all active subscriptions
      const { data: subscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('*')
        .in('status', ['active', 'paused']);

      if (subError) {
        this.log(`Error fetching subscriptions: ${subError.message}`, 'error');
        return [];
      }

      this.log(`Found ${subscriptions?.length || 0} active/paused subscriptions`);

      // Check which ones don't have entitlements
      const subscriptionsWithoutEntitlements = [];

      for (const subscription of subscriptions || []) {
        const { data: entitlements, error: entError } = await this.client
          .from('user_entitlements')
          .select('id')
          .eq('subscription_id', subscription.id);

        if (entError) {
          this.log(`Error checking entitlements for subscription ${subscription.id}: ${entError.message}`, 'warning');
          continue;
        }

        if (!entitlements || entitlements.length === 0) {
          subscriptionsWithoutEntitlements.push(subscription);
        }
      }

      this.log(`Found ${subscriptionsWithoutEntitlements.length} subscriptions without entitlements`, 'warning');
      return subscriptionsWithoutEntitlements;

    } catch (error) {
      this.log(`Error finding subscriptions: ${error.message}`, 'error');
      return [];
    }
  }

  async createEntitlement(subscription) {
    const planConfig = this.getPlanConfiguration(subscription.plan_id);
    
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month

    const nextBillingDate = new Date(subscription.current_period_end);

    const entitlementData = {
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      current_month: currentMonth.toISOString(),
      standard_toys_remaining: planConfig.standard_toys_remaining,
      big_toys_remaining: planConfig.big_toys_remaining,
      books_remaining: planConfig.books_remaining,
      premium_toys_remaining: planConfig.premium_toys_remaining,
      value_cap_remaining: planConfig.value_cap_remaining,
      early_access: planConfig.early_access,
      reservation_enabled: planConfig.reservation_enabled,
      roller_coaster_delivered: false,
      coupe_ride_delivered: false,
      toys_in_possession: false,
      selection_window_active: true,
      next_billing_date: nextBillingDate.toISOString()
    };

    const { data, error } = await this.client
      .from('user_entitlements')
      .insert(entitlementData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create entitlement: ${error.message}`);
    }

    return data;
  }

  async updateSubscriptionCycleDates(subscription) {
    // Set current cycle dates if they're missing
    const updates = {};
    
    if (!subscription.current_cycle_start) {
      updates.current_cycle_start = new Date().toISOString().split('T')[0]; // Today as YYYY-MM-DD
    }
    
    if (!subscription.current_cycle_end) {
      const cycleEnd = new Date();
      cycleEnd.setDate(cycleEnd.getDate() + 30);
      updates.current_cycle_end = cycleEnd.toISOString().split('T')[0]; // 30 days from now
    }
    
    if (!subscription.cycle_status) {
      updates.cycle_status = 'selection';
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await this.client
        .from('subscriptions')
        .update(updates)
        .eq('id', subscription.id);

      if (error) {
        this.log(`Warning: Could not update cycle dates for subscription ${subscription.id}: ${error.message}`, 'warning');
      } else {
        this.log(`Updated cycle dates for subscription ${subscription.id}`);
      }
    }
  }

  async run() {
    this.log('🔧 Creating Missing User Entitlements for Dashboard Integration');
    this.log('============================================================');

    try {
      // Find subscriptions without entitlements
      const subscriptionsWithoutEntitlements = await this.findSubscriptionsWithoutEntitlements();

      if (subscriptionsWithoutEntitlements.length === 0) {
        this.log('✅ All subscriptions already have entitlements!', 'success');
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const subscription of subscriptionsWithoutEntitlements) {
        try {
          this.log(`Creating entitlement for subscription ${subscription.id} (plan: ${subscription.plan_id})`);
          
          // Create the entitlement
          await this.createEntitlement(subscription);
          
          // Update cycle dates if needed
          await this.updateSubscriptionCycleDates(subscription);
          
          successCount++;
          this.log(`✅ Created entitlement for subscription ${subscription.id}`, 'success');

        } catch (error) {
          this.log(`❌ Failed to create entitlement for subscription ${subscription.id}: ${error.message}`, 'error');
          failedCount++;
        }
      }

      this.log('============================================================');
      this.log(`🎉 Entitlements creation completed!`, 'success');
      this.log(`   Created: ${successCount}`, 'success');
      this.log(`   Failed: ${failedCount}`, failedCount > 0 ? 'error' : 'info');

      if (successCount > 0) {
        this.log('');
        this.log('🚀 Dashboard should now display subscription data correctly!', 'success');
        this.log('   Users can now see:');
        this.log('   - Subscription overview with plan details');
        this.log('   - Cycle status and billing information');
        this.log('   - Toy quotas and value caps');
        this.log('   - Selection window status');
      }

    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
    }
  }
}

// Run the entitlements creator
const creator = new EntitlementsCreator();
creator.run().catch(console.error); 
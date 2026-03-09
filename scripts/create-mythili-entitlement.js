import { createClient } from '@supabase/supabase-js';

class MythiliEntitlementCreator {
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
      }
    };

    return planConfigs[planId] || planConfigs['basic'];
  }

  async createEntitlementForUser(phone) {
    this.log(`Creating entitlement for user: ${phone}`);

    try {
      // Get user
      const { data: users, error: userError } = await this.client
        .from('custom_users')
        .select('*')
        .eq('phone', phone);

      if (userError || !users || users.length === 0) {
        this.log(`User ${phone} not found`, 'error');
        return false;
      }

      const user = users[0];
      this.log(`User: ${user.first_name} ${user.last_name} (${user.email})`);
      this.log(`User ID: ${user.id}`);

      // Get subscription
      const { data: subscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (subError || !subscriptions || subscriptions.length === 0) {
        this.log(`No active subscription found for user`, 'error');
        return false;
      }

      const subscription = subscriptions[0];
      this.log(`Subscription: ${subscription.id} (${subscription.plan_id})`);

      // Check if entitlement already exists
      const { data: existingEntitlements, error: existingError } = await this.client
        .from('user_entitlements')
        .select('*')
        .eq('subscription_id', subscription.id);

      if (existingError) {
        this.log(`Error checking existing entitlements: ${existingError.message}`, 'error');
        return false;
      }

      if (existingEntitlements && existingEntitlements.length > 0) {
        this.log(`Entitlement already exists for this subscription`, 'warning');
        return true;
      }

      // Create entitlement
      const planConfig = this.getPlanConfiguration(subscription.plan_id);
      
      const currentMonth = new Date();
      currentMonth.setDate(1);

      const nextBillingDate = new Date(subscription.current_period_end);

      const entitlementData = {
        user_id: user.id,
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
        .select('*')
        .single();

      if (error) {
        this.log(`Error creating entitlement: ${error.message}`, 'error');
        return false;
      }

      this.log(`✅ Successfully created entitlement!`, 'success');
      this.log(`   ID: ${data.id}`);
      this.log(`   Standard Toys: ${data.standard_toys_remaining}`);
      this.log(`   Big Toys: ${data.big_toys_remaining}`);
      this.log(`   Books: ${data.books_remaining}`);
      this.log(`   Value Cap: ₹${data.value_cap_remaining}`);

      return true;

    } catch (error) {
      this.log(`Error creating entitlement: ${error.message}`, 'error');
      return false;
    }
  }

  async testDashboardAfterFix(phone) {
    this.log(`Testing dashboard after fix for: ${phone}`);

    try {
      // Get user
      const { data: users, error: userError } = await this.client
        .from('custom_users')
        .select('*')
        .eq('phone', phone);

      if (userError || !users || users.length === 0) {
        this.log(`User ${phone} not found`, 'error');
        return;
      }

      const user = users[0];

      // Test subscription service query
      const { data: subscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (subError) {
        this.log(`Error fetching subscriptions: ${subError.message}`, 'error');
        return;
      }

      this.log(`Active subscriptions: ${subscriptions?.length || 0}`);

      // Test entitlements
      const { data: entitlements, error: entError } = await this.client
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id);

      if (entError) {
        this.log(`Error fetching entitlements: ${entError.message}`, 'error');
        return;
      }

      this.log(`User entitlements: ${entitlements?.length || 0}`);
      
      if (entitlements && entitlements.length > 0) {
        const ent = entitlements[0];
        this.log(`✅ Dashboard should now show:`);
        this.log(`   - Plan: ${subscriptions?.[0]?.plan_id || 'Unknown'}`);
        this.log(`   - Standard Toys: ${ent.standard_toys_remaining}`);
        this.log(`   - Big Toys: ${ent.big_toys_remaining}`);
        this.log(`   - Books: ${ent.books_remaining}`);
        this.log(`   - Value Cap: ₹${ent.value_cap_remaining}`);
        this.log(`   - Selection Window: ${ent.selection_window_active ? 'Active' : 'Inactive'}`);
      }

    } catch (error) {
      this.log(`Error testing dashboard: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🔧 Creating Missing Entitlement for Mythili Ganga');
    this.log('============================================================');

    const success = await this.createEntitlementForUser('9980111432');

    if (success) {
      this.log('');
      this.log('Testing dashboard data after fix...');
      await this.testDashboardAfterFix('9980111432');
      
      this.log('');
      this.log('🎉 Entitlement created successfully!', 'success');
      this.log('');
      this.log('🚀 Dashboard should now work correctly for Mythili!', 'success');
      this.log('   Test at: http://localhost:8082');
      this.log('   Sign in with: 9980111432');
      this.log('');
      this.log('✅ Expected dashboard features:');
      this.log('   - Subscription overview with Basic plan');
      this.log('   - Toy quotas (2 standard, 0 big, 1 book)');
      this.log('   - Value cap of ₹1,500');
      this.log('   - Active selection window');
      this.log('   - Order history with Baybee R7 bike');
    } else {
      this.log('❌ Failed to create entitlement', 'error');
    }
  }
}

// Run the creator
const creator = new MythiliEntitlementCreator();
creator.run().catch(console.error); 
import { createClient } from '@supabase/supabase-js';

class DashboardIntegrationFixer {
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

  async fixSubscriptionStatuses() {
    this.log('Fixing subscription statuses from pending to active...');

    try {
      // Update all 'pending' subscriptions to 'active' for migrated users
      const { data, error } = await this.client
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('status', 'pending')
        .select('id, user_id');

      if (error) {
        this.log(`Error updating subscription statuses: ${error.message}`, 'error');
        return false;
      }

      this.log(`Updated ${data?.length || 0} subscriptions from 'pending' to 'active'`, 'success');
      return true;

    } catch (error) {
      this.log(`Error fixing subscription statuses: ${error.message}`, 'error');
      return false;
    }
  }

  async updateUserSubscriptionFlags() {
    this.log('Updating user subscription flags in custom_users table...');

    try {
      // Get all users with active subscriptions
      const { data: activeSubscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('status', 'active');

      if (subError) {
        this.log(`Error fetching active subscriptions: ${subError.message}`, 'error');
        return false;
      }

      let updateCount = 0;
      for (const subscription of activeSubscriptions || []) {
        const { error: updateError } = await this.client
          .from('custom_users')
          .update({
            subscription_active: true,
            subscription_plan: subscription.plan_id
          })
          .eq('id', subscription.user_id);

        if (updateError) {
          this.log(`Error updating user ${subscription.user_id}: ${updateError.message}`, 'warning');
        } else {
          updateCount++;
        }
      }

      this.log(`Updated subscription flags for ${updateCount} users`, 'success');
      return true;

    } catch (error) {
      this.log(`Error updating user subscription flags: ${error.message}`, 'error');
      return false;
    }
  }

  async fixCycleStatusFunction() {
    this.log('Fixing cycle status function...');

    try {
      const functionSQL = `
        CREATE OR REPLACE FUNCTION public.get_user_cycle_status(user_id_param UUID)
        RETURNS TABLE (
            has_active_subscription BOOLEAN,
            cycle_status cycle_status_enum,
            toys_in_possession BOOLEAN,
            selection_window_active BOOLEAN,
            days_in_current_cycle INTEGER,
            plan_id TEXT
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            sub_record RECORD;
            cycle_days INTEGER;
        BEGIN
            -- Get subscription data
            SELECT s.*, ue.toys_in_possession, ue.selection_window_active
            INTO sub_record
            FROM subscriptions s
            LEFT JOIN user_entitlements ue ON ue.subscription_id = s.id
            WHERE s.user_id = user_id_param 
            AND s.status IN ('active', 'paused')
            LIMIT 1;
            
            -- If subscription found
            IF FOUND THEN
                -- Calculate days in current cycle
                IF sub_record.current_cycle_start IS NOT NULL THEN
                    cycle_days := EXTRACT(DAY FROM (CURRENT_DATE - sub_record.current_cycle_start::date))::INTEGER;
                ELSE
                    cycle_days := 0;
                END IF;
                
                RETURN QUERY
                SELECT 
                    TRUE as has_active_subscription,
                    COALESCE(sub_record.cycle_status, 'selection'::cycle_status_enum) as cycle_status,
                    COALESCE(sub_record.toys_in_possession, FALSE) as toys_in_possession,
                    COALESCE(sub_record.selection_window_active, TRUE) as selection_window_active,
                    cycle_days as days_in_current_cycle,
                    sub_record.plan_id;
            ELSE
                -- No active subscription found
                RETURN QUERY
                SELECT 
                    FALSE as has_active_subscription,
                    'selection'::cycle_status_enum as cycle_status,
                    FALSE as toys_in_possession,
                    FALSE as selection_window_active,
                    0 as days_in_current_cycle,
                    NULL::TEXT as plan_id;
            END IF;
        END;
        $$;
      `;

      // Execute the function creation using a raw SQL query
      const { error } = await this.client.rpc('sql', { query: functionSQL });

      if (error) {
        this.log(`Error creating cycle status function: ${error.message}`, 'error');
        return false;
      }

      this.log('Cycle status function created successfully', 'success');
      return true;

    } catch (error) {
      this.log(`Error fixing cycle status function: ${error.message}`, 'error');
      return false;
    }
  }

  async testSpecificUser(phone) {
    this.log(`Testing dashboard data for ${phone}...`);

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
      this.log(`Subscription Active: ${user.subscription_active}, Plan: ${user.subscription_plan}`);

      // Get subscription
      const { data: subscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subError) {
        this.log(`Error fetching subscriptions: ${subError.message}`, 'error');
        return false;
      }

      this.log(`Subscriptions: ${subscriptions?.length || 0}`);
      if (subscriptions && subscriptions.length > 0) {
        const sub = subscriptions[0];
        this.log(`  Plan: ${sub.plan_id}, Status: ${sub.status}`);
        this.log(`  Current Period End: ${sub.current_period_end}`);
        this.log(`  Cycle Start: ${sub.current_cycle_start}, End: ${sub.current_cycle_end}`);
      }

      // Get entitlements
      const { data: entitlements, error: entError } = await this.client
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id);

      if (entError) {
        this.log(`Error fetching entitlements: ${entError.message}`, 'error');
        return false;
      }

      this.log(`Entitlements: ${entitlements?.length || 0}`);
      if (entitlements && entitlements.length > 0) {
        const ent = entitlements[0];
        this.log(`  Standard Toys: ${ent.standard_toys_remaining}, Big Toys: ${ent.big_toys_remaining}`);
        this.log(`  Books: ${ent.books_remaining}, Value Cap: ₹${ent.value_cap_remaining}`);
        this.log(`  Toys in Possession: ${ent.toys_in_possession}, Selection Active: ${ent.selection_window_active}`);
      }

      // Test cycle status
      const { data: cycleStatus, error: cycleError } = await this.client.rpc('get_user_cycle_status', {
        user_id_param: user.id
      });

      if (cycleError) {
        this.log(`Cycle status error: ${cycleError.message}`, 'error');
      } else if (cycleStatus && cycleStatus.length > 0) {
        const status = cycleStatus[0];
        this.log(`Cycle Status: ${status.cycle_status}, Days: ${status.days_in_current_cycle}`);
        this.log(`Has Active Sub: ${status.has_active_subscription}, Selection Active: ${status.selection_window_active}`);
      }

      // Get orders
      const { data: orders, error: orderError } = await this.client
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            toy:toys (
              name
            )
          )
        `)
        .eq('user_id', user.id);

      if (orderError) {
        this.log(`Error fetching orders: ${orderError.message}`, 'error');
      } else {
        this.log(`Orders: ${orders?.length || 0}`);
        if (orders && orders.length > 0) {
          orders.forEach((order, index) => {
            this.log(`  Order ${index + 1}: ₹${order.total_amount} (${order.status}) - ${order.order_items?.length || 0} items`);
          });
        }
      }

      return true;

    } catch (error) {
      this.log(`Error testing user ${phone}: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🔧 Fixing Dashboard Integration Issues');
    this.log('============================================================');

    let allSuccess = true;

    // Step 1: Fix subscription statuses
    this.log('Step 1: Fixing subscription statuses...');
    const statusFixed = await this.fixSubscriptionStatuses();
    allSuccess = allSuccess && statusFixed;

    // Step 2: Update user subscription flags
    this.log('Step 2: Updating user subscription flags...');
    const flagsFixed = await this.updateUserSubscriptionFlags();
    allSuccess = allSuccess && flagsFixed;

    // Step 3: Fix cycle status function
    this.log('Step 3: Fixing cycle status function...');
    const cycleFixed = await this.fixCycleStatusFunction();
    allSuccess = allSuccess && cycleFixed;

    this.log('============================================================');

    if (allSuccess) {
      this.log('🎉 All dashboard integration issues fixed!', 'success');
      
      // Test with Mythili's account
      this.log('');
      this.log('Testing with Mythili Ganga account...');
      await this.testSpecificUser('9980111432');
      
      this.log('');
      this.log('🚀 Dashboard should now work correctly!', 'success');
      this.log('   Users can now:');
      this.log('   ✅ See subscription overview with plan details');
      this.log('   ✅ View cycle status and billing information');
      this.log('   ✅ Access toy quotas and value caps');
      this.log('   ✅ Check selection window status');
      this.log('   ✅ View current rentals and order history');
      this.log('');
      this.log('🔗 Test the dashboard at: http://localhost:8082');
      this.log('   Sign in with phone: 9980111432');
    } else {
      this.log('❌ Some issues could not be fixed. Check the logs above.', 'error');
    }
  }
}

// Run the fixer
const fixer = new DashboardIntegrationFixer();
fixer.run().catch(console.error); 
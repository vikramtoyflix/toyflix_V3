import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class SubscriptionsIntegration {
  constructor() {
    this.client = null;
    this.userMapping = new Map(); // wp_customer_id -> live_user_id
  }

  async connect() {
    this.client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await this.client.connect();
    console.log('✅ Connected to database');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  async buildUserMapping() {
    this.log('Building user mapping for subscriptions...');
    
    const mappingResult = await this.client.query(`
      SELECT 
        us.wp_user_id,
        cu.id as live_user_id,
        cu.phone,
        cu.email
      FROM migration_staging.users_staging us
      JOIN custom_users cu ON cu.phone = us.phone
      WHERE us.migration_status = 'integrated'
      AND us.wp_user_id IS NOT NULL
    `);

    mappingResult.rows.forEach(row => {
      this.userMapping.set(row.wp_user_id, row.live_user_id);
    });

    this.log(`User mapping built: ${this.userMapping.size} WordPress users mapped to live users`, 'success');
    return this.userMapping.size;
  }

  mapSubscriptionStatus(wpStatus) {
    const statusMapping = {
      'wc-active': 'active',
      'wc-processing': 'active',
      'wc-pending': 'pending',
      'wc-on-hold': 'paused',
      'wc-cancelled': 'cancelled',
      'wc-expired': 'expired',
      'wc-pending-cancel': 'cancelled'
    };
    return statusMapping[wpStatus] || 'pending';
  }

  mapPlanId(planType) {
    const planMapping = {
      'monthly': 'basic',
      'quarterly': 'premium', 
      'yearly': 'family',
      'basic': 'basic',
      'premium': 'premium',
      'family': 'family'
    };
    return planMapping[planType] || 'basic';
  }

  async getSubscriptionsToIntegrate() {
    this.log('Getting subscriptions ready for integration...');

    const subscriptionsResult = await this.client.query(`
      SELECT 
        ss.*,
        us.phone,
        us.email
      FROM migration_staging.subscriptions_staging ss
      JOIN migration_staging.users_staging us ON ss.wp_customer_id = us.wp_user_id
      WHERE ss.migration_status = 'pending'
      AND us.migration_status = 'integrated'
      AND ss.wp_customer_id IS NOT NULL
      ORDER BY ss.wp_created_at DESC
      LIMIT 50
    `);

    this.log(`Found ${subscriptionsResult.rows.length} subscriptions ready for integration`);
    return subscriptionsResult.rows;
  }

  async integrateSubscriptions() {
    this.log('Starting subscriptions integration...');

    const subscriptionsToIntegrate = await this.getSubscriptionsToIntegrate();

    if (subscriptionsToIntegrate.length === 0) {
      this.log('No subscriptions found ready for integration');
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const stagingSubscription of subscriptionsToIntegrate) {
      try {
        const liveUserId = this.userMapping.get(stagingSubscription.wp_customer_id);
        
        if (!liveUserId) {
          this.log(`Subscription ${stagingSubscription.id}: No live user found for WP customer ${stagingSubscription.wp_customer_id}`, 'warning');
          failedCount++;
          continue;
        }

        // Check if subscription already exists
        const existingResult = await this.client.query(
          'SELECT id FROM subscriptions WHERE id = $1',
          [stagingSubscription.id]
        );

        if (existingResult.rows.length > 0) {
          this.log(`Subscription ${stagingSubscription.id}: Already exists, skipping`, 'warning');
          continue;
        }

        // Calculate dates
        const startDate = stagingSubscription.start_date || stagingSubscription.wp_created_at;
        let endDate = stagingSubscription.end_date;
        
        // For active subscriptions without end date, set a future end date (1 year from start)
        if (!endDate) {
          const start = new Date(startDate);
          endDate = new Date(start);
          endDate.setFullYear(start.getFullYear() + 1);
        }
        
        // For active subscriptions, set current period
        const currentPeriodStart = startDate;
        let currentPeriodEnd = endDate;
        
        if (stagingSubscription.billing_cycle) {
          // Calculate current period end based on billing cycle (assuming monthly)
          const start = new Date(startDate);
          currentPeriodEnd = new Date(start);
          currentPeriodEnd.setMonth(start.getMonth() + stagingSubscription.billing_cycle);
        }

        // Insert subscription with proper schema mapping
        await this.client.query(`
          INSERT INTO subscriptions (
            id,
            user_id,
            plan_id,
            status,
            start_date,
            end_date,
            current_period_start,
            current_period_end,
            auto_renew,
            created_at,
            updated_at,
            age_group,
            current_selection_step,
            pause_balance,
            cycle_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          stagingSubscription.id,
          liveUserId,
          this.mapPlanId(stagingSubscription.plan_type),
          this.mapSubscriptionStatus(stagingSubscription.wp_status),
          startDate,
          endDate,
          currentPeriodStart,
          currentPeriodEnd,
          true, // auto_renew default
          stagingSubscription.wp_created_at,
          stagingSubscription.wp_updated_at,
          'all', // age_group default
          1, // current_selection_step default
          0, // pause_balance default
          'selection' // cycle_status default
        ]);

        // Mark as completed in staging
        await this.client.query(
          'UPDATE migration_staging.subscriptions_staging SET migration_status = $1, integrated_subscription_id = $2 WHERE id = $3',
          ['completed', stagingSubscription.id, stagingSubscription.id]
        );

        // Update user subscription status
        await this.client.query(`
          UPDATE custom_users 
          SET 
            subscription_active = $1,
            subscription_plan = $2
          WHERE id = $3
        `, [
          this.mapSubscriptionStatus(stagingSubscription.wp_status) === 'active',
          this.mapPlanId(stagingSubscription.plan_type),
          liveUserId
        ]);

        successCount++;
        this.log(`Subscription integrated: ${stagingSubscription.id} (${stagingSubscription.plan_type}) for user ${stagingSubscription.phone}`);

      } catch (error) {
        this.log(`Failed to integrate subscription ${stagingSubscription.id}: ${error.message}`, 'error');
        failedCount++;
      }
    }

    this.log(`Subscriptions integration completed: ${successCount} success, ${failedCount} failed`, 'success');
    return { success: successCount, failed: failedCount };
  }

  async testSpecificUser(phone) {
    this.log(`Testing subscriptions for user: ${phone}`);

    // Find user in live database
    const userResult = await this.client.query(
      'SELECT id, first_name, last_name, email, subscription_active, subscription_plan FROM custom_users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      this.log(`User not found: ${phone}`, 'error');
      return;
    }

    const user = userResult.rows[0];
    this.log(`Found user: ${user.first_name} ${user.last_name} (${user.email})`);
    this.log(`User subscription: ${user.subscription_active ? 'Active' : 'Inactive'} (${user.subscription_plan || 'None'})`);

    // Check subscriptions in live database
    const subscriptionsResult = await this.client.query(
      'SELECT id, plan_id, status, start_date, end_date, created_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    this.log(`Live subscriptions for this user: ${subscriptionsResult.rows.length}`);
    subscriptionsResult.rows.forEach((subscription, index) => {
      this.log(`  ${index + 1}. Subscription ${subscription.id.slice(0, 8)}... - ${subscription.plan_id} (${subscription.status}) - ${subscription.created_at}`);
    });
  }

  async run() {
    try {
      await this.connect();

      // Build user mapping
      const mappedUsers = await this.buildUserMapping();
      if (mappedUsers === 0) {
        this.log('No user mappings found. Cannot proceed with integration.', 'error');
        return;
      }

      // Integrate subscriptions
      const subscriptionResults = await this.integrateSubscriptions();

      // Test specific users
      console.log('\n' + '='.repeat(60));
      this.log('Testing specific users...');
      
      const testUsers = ['9980111432', '8147296971', '+919744785158'];
      for (const phone of testUsers) {
        await this.testSpecificUser(phone);
        console.log('');
      }

      // Final summary
      this.log('🎉 Integration completed!', 'success');
      this.log(`📊 Summary:`);
      this.log(`   Users mapped: ${mappedUsers}`);
      this.log(`   Subscriptions: ${subscriptionResults.success} success, ${subscriptionResults.failed} failed`);

      // Check final counts
      const finalCounts = await this.client.query(`
        SELECT 
          (SELECT COUNT(*) FROM subscriptions) as live_subscriptions,
          (SELECT COUNT(*) FROM migration_staging.subscriptions_staging WHERE migration_status = 'pending') as pending_subscriptions,
          (SELECT COUNT(*) FROM migration_staging.subscriptions_staging WHERE migration_status = 'completed') as completed_subscriptions,
          (SELECT COUNT(*) FROM custom_users WHERE subscription_active = true) as active_users
      `);

      const counts = finalCounts.rows[0];
      this.log(`📈 Final database state:`);
      this.log(`   Live subscriptions: ${counts.live_subscriptions}`);
      this.log(`   Completed staging subscriptions: ${counts.completed_subscriptions}`);
      this.log(`   Remaining staging subscriptions: ${counts.pending_subscriptions}`);
      this.log(`   Users with active subscriptions: ${counts.active_users}`);

    } catch (error) {
      this.log(`Integration failed: ${error.message}`, 'error');
    } finally {
      await this.disconnect();
    }
  }
}

// Run the integration
const integration = new SubscriptionsIntegration();
integration.run().catch(console.error); 
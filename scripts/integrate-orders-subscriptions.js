import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class OrderSubscriptionIntegration {
  constructor() {
    this.client = null;
    this.userMapping = new Map(); // staging_user_id -> live_user_id
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
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async buildUserMapping() {
    this.log('Building user mapping between staging and live users...');
    
    const mappingResult = await this.client.query(`
      SELECT 
        us.id as staging_user_id,
        cu.id as live_user_id,
        us.phone
      FROM migration_staging.users_staging us
      JOIN custom_users cu ON cu.phone = us.phone
      WHERE us.migration_status = 'integrated'
    `);

    mappingResult.rows.forEach(row => {
      this.userMapping.set(row.staging_user_id, row.live_user_id);
    });

    this.log(`User mapping built: ${this.userMapping.size} users mapped`, 'success');
    return this.userMapping.size;
  }

  async integrateSubscriptions() {
    this.log('Starting subscriptions integration...');

    // Get pending subscriptions from staging
    const stagingSubscriptions = await this.client.query(`
      SELECT * FROM migration_staging.subscriptions_staging 
      WHERE migration_status = 'pending'
      ORDER BY created_at ASC
    `);

    if (stagingSubscriptions.rows.length === 0) {
      this.log('No pending subscriptions to integrate');
      return { success: 0, failed: 0 };
    }

    this.log(`Found ${stagingSubscriptions.rows.length} subscriptions to integrate`);

    let successCount = 0;
    let failedCount = 0;

    for (const stagingSub of stagingSubscriptions.rows) {
      try {
        const liveUserId = this.userMapping.get(stagingSub.staged_user_id);
        
        if (!liveUserId) {
          this.log(`Subscription ${stagingSub.id}: No live user found for staging user ${stagingSub.staged_user_id}`, 'warning');
          failedCount++;
          continue;
        }

        // Check if subscription already exists
        const existingResult = await this.client.query(
          'SELECT id FROM subscriptions WHERE user_id = $1 AND plan_type = $2 AND start_date = $3',
          [liveUserId, stagingSub.plan_type, stagingSub.start_date]
        );

        if (existingResult.rows.length > 0) {
          this.log(`Subscription ${stagingSub.id}: Already exists, skipping`, 'warning');
          continue;
        }

        // Insert subscription
        await this.client.query(`
          INSERT INTO subscriptions (
            id, user_id, plan_type, status, start_date, end_date, 
            next_billing_date, billing_cycle, total_amount, is_active, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          stagingSub.id,
          liveUserId,
          stagingSub.plan_type,
          stagingSub.status,
          stagingSub.start_date,
          stagingSub.end_date,
          stagingSub.next_billing_date,
          stagingSub.billing_cycle,
          stagingSub.total_amount,
          stagingSub.is_active,
          stagingSub.created_at,
          stagingSub.updated_at
        ]);

        // Update user subscription status if this is an active subscription
        if (stagingSub.is_active) {
          await this.client.query(`
            UPDATE custom_users 
            SET subscription_active = true, subscription_plan = $1
            WHERE id = $2
          `, [stagingSub.plan_type, liveUserId]);
        }

        // Mark as completed in staging
        await this.client.query(
          'UPDATE migration_staging.subscriptions_staging SET migration_status = $1 WHERE id = $2',
          ['completed', stagingSub.id]
        );

        successCount++;
        this.log(`Subscription integrated: ${stagingSub.plan_type} for user ${liveUserId}`);

      } catch (error) {
        this.log(`Failed to integrate subscription ${stagingSub.id}: ${error.message}`, 'error');
        failedCount++;
      }
    }

    this.log(`Subscriptions integration completed: ${successCount} success, ${failedCount} failed`, 'success');
    return { success: successCount, failed: failedCount };
  }

  async integrateOrders() {
    this.log('Starting orders integration...');

    // Get pending orders from staging
    const stagingOrders = await this.client.query(`
      SELECT * FROM migration_staging.orders_staging 
      WHERE migration_status = 'pending'
      ORDER BY created_at ASC
    `);

    if (stagingOrders.rows.length === 0) {
      this.log('No pending orders to integrate');
      return { success: 0, failed: 0 };
    }

    this.log(`Found ${stagingOrders.rows.length} orders to integrate`);

    let successCount = 0;
    let failedCount = 0;

    for (const stagingOrder of stagingOrders.rows) {
      try {
        const liveUserId = this.userMapping.get(stagingOrder.staged_user_id);
        
        if (!liveUserId) {
          this.log(`Order ${stagingOrder.id}: No live user found for staging user ${stagingOrder.staged_user_id}`, 'warning');
          failedCount++;
          continue;
        }

        // Check if order already exists
        const existingResult = await this.client.query(
          'SELECT id FROM orders WHERE id = $1',
          [stagingOrder.id]
        );

        if (existingResult.rows.length > 0) {
          this.log(`Order ${stagingOrder.id}: Already exists, skipping`, 'warning');
          continue;
        }

        // Insert order
        await this.client.query(`
          INSERT INTO orders (
            id, user_id, total_amount, status, shipping_address, 
            rental_start_date, rental_end_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          stagingOrder.id,
          liveUserId,
          stagingOrder.total_amount,
          stagingOrder.status,
          stagingOrder.shipping_address,
          stagingOrder.rental_start_date,
          stagingOrder.rental_end_date,
          stagingOrder.created_at,
          stagingOrder.updated_at
        ]);

        // Get order items for this order
        const orderItems = await this.client.query(
          'SELECT * FROM migration_staging.order_items_staging WHERE order_id = $1',
          [stagingOrder.id]
        );

        // Insert order items
        for (const item of orderItems.rows) {
          // Only insert if toy_id exists (mapped products)
          if (item.toy_id) {
            await this.client.query(`
              INSERT INTO order_items (
                id, order_id, toy_id, quantity, rental_price, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              item.id,
              stagingOrder.id,
              item.toy_id,
              item.quantity,
              item.rental_price,
              item.created_at
            ]);
          }
        }

        // Mark as completed in staging
        await this.client.query(
          'UPDATE migration_staging.orders_staging SET migration_status = $1 WHERE id = $2',
          ['completed', stagingOrder.id]
        );

        successCount++;
        this.log(`Order integrated: ${stagingOrder.id} (₹${stagingOrder.total_amount}) with ${orderItems.rows.length} items`);

      } catch (error) {
        this.log(`Failed to integrate order ${stagingOrder.id}: ${error.message}`, 'error');
        failedCount++;
      }
    }

    this.log(`Orders integration completed: ${successCount} success, ${failedCount} failed`, 'success');
    return { success: successCount, failed: failedCount };
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

      // Integrate subscriptions first (affects user subscription status)
      const subscriptionResults = await this.integrateSubscriptions();

      // Integrate orders
      const orderResults = await this.integrateOrders();

      // Final summary
      this.log('🎉 Integration completed!', 'success');
      this.log(`📊 Summary:`, 'info');
      this.log(`   Users mapped: ${mappedUsers}`);
      this.log(`   Subscriptions: ${subscriptionResults.success} success, ${subscriptionResults.failed} failed`);
      this.log(`   Orders: ${orderResults.success} success, ${orderResults.failed} failed`);

      // Check final counts
      const finalCounts = await this.client.query(`
        SELECT 
          (SELECT COUNT(*) FROM subscriptions) as live_subscriptions,
          (SELECT COUNT(*) FROM orders) as live_orders,
          (SELECT COUNT(*) FROM order_items) as live_order_items,
          (SELECT COUNT(*) FROM migration_staging.subscriptions_staging WHERE migration_status = 'pending') as pending_subscriptions,
          (SELECT COUNT(*) FROM migration_staging.orders_staging WHERE migration_status = 'pending') as pending_orders
      `);

      const counts = finalCounts.rows[0];
      this.log(`📈 Final database state:`);
      this.log(`   Live subscriptions: ${counts.live_subscriptions}`);
      this.log(`   Live orders: ${counts.live_orders}`);
      this.log(`   Live order items: ${counts.live_order_items}`);
      this.log(`   Remaining staging subscriptions: ${counts.pending_subscriptions}`);
      this.log(`   Remaining staging orders: ${counts.pending_orders}`);

    } catch (error) {
      this.log(`Integration failed: ${error.message}`, 'error');
    } finally {
      await this.disconnect();
    }
  }
}

// Run the integration
const integration = new OrderSubscriptionIntegration();
integration.run().catch(console.error); 
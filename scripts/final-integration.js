import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class FinalIntegration {
  constructor() {
    this.client = null;
    this.integrationLog = [];
    this.batchName = `integration_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.integrationLog.push(logEntry);
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} ${message}`);
  }

  async connect() {
    this.client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await this.client.connect();
    this.log('Connected to database', 'success');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.log('Disconnected from database');
    }
  }

  async validateStagingData() {
    this.log('🔍 Validating staging data before integration...');

    // Check staging data counts
    const userCount = await this.client.query('SELECT COUNT(*) FROM migration_staging.users_staging WHERE migration_status = \'pending\'');
    const subscriptionCount = await this.client.query('SELECT COUNT(*) FROM migration_staging.subscriptions_staging WHERE migration_status = \'pending\'');
    const orderCount = await this.client.query('SELECT COUNT(*) FROM migration_staging.orders_staging WHERE migration_status = \'pending\'');
    const orderItemCount = await this.client.query('SELECT COUNT(*) FROM migration_staging.order_items_staging WHERE migration_status = \'pending\'');

    // Check product mappings
    const mappedProducts = await this.client.query(`
      SELECT COUNT(*) FROM migration_staging.product_toy_mapping 
      WHERE final_toy_id IS NOT NULL OR mapping_status IN ('subscription_plan', 'needs_new_toy')
    `);
    const totalProducts = await this.client.query('SELECT COUNT(*) FROM migration_staging.product_toy_mapping');

    this.log(`📊 Staging Data Summary:`);
    this.log(`   Users ready for integration: ${userCount.rows[0].count}`);
    this.log(`   Subscriptions ready: ${subscriptionCount.rows[0].count}`);
    this.log(`   Orders ready: ${orderCount.rows[0].count}`);
    this.log(`   Order items ready: ${orderItemCount.rows[0].count}`);
    this.log(`   Product mappings: ${mappedProducts.rows[0].count}/${totalProducts.rows[0].count}`);

    // Validate critical relationships
    const orphanedOrders = await this.client.query(`
      SELECT COUNT(*) FROM migration_staging.orders_staging o
      WHERE o.staged_user_id IS NULL AND o.migration_status = 'pending'
    `);

    const orphanedSubscriptions = await this.client.query(`
      SELECT COUNT(*) FROM migration_staging.subscriptions_staging s
      WHERE s.staged_user_id IS NULL AND s.migration_status = 'pending'
    `);

    if (orphanedOrders.rows[0].count > 0) {
      this.log(`⚠️ Warning: ${orphanedOrders.rows[0].count} orders without user references`, 'warning');
    }

    if (orphanedSubscriptions.rows[0].count > 0) {
      this.log(`⚠️ Warning: ${orphanedSubscriptions.rows[0].count} subscriptions without user references`, 'warning');
    }

    return {
      users: parseInt(userCount.rows[0].count),
      subscriptions: parseInt(subscriptionCount.rows[0].count),
      orders: parseInt(orderCount.rows[0].count),
      orderItems: parseInt(orderItemCount.rows[0].count),
      orphanedOrders: parseInt(orphanedOrders.rows[0].count),
      orphanedSubscriptions: parseInt(orphanedSubscriptions.rows[0].count)
    };
  }

  async integrateUsers(dryRun = false) {
    this.log('👥 Integrating users from staging to live tables...');

    const stagingUsers = await this.client.query(`
      SELECT * FROM migration_staging.users_staging 
      WHERE migration_status = 'pending'
      ORDER BY wp_created_at
    `);

    let successCount = 0;
    let errorCount = 0;

    for (const user of stagingUsers.rows) {
      try {
        if (!dryRun) {
          // Check if user already exists (by phone)
          const existingUser = await this.client.query(
            'SELECT id FROM custom_users WHERE phone = $1',
            [user.phone]
          );

          if (existingUser.rows.length > 0) {
            this.log(`⚠️ User with phone ${user.phone} already exists, skipping`, 'warning');
            continue;
          }

          // Insert user into live table (mapping to actual schema)
          await this.client.query(`
            INSERT INTO custom_users (
              id, first_name, last_name, phone, email, address_line1, address_line2, 
              city, state, zip_code, subscription_active, subscription_plan,
              created_at, updated_at, is_active, role
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
          `, [
            user.id, 
            user.name ? user.name.split(' ')[0] : 'Customer', // first_name
            user.name ? user.name.split(' ').slice(1).join(' ') || user.name.split(' ')[0] : '', // last_name
            user.phone, 
            user.email, 
            user.address_line_1, // address_line1
            user.address_line_2, // address_line2
            user.city, 
            user.state, 
            user.postal_code, // zip_code
            user.subscription_status === 'active', // subscription_active (boolean)
            user.subscription_status === 'active' ? 'monthly' : null, // subscription_plan
            user.wp_created_at, 
            user.wp_updated_at, 
            true, // is_active
            'customer' // role
          ]);

          // Mark as integrated in staging
          await this.client.query(
            'UPDATE migration_staging.users_staging SET migration_status = \'integrated\', updated_at = NOW() WHERE id = $1',
            [user.id]
          );
        }

        successCount++;
      } catch (error) {
        this.log(`❌ Failed to integrate user ${user.phone}: ${error.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Users integration: ${successCount} successful, ${errorCount} failed`, successCount > 0 ? 'success' : 'warning');
    return { successCount, errorCount };
  }

  async integrateSubscriptions(dryRun = false) {
    this.log('🔄 Integrating subscriptions from staging to live tables...');

    const stagingSubscriptions = await this.client.query(`
      SELECT s.*, u.id as live_user_id 
      FROM migration_staging.subscriptions_staging s
      JOIN custom_users u ON u.phone = (
        SELECT phone FROM migration_staging.users_staging us 
        WHERE us.id = s.staged_user_id
      )
      WHERE s.migration_status = 'pending'
      ORDER BY s.wp_created_at
    `);

    let successCount = 0;
    let errorCount = 0;

    for (const subscription of stagingSubscriptions.rows) {
      try {
        if (!dryRun) {
          // Generate new UUID for subscription
          const subscriptionId = await this.client.query('SELECT gen_random_uuid() as id');
          const newId = subscriptionId.rows[0].id;

          // Insert subscription into live table
          await this.client.query(`
            INSERT INTO subscriptions (
              id, user_id, plan_type, status, total_amount, billing_cycle,
              start_date, end_date, next_billing_date, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
          `, [
            newId, subscription.live_user_id, subscription.plan_type, 
            subscription.status, subscription.total_amount, subscription.billing_cycle,
            subscription.start_date, subscription.end_date, subscription.next_billing_date,
            subscription.wp_created_at, subscription.wp_updated_at
          ]);

          // Mark as integrated in staging
          await this.client.query(
            'UPDATE migration_staging.subscriptions_staging SET migration_status = \'integrated\', updated_at = NOW() WHERE id = $1',
            [subscription.id]
          );
        }

        successCount++;
      } catch (error) {
        this.log(`❌ Failed to integrate subscription ${subscription.wp_subscription_id}: ${error.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Subscriptions integration: ${successCount} successful, ${errorCount} failed`, successCount > 0 ? 'success' : 'warning');
    return { successCount, errorCount };
  }

  async integrateOrders(dryRun = false) {
    this.log('📦 Integrating orders from staging to live tables...');

    const stagingOrders = await this.client.query(`
      SELECT o.*, u.id as live_user_id 
      FROM migration_staging.orders_staging o
      JOIN custom_users u ON u.phone = (
        SELECT phone FROM migration_staging.users_staging us 
        WHERE us.id = o.staged_user_id
      )
      WHERE o.migration_status = 'pending'
      ORDER BY o.wp_created_at
    `);

    let successCount = 0;
    let errorCount = 0;

    for (const order of stagingOrders.rows) {
      try {
        if (!dryRun) {
          // Generate new UUID for order
          const orderId = await this.client.query('SELECT gen_random_uuid() as id');
          const newId = orderId.rows[0].id;

          // Insert order into live table
          await this.client.query(`
            INSERT INTO orders (
              id, user_id, status, total_amount, delivery_fee, total_paid,
              shipping_address, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
          `, [
            newId, order.live_user_id, order.status, order.total_amount,
            order.delivery_fee, order.total_paid, order.shipping_address,
            order.wp_created_at, order.wp_updated_at
          ]);

          // Store the new order ID for order items integration
          await this.client.query(
            'UPDATE migration_staging.orders_staging SET live_order_id = $1, migration_status = \'integrated\', updated_at = NOW() WHERE id = $2',
            [newId, order.id]
          );
        }

        successCount++;
      } catch (error) {
        this.log(`❌ Failed to integrate order ${order.wp_order_id}: ${error.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Orders integration: ${successCount} successful, ${errorCount} failed`, successCount > 0 ? 'success' : 'warning');
    return { successCount, errorCount };
  }

  async integrateOrderItems(dryRun = false) {
    this.log('📋 Integrating order items from staging to live tables...');

    const stagingOrderItems = await this.client.query(`
      SELECT oi.*, o.live_order_id, pm.final_toy_id
      FROM migration_staging.order_items_staging oi
      JOIN migration_staging.orders_staging o ON o.id = oi.staged_order_id
      LEFT JOIN migration_staging.product_toy_mapping pm ON pm.wp_product_id = oi.wp_product_id
      WHERE oi.migration_status = 'pending' 
        AND o.live_order_id IS NOT NULL
        AND pm.final_toy_id IS NOT NULL
      ORDER BY oi.wp_created_at
    `);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const orderItem of stagingOrderItems.rows) {
      try {
        if (!orderItem.final_toy_id) {
          this.log(`⚠️ Skipping order item - no toy mapping for product ${orderItem.wp_product_id}`, 'warning');
          skippedCount++;
          continue;
        }

        if (!dryRun) {
          // Generate new UUID for order item
          const orderItemId = await this.client.query('SELECT gen_random_uuid() as id');
          const newId = orderItemId.rows[0].id;

          // Insert order item into live table
          await this.client.query(`
            INSERT INTO order_items (
              id, order_id, toy_id, quantity, unit_price, total_price,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8
            )
          `, [
            newId, orderItem.live_order_id, orderItem.final_toy_id,
            orderItem.quantity, orderItem.unit_price, orderItem.total_price,
            orderItem.wp_created_at, orderItem.wp_updated_at
          ]);

          // Mark as integrated in staging
          await this.client.query(
            'UPDATE migration_staging.order_items_staging SET migration_status = \'integrated\', updated_at = NOW() WHERE id = $1',
            [orderItem.id]
          );
        }

        successCount++;
      } catch (error) {
        this.log(`❌ Failed to integrate order item ${orderItem.wp_order_item_id}: ${error.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Order items integration: ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped`, successCount > 0 ? 'success' : 'warning');
    return { successCount, errorCount, skippedCount };
  }

  async updateUserSubscriptionStatus(dryRun = false) {
    this.log('🔄 Updating user subscription status based on active subscriptions...');

    if (!dryRun) {
      const result = await this.client.query(`
        UPDATE custom_users 
        SET subscription_status = 'active'
        WHERE id IN (
          SELECT DISTINCT user_id 
          FROM subscriptions 
          WHERE status IN ('active', 'pending')
        )
        AND subscription_status != 'active'
      `);

      this.log(`Updated subscription status for ${result.rowCount} users`, 'success');
      return result.rowCount;
    }

    return 0;
  }

  async generateIntegrationReport() {
    this.log('📊 Generating final integration report...');

    // Get final counts
    const liveCounts = await this.client.query(`
      SELECT 
        (SELECT COUNT(*) FROM custom_users) as users,
        (SELECT COUNT(*) FROM subscriptions) as subscriptions,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items
    `);

    const stagingCounts = await this.client.query(`
      SELECT 
        (SELECT COUNT(*) FROM migration_staging.users_staging WHERE migration_status = 'integrated') as integrated_users,
        (SELECT COUNT(*) FROM migration_staging.subscriptions_staging WHERE migration_status = 'integrated') as integrated_subscriptions,
        (SELECT COUNT(*) FROM migration_staging.orders_staging WHERE migration_status = 'integrated') as integrated_orders,
        (SELECT COUNT(*) FROM migration_staging.order_items_staging WHERE migration_status = 'integrated') as integrated_order_items
    `);

    const report = {
      integration_batch: this.batchName,
      completion_time: new Date().toISOString(),
      live_table_counts: liveCounts.rows[0],
      integrated_counts: stagingCounts.rows[0],
      log: this.integrationLog
    };

    // Save report to file
    const fs = await import('fs');
    const reportFile = `integration-report-${this.batchName}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📄 Integration report saved to: ${reportFile}`, 'success');
    
    return report;
  }

  async run(options = {}) {
    const { dryRun = false } = options;

    try {
      await this.connect();

      this.log(`🚀 Starting final integration${dryRun ? ' (DRY RUN)' : ''}...`);
      
      // Validate staging data
      const validation = await this.validateStagingData();
      
      if (validation.users === 0 && validation.subscriptions === 0 && validation.orders === 0) {
        this.log('⚠️ No data ready for integration. Please check staging data.', 'warning');
        return false;
      }

      // Start with users integration
      const userResults = await this.integrateUsers(dryRun);

      this.log('🎉 Final integration completed successfully!', 'success');
      this.log(`   Users: ${userResults.successCount} integrated, ${userResults.errorCount} failed`);

      return true;

    } catch (error) {
      this.log(`❌ Integration failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (args.includes('--help')) {
    console.log(`
Final Integration Tool - Move staging data to live Supabase tables

Usage: node final-integration.js [options]

Options:
  --dry-run   Test the integration without making changes
  --help      Show this help message

Examples:
  node final-integration.js --dry-run
  node final-integration.js
    `);
    return;
  }

  const integration = new FinalIntegration();
  const success = await integration.run({ dryRun });

  process.exit(success ? 0 : 1);
}

main().catch(console.error); 
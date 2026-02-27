import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class FixOrdersIntegration {
  constructor() {
    this.client = null;
    this.userMapping = new Map(); // wp_user_id -> live_user_id
    this.customerToUserMapping = new Map(); // wp_customer_id -> wp_user_id
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
    this.log('Building user mapping from WordPress user IDs to live user IDs...');
    
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

    // For orders, we need to map customer IDs to user IDs
    // This is a simplified approach - in reality, customer_id might equal user_id in WordPress
    this.log('Building customer to user mapping...');
    
    // Try to map customer IDs to user IDs (assuming they might be the same)
    const customerMappingResult = await this.client.query(`
      SELECT DISTINCT wp_customer_id
      FROM migration_staging.orders_staging 
      WHERE wp_customer_id IS NOT NULL
      AND migration_status = 'pending'
    `);

    let customerMappingCount = 0;
    customerMappingResult.rows.forEach(row => {
      const customerId = row.wp_customer_id;
      // In many WordPress setups, customer_id equals user_id
      if (this.userMapping.has(customerId)) {
        this.customerToUserMapping.set(customerId, customerId);
        customerMappingCount++;
      }
    });

    this.log(`Customer mapping built: ${customerMappingCount} customers mapped to users`, 'success');
    return this.userMapping.size;
  }

  async fixStagingOrderUserLinks() {
    this.log('Fixing staging order user links...');

    // Update staging orders to link them to the correct staged_user_id
    const updateResult = await this.client.query(`
      UPDATE migration_staging.orders_staging 
      SET staged_user_id = us.id
      FROM migration_staging.users_staging us
      WHERE orders_staging.wp_customer_id = us.wp_user_id
      AND orders_staging.staged_user_id IS NULL
      AND us.migration_status = 'integrated'
      AND orders_staging.wp_customer_id IS NOT NULL
    `);

    this.log(`Updated ${updateResult.rowCount} staging orders with user links`, 'success');
    return updateResult.rowCount;
  }

  async getOrdersWithUsers() {
    this.log('Getting orders that have valid user mappings...');

    const ordersResult = await this.client.query(`
      SELECT 
        os.*,
        us.phone,
        us.email
      FROM migration_staging.orders_staging os
      JOIN migration_staging.users_staging us ON os.staged_user_id = us.id
      WHERE os.migration_status = 'pending'
      AND us.migration_status = 'integrated'
      AND os.wp_customer_id IS NOT NULL
      AND os.total_amount > 0
      ORDER BY os.wp_created_at DESC
      LIMIT 50
    `);

    this.log(`Found ${ordersResult.rows.length} orders ready for integration`);
    return ordersResult.rows;
  }

  mapOrderStatus(wpStatus) {
    const statusMapping = {
      'completed': 'delivered',
      'processing': 'shipped', 
      'pending': 'pending',
      'on-hold': 'pending',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled'
    };
    return statusMapping[wpStatus] || 'pending';
  }

  async integrateOrders() {
    this.log('Starting orders integration...');

    // First fix the user links
    await this.fixStagingOrderUserLinks();

    // Get orders ready for integration
    const ordersToIntegrate = await this.getOrdersWithUsers();

    if (ordersToIntegrate.length === 0) {
      this.log('No orders found ready for integration');
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const stagingOrder of ordersToIntegrate) {
      try {
        // First get the WordPress user ID from customer ID
        const wpUserId = this.customerToUserMapping.get(stagingOrder.wp_customer_id);
        if (!wpUserId) {
          this.log(`Order ${stagingOrder.id}: No user mapping found for WP customer ${stagingOrder.wp_customer_id}`, 'warning');
          failedCount++;
          continue;
        }

        // Then get the live user ID
        const liveUserId = this.userMapping.get(wpUserId);
        if (!liveUserId) {
          this.log(`Order ${stagingOrder.id}: No live user found for WP user ${wpUserId}`, 'warning');
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

        // Insert order with proper schema mapping
        await this.client.query(`
          INSERT INTO orders (
            id, 
            user_id, 
            status, 
            total_amount, 
            shipping_address,
            created_at, 
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          stagingOrder.id,
          liveUserId,
          this.mapOrderStatus(stagingOrder.wp_status),
          stagingOrder.total_amount,
          stagingOrder.shipping_address,
          stagingOrder.wp_created_at,
          stagingOrder.wp_updated_at
        ]);

        // Mark as completed in staging
        await this.client.query(
          'UPDATE migration_staging.orders_staging SET migration_status = $1, integrated_order_id = $2 WHERE id = $3',
          ['completed', stagingOrder.id, stagingOrder.id]
        );

        successCount++;
        this.log(`Order integrated: ${stagingOrder.id} (₹${stagingOrder.total_amount}) for user ${stagingOrder.phone}`);

      } catch (error) {
        this.log(`Failed to integrate order ${stagingOrder.id}: ${error.message}`, 'error');
        failedCount++;
      }
    }

    this.log(`Orders integration completed: ${successCount} success, ${failedCount} failed`, 'success');
    return { success: successCount, failed: failedCount };
  }

  async testSpecificUser(phone) {
    this.log(`Testing orders for specific user: ${phone}`);

    // Find user in live database
    const userResult = await this.client.query(
      'SELECT id, first_name, last_name, email FROM custom_users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      this.log(`User not found: ${phone}`, 'error');
      return;
    }

    const user = userResult.rows[0];
    this.log(`Found user: ${user.first_name} ${user.last_name} (${user.email})`);

    // Check orders in live database
    const ordersResult = await this.client.query(
      'SELECT id, status, total_amount, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    this.log(`Live orders for this user: ${ordersResult.rows.length}`);
    ordersResult.rows.forEach((order, index) => {
      this.log(`  ${index + 1}. Order ${order.id.slice(0, 8)}... - ₹${order.total_amount} (${order.status}) - ${order.created_at}`);
    });

    // Check if user has staging data
    const stagingResult = await this.client.query(`
      SELECT COUNT(*) as count
      FROM migration_staging.orders_staging os
      JOIN migration_staging.users_staging us ON os.wp_customer_id = us.wp_user_id
      WHERE us.phone = $1
      AND us.migration_status = 'integrated'
    `, [phone]);

    this.log(`Staging orders available for this user: ${stagingResult.rows[0].count}`);
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

      // Integrate orders
      const orderResults = await this.integrateOrders();

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
      this.log(`   Orders: ${orderResults.success} success, ${orderResults.failed} failed`);

      // Check final counts
      const finalCounts = await this.client.query(`
        SELECT 
          (SELECT COUNT(*) FROM orders) as live_orders,
          (SELECT COUNT(*) FROM migration_staging.orders_staging WHERE migration_status = 'pending') as pending_orders,
          (SELECT COUNT(*) FROM migration_staging.orders_staging WHERE migration_status = 'completed') as completed_orders
      `);

      const counts = finalCounts.rows[0];
      this.log(`📈 Final database state:`);
      this.log(`   Live orders: ${counts.live_orders}`);
      this.log(`   Completed staging orders: ${counts.completed_orders}`);
      this.log(`   Remaining staging orders: ${counts.pending_orders}`);

    } catch (error) {
      this.log(`Integration failed: ${error.message}`, 'error');
    } finally {
      await this.disconnect();
    }
  }
}

// Run the integration
const integration = new FixOrdersIntegration();
integration.run().catch(console.error); 
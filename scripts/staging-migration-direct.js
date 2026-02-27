import axios from 'axios';
import pkg from 'pg';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables from .env file
dotenv.config();

// Configuration
const WORDPRESS_BASE_URL = 'https://toyflix.in';
const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class DirectStagingMigration {
  constructor() {
    this.apiBase = `${WORDPRESS_BASE_URL}/wp-json/migration/v1`;
    this.migrationLog = [];
    this.batchName = `migration_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.client = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.migrationLog.push(logEntry);
    
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async connectToDatabase() {
    try {
      this.client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      await this.client.connect();
      this.log('Connected to PostgreSQL database', 'success');
      
      // Test the connection by checking if staging tables exist
      const result = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'migration_staging'
        ORDER BY table_name
      `);
      
      this.log(`Found ${result.rows.length} staging tables`, 'success');
      result.rows.forEach(row => {
        this.log(`  • ${row.table_name}`);
      });
      
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async disconnectFromDatabase() {
    if (this.client) {
      await this.client.end();
      this.log('Disconnected from database', 'info');
    }
  }

  async createMigrationBatch(type, totalRecords = 0) {
    try {
      const query = `
        INSERT INTO migration_staging.migration_batches 
        (batch_name, migration_type, total_records, status) 
        VALUES ($1, $2, $3, 'running') 
        RETURNING id
      `;
      
      const result = await this.client.query(query, [this.batchName, type, totalRecords]);
      this.log(`Created migration batch: ${this.batchName}`, 'success');
      return result.rows[0];
    } catch (error) {
      this.log(`Error creating migration batch: ${error.message}`, 'error');
      throw error;
    }
  }

  async updateMigrationBatch(status, stats = {}) {
    try {
      const query = `
        UPDATE migration_staging.migration_batches 
        SET status = $1, 
            end_time = NOW(), 
            successful_records = $2,
            failed_records = $3
        WHERE batch_name = $4
      `;
      
      await this.client.query(query, [
        status,
        stats.successful_records || 0,
        stats.failed_records || 0,
        this.batchName
      ]);
      
      this.log(`Updated migration batch status: ${status}`, 'info');
    } catch (error) {
      this.log(`Error updating migration batch: ${error.message}`, 'error');
    }
  }

  async fetchAllUsers() {
    const allUsers = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all users from WordPress...');

    while (hasMore) {
      const response = await axios.get(`${this.apiBase}/users`, {
        params: { page, per_page: 50 }
      });
      
      const data = response.data;
      allUsers.push(...data.users);
      
      this.log(`Fetched page ${page}: ${data.users.length} users`);
      hasMore = page < data.total_pages;
      page++;
    }

    this.log(`Total users fetched: ${allUsers.length}`, 'success');
    return allUsers;
  }

  async fetchAllOrders() {
    const allOrders = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all orders from WordPress...');

    while (hasMore) {
      const response = await axios.get(`${this.apiBase}/orders`, {
        params: { page, per_page: 50 }
      });
      
      const data = response.data;
      allOrders.push(...data.orders);
      
      this.log(`Fetched page ${page}: ${data.orders.length} orders`);
      hasMore = page < data.total_pages;
      page++;
    }

    this.log(`Total orders fetched: ${allOrders.length}`, 'success');
    return allOrders;
  }

  async fetchAllSubscriptions() {
    const allSubscriptions = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all subscriptions from WordPress...');

    while (hasMore) {
      const response = await axios.get(`${this.apiBase}/subscriptions`, {
        params: { page, per_page: 50 }
      });
      
      const data = response.data;
      allSubscriptions.push(...data.subscriptions);
      
      this.log(`Fetched page ${page}: ${data.subscriptions.length} subscriptions`);
      hasMore = page < data.total_pages;
      page++;
    }

    this.log(`Total subscriptions fetched: ${allSubscriptions.length}`, 'success');
    return allSubscriptions;
  }

  async fetchOrderItems(orderId) {
    try {
      const response = await axios.get(`${this.apiBase}/orders/${orderId}/items`);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  transformUserForStaging(wpUser) {
    const phone = wpUser.billing_phone || wpUser.phone;
    
    if (!phone) {
      return null;
    }

    return {
      wp_user_id: wpUser.ID,
      phone: phone,
      email: wpUser.user_email || null,
      first_name: wpUser.billing_first_name || wpUser.first_name || null,
      last_name: wpUser.billing_last_name || wpUser.last_name || null,
      address_line1: wpUser.billing_address_1 || null,
      address_line2: wpUser.billing_address_2 || null,
      city: wpUser.billing_city || null,
      state: wpUser.billing_state || null,
      zip_code: wpUser.billing_postcode || null,
      role: 'user',
      subscription_active: false,
      phone_verified: false,
      is_active: true,
      wp_created_at: wpUser.user_registered || new Date().toISOString(),
      migration_batch: this.batchName,
      migration_status: 'pending'
    };
  }

  async insertUsersToStaging(users) {
    this.log(`Inserting ${users.length} users to staging...`);
    
    const validUsers = users.filter(user => user !== null);
    let successCount = 0;
    let errorCount = 0;

    const query = `
      INSERT INTO migration_staging.users_staging 
      (wp_user_id, phone, email, first_name, last_name, address_line1, 
       address_line2, city, state, zip_code, role, subscription_active, 
       phone_verified, is_active, wp_created_at, migration_batch, migration_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (wp_user_id) DO UPDATE SET
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW()
      RETURNING id
    `;

    // Insert users in batches of 100
    const batchSize = 100;
    for (let i = 0; i < validUsers.length; i += batchSize) {
      const batch = validUsers.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          const values = [
            user.wp_user_id,
            user.phone,
            user.email,
            user.first_name,
            user.last_name,
            user.address_line1,
            user.address_line2,
            user.city,
            user.state,
            user.zip_code,
            user.role,
            user.subscription_active,
            user.phone_verified,
            user.is_active,
            user.wp_created_at,
            user.migration_batch,
            user.migration_status
          ];

          await this.client.query(query, values);
          successCount++;
          
          if (successCount % 50 === 0) {
            this.log(`Inserted ${successCount} users...`);
          }
        } catch (err) {
          this.log(`Error inserting user ${user.wp_user_id}: ${err.message}`, 'error');
          errorCount++;
        }
      }
    }

    this.log(`User staging complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertOrdersToStaging(orders, userMapping) {
    this.log(`Inserting ${orders.length} orders to staging...`);
    
    let successCount = 0;
    let errorCount = 0;

    const orderQuery = `
      INSERT INTO migration_staging.orders_staging 
      (wp_order_id, wp_customer_id, staged_user_id, total_amount, status, wp_status, 
       currency, shipping_address, wp_created_at, wp_updated_at, migration_batch, migration_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (wp_order_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id
    `;

    const itemQuery = `
      INSERT INTO migration_staging.order_items_staging 
      (wp_order_item_id, staged_order_id, wp_product_id, product_name, 
       quantity, unit_price, total_price, migration_batch, migration_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (wp_order_item_id) DO NOTHING
    `;

    for (const wpOrder of orders) {
      try {
        // Find staged user
        const stagedUserId = userMapping.get(wpOrder.customer_id?.toString());
        if (!stagedUserId && wpOrder.customer_id) {
          this.log(`Order ${wpOrder.ID} references unmapped user ${wpOrder.customer_id}`, 'warning');
          continue;
        }

        // Transform shipping address
        const shippingAddress = {
          firstName: wpOrder.billing_first_name || '',
          lastName: wpOrder.billing_last_name || '',
          email: wpOrder.billing_email || '',
          phone: wpOrder.billing_phone || '',
          address1: wpOrder.billing_address_1 || '',
          address2: wpOrder.billing_address_2 || '',
          city: wpOrder.billing_city || '',
          state: wpOrder.billing_state || '',
          postcode: wpOrder.billing_postcode || '',
          country: wpOrder.billing_country || 'IN'
        };

        // Insert order
        const orderValues = [
          wpOrder.ID,
          wpOrder.customer_id || null,
          stagedUserId || null,
          parseFloat(wpOrder.total || 0),
          this.mapOrderStatus(wpOrder.post_status),
          wpOrder.post_status,
          wpOrder.currency || 'INR',
          JSON.stringify(shippingAddress),
          wpOrder.post_date || new Date().toISOString(),
          wpOrder.post_modified || new Date().toISOString(),
          this.batchName,
          'pending'
        ];

        const orderResult = await this.client.query(orderQuery, orderValues);
        const orderId = orderResult.rows[0]?.id;

        // Fetch and insert order items
        const items = await this.fetchOrderItems(wpOrder.ID);
        if (items.length > 0 && orderId) {
          for (const item of items) {
            try {
              const itemValues = [
                item.order_item_id,
                orderId,
                item.product_id,
                item.order_item_name,
                parseInt(item.quantity || 1),
                parseFloat(item.total || 0) / parseInt(item.quantity || 1),
                parseFloat(item.total || 0),
                this.batchName,
                'pending'
              ];

              await this.client.query(itemQuery, itemValues);

              // Create product mapping
              if (item.product_id) {
                await this.createProductMapping(item);
              }
            } catch (itemError) {
              this.log(`Error inserting item for order ${wpOrder.ID}: ${itemError.message}`, 'warning');
            }
          }
        }

        successCount++;
        
        if (successCount % 10 === 0) {
          this.log(`Processed ${successCount} orders...`);
        }

      } catch (err) {
        this.log(`Exception processing order ${wpOrder.ID}: ${err.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Order staging complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertSubscriptionsToStaging(subscriptions, userMapping) {
    this.log(`Inserting ${subscriptions.length} subscriptions to staging...`);
    
    let successCount = 0;
    let errorCount = 0;

    const subscriptionQuery = `
      INSERT INTO migration_staging.subscriptions_staging 
      (wp_subscription_id, wp_customer_id, staged_user_id, plan_type, status, wp_status, 
       total_amount, billing_cycle, start_date, end_date, next_billing_date, 
       wp_created_at, wp_updated_at, migration_batch, migration_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (wp_subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
      RETURNING id
    `;

    for (const wpSubscription of subscriptions) {
      try {
        // Find staged user
        const stagedUserId = userMapping.get(wpSubscription.customer_id?.toString());
        if (!stagedUserId && wpSubscription.customer_id) {
          this.log(`Subscription ${wpSubscription.ID} references unmapped user ${wpSubscription.customer_id}`, 'warning');
          continue;
        }

        // Transform subscription data
        const subscriptionData = this.transformSubscriptionForStaging(wpSubscription, stagedUserId);

        const subscriptionValues = [
          subscriptionData.wp_subscription_id,
          subscriptionData.wp_customer_id,
          subscriptionData.staged_user_id,
          subscriptionData.plan_type,
          subscriptionData.status,
          subscriptionData.wp_status,
          subscriptionData.total_amount,
          subscriptionData.billing_cycle,
          subscriptionData.start_date,
          subscriptionData.end_date,
          subscriptionData.next_billing_date,
          subscriptionData.wp_created_at,
          subscriptionData.wp_updated_at,
          subscriptionData.migration_batch,
          subscriptionData.migration_status
        ];

        await this.client.query(subscriptionQuery, subscriptionValues);
        successCount++;
        
        if (successCount % 10 === 0) {
          this.log(`Processed ${successCount} subscriptions...`);
        }

      } catch (err) {
        this.log(`Exception processing subscription ${wpSubscription.ID}: ${err.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Subscription staging complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  transformSubscriptionForStaging(wpSubscription, stagedUserId) {
    // Extract subscription plan
    const planMapping = {
      'monthly': 'monthly',
      'quarterly': 'quarterly', 
      '3-month': 'quarterly',
      'month': 'monthly',
      'months': 'monthly'
    };

    let subscriptionPlan = 'monthly';
    const billingPeriod = wpSubscription.billing_period?.toLowerCase() || '';
    const subscriptionName = wpSubscription.subscription_name?.toLowerCase() || '';
    
    for (const [key, value] of Object.entries(planMapping)) {
      if (billingPeriod.includes(key) || subscriptionName.includes(key)) {
        subscriptionPlan = value;
        break;
      }
    }

    return {
      wp_subscription_id: wpSubscription.ID,
      wp_customer_id: wpSubscription.customer_id,
      staged_user_id: stagedUserId,
      plan_type: subscriptionPlan,
      status: this.mapSubscriptionStatus(wpSubscription.post_status || wpSubscription.status),
      wp_status: wpSubscription.post_status || wpSubscription.status,
      total_amount: parseFloat(wpSubscription.total || wpSubscription.recurring_amount || 0),
      billing_cycle: subscriptionPlan === 'quarterly' ? 3 : 1,
      start_date: wpSubscription.start_date || wpSubscription.post_date || new Date().toISOString(),
      end_date: wpSubscription.end_date || null,
      next_billing_date: wpSubscription.next_payment_date || null,
      wp_created_at: wpSubscription.post_date || new Date().toISOString(),
      wp_updated_at: wpSubscription.post_modified || new Date().toISOString(),
      migration_batch: this.batchName,
      migration_status: 'pending'
    };
  }

  mapSubscriptionStatus(wpStatus) {
    const statusMap = {
      'wc-active': 'active',
      'wc-cancelled': 'cancelled',
      'wc-expired': 'expired',
      'wc-on-hold': 'paused',
      'wc-pending': 'pending',
      'wc-pending-cancel': 'cancelled',
      'active': 'active',
      'cancelled': 'cancelled',
      'expired': 'expired',
      'on-hold': 'paused',
      'pending': 'pending',
      'pending-cancel': 'cancelled'
    };
    return statusMap[wpStatus] || 'pending';
  }

  async createProductMapping(wpItem) {
    try {
      const query = `
        INSERT INTO migration_staging.product_toy_mapping 
        (wp_product_id, wp_product_name, mapping_status)
        VALUES ($1, $2, 'pending')
        ON CONFLICT (wp_product_id) DO NOTHING
      `;

      await this.client.query(query, [wpItem.product_id, wpItem.order_item_name]);
    } catch (error) {
      // Ignore errors for product mapping - it's not critical
    }
  }

  async getUserMappingFromStaging() {
    try {
      // Get user mapping from ALL staged users, not just current batch
      const query = `
        SELECT id, wp_user_id 
        FROM migration_staging.users_staging 
        WHERE migration_status IN ('pending', 'reviewed', 'integrated')
      `;

      const result = await this.client.query(query);
      const userMapping = new Map();
      
      result.rows.forEach(user => {
        userMapping.set(user.wp_user_id.toString(), user.id);
      });

      this.log(`Built user mapping for ${userMapping.size} staged users from all batches`);
      return userMapping;
    } catch (error) {
      this.log(`Could not build user mapping: ${error.message}`, 'warning');
      return new Map();
    }
  }

  mapOrderStatus(wpStatus) {
    const statusMap = {
      'wc-pending': 'pending',
      'wc-processing': 'pending',
      'wc-on-hold': 'pending',
      'wc-completed': 'delivered',
      'wc-cancelled': 'cancelled',
      'wc-refunded': 'cancelled',
      'wc-failed': 'cancelled',
      'pending': 'pending',
      'processing': 'pending',
      'on-hold': 'pending',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled'
    };
    return statusMap[wpStatus] || 'pending';
  }

  async runStagingMigration(options = {}) {
    const { dryRun = false, usersOnly = false, ordersOnly = false, subscriptionsOnly = false } = options;

    this.log('🚀 Starting Direct WooCommerce to Staging Migration...');
    
    if (dryRun) {
      this.log('🧪 DRY RUN MODE - No data will be inserted', 'warning');
    }

    try {
      // Connect to database
      if (!dryRun) {
        const connected = await this.connectToDatabase();
        if (!connected) {
          throw new Error('Could not connect to database');
        }
      }

             let userResults = { successCount: 0, errorCount: 0 };
       let orderResults = { successCount: 0, errorCount: 0 };
       let subscriptionResults = { successCount: 0, errorCount: 0 };

       // Create migration batch
       const batchType = usersOnly ? 'users' : ordersOnly ? 'orders' : subscriptionsOnly ? 'subscriptions' : 'combined';
      if (!dryRun) {
        await this.createMigrationBatch(batchType);
      }

             // Migrate users
       let userMapping = new Map();
       if (!ordersOnly && !subscriptionsOnly) {
        this.log('📝 Phase 1: Migrating users to staging...');
        const wpUsers = await this.fetchAllUsers();
        const transformedUsers = wpUsers.map(user => this.transformUserForStaging(user)).filter(Boolean);
        
        this.log(`Transformed ${transformedUsers.length} valid users out of ${wpUsers.length} total`);

        if (!dryRun) {
          userResults = await this.insertUsersToStaging(transformedUsers);
        }
      }

      // Build user mapping for orders/subscriptions (always needed when not dry run)
      if (!dryRun && (ordersOnly || subscriptionsOnly || !usersOnly)) {
        userMapping = await this.getUserMappingFromStaging();
      }

             // Migrate subscriptions
       if (!usersOnly && !ordersOnly) {
         this.log('🔄 Phase 2: Migrating subscriptions to staging...');
         const wpSubscriptions = await this.fetchAllSubscriptions();
         
         this.log(`Fetched ${wpSubscriptions.length} subscriptions`);

         if (!dryRun) {
           subscriptionResults = await this.insertSubscriptionsToStaging(wpSubscriptions, userMapping);
         }
       }

       // Migrate orders
       if (!usersOnly && !subscriptionsOnly) {
         this.log('📦 Phase 3: Migrating orders to staging...');
         const wpOrders = await this.fetchAllOrders();
         
         this.log(`Fetched ${wpOrders.length} orders`);

         if (!dryRun) {
           orderResults = await this.insertOrdersToStaging(wpOrders, userMapping);
         }
       }

             // Update migration batch
       if (!dryRun) {
         await this.updateMigrationBatch('completed', {
           successful_records: userResults.successCount + orderResults.successCount + subscriptionResults.successCount,
           failed_records: userResults.errorCount + orderResults.errorCount + subscriptionResults.errorCount
         });
       }

       // Summary
       this.log('🎉 Staging migration completed!', 'success');
       this.log(`Users: ${userResults.successCount} successful, ${userResults.errorCount} failed`);
       this.log(`Subscriptions: ${subscriptionResults.successCount} successful, ${subscriptionResults.errorCount} failed`);
       this.log(`Orders: ${orderResults.successCount} successful, ${orderResults.errorCount} failed`);

      // Save migration log
      const logFileName = `staging-migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      writeFileSync(logFileName, JSON.stringify(this.migrationLog, null, 2));
      this.log(`Migration log saved to ${logFileName}`);

      // Disconnect from database
      if (!dryRun) {
        await this.disconnectFromDatabase();
      }

      return true;

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      
      // Update batch as failed
      if (!options.dryRun) {
        await this.updateMigrationBatch('failed');
        await this.disconnectFromDatabase();
      }
      
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const usersOnly = args.includes('--users-only');
  const ordersOnly = args.includes('--orders-only');
  const subscriptionsOnly = args.includes('--subscriptions-only');

  if (args.includes('--help')) {
    console.log(`
WooCommerce to Staging Migration Tool (Direct PostgreSQL)

Usage: node staging-migration-direct.js [options]

 Options:
   --dry-run             Test the migration without inserting data
   --users-only          Migrate only users to staging
   --subscriptions-only  Migrate only subscriptions to staging
   --orders-only         Migrate only orders to staging
   --help                Show this help message

 Examples:
   node staging-migration-direct.js --dry-run
   node staging-migration-direct.js --users-only
   node staging-migration-direct.js --subscriptions-only
   node staging-migration-direct.js
    `);
    return;
  }

  const migration = new DirectStagingMigration();
  const success = await migration.runStagingMigration({ 
    dryRun, 
    usersOnly, 
    ordersOnly,
    subscriptionsOnly
  });
  
  process.exit(success ? 0 : 1);
}

// Export for use as module
export default DirectStagingMigration;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 
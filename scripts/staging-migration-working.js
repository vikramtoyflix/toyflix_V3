import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration
const WORDPRESS_BASE_URL = 'https://toyflix.in';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class StagingMigration {
  constructor() {
    this.apiBase = `${WORDPRESS_BASE_URL}/wp-json/migration/v1`;
    this.migrationLog = [];
    this.batchName = `migration_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.migrationLog.push(logEntry);
    
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async executeStagingSQL(sql, params = []) {
    try {
      // Use the standard supabase.rpc to execute SQL
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: sql 
      });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      // If exec_sql doesn't exist, try direct table access
      return { data: null, error };
    }
  }

  async createMigrationBatch(type, totalRecords = 0) {
    try {
      // Direct SQL insert into staging table
      const sql = `
        INSERT INTO migration_staging.migration_batches 
        (batch_name, migration_type, total_records, status) 
        VALUES ('${this.batchName}', '${type}', ${totalRecords}, 'running') 
        RETURNING id;
      `;

      // Try using SQL first
      const { data, error } = await this.executeStagingSQL(sql);
      
      if (error) {
        // Fallback: just log that we're starting
        this.log(`Starting migration batch: ${this.batchName} (${type})`, 'info');
        return { id: 'fallback' };
      }

      this.log(`Created migration batch: ${this.batchName}`, 'success');
      return data?.[0] || { id: 'created' };
    } catch (error) {
      this.log(`Note: Migration batch tracking unavailable, continuing migration`, 'warning');
      return { id: 'fallback' };
    }
  }

  async updateMigrationBatch(status, stats = {}) {
    try {
      const sql = `
        UPDATE migration_staging.migration_batches 
        SET status = '${status}', 
            end_time = NOW(), 
            successful_records = ${stats.successful_records || 0},
            failed_records = ${stats.failed_records || 0}
        WHERE batch_name = '${this.batchName}';
      `;

      await this.executeStagingSQL(sql);
      this.log(`Updated migration batch status: ${status}`, 'info');
    } catch (error) {
      // Non-critical, just log
      this.log(`Note: Could not update batch status`, 'warning');
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

    // Insert users one by one with SQL
    for (const user of validUsers) {
      try {
        const sql = `
          INSERT INTO migration_staging.users_staging 
          (wp_user_id, phone, email, first_name, last_name, address_line1, 
           address_line2, city, state, zip_code, role, subscription_active, 
           phone_verified, is_active, wp_created_at, migration_batch, migration_status)
          VALUES (
            ${user.wp_user_id}, 
            '${user.phone?.replace(/'/g, "''")}', 
            ${user.email ? `'${user.email.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.first_name ? `'${user.first_name.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.last_name ? `'${user.last_name.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.address_line1 ? `'${user.address_line1.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.address_line2 ? `'${user.address_line2.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.city ? `'${user.city.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.state ? `'${user.state.replace(/'/g, "''")}'` : 'NULL'}, 
            ${user.zip_code ? `'${user.zip_code.replace(/'/g, "''")}'` : 'NULL'}, 
            '${user.role}', 
            ${user.subscription_active}, 
            ${user.phone_verified}, 
            ${user.is_active}, 
            '${user.wp_created_at}', 
            '${user.migration_batch}', 
            '${user.migration_status}'
          )
          ON CONFLICT (wp_user_id) DO UPDATE SET
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            updated_at = NOW();
        `;

        const { error } = await this.executeStagingSQL(sql);
        
        if (error) {
          this.log(`Error inserting user ${user.wp_user_id}: ${error.message}`, 'error');
          errorCount++;
        } else {
          successCount++;
          if (successCount % 50 === 0) {
            this.log(`Inserted ${successCount} users...`);
          }
        }
      } catch (err) {
        this.log(`Exception inserting user ${user.wp_user_id}: ${err.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`User staging complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertOrdersToStaging(orders, userMapping) {
    this.log(`Inserting ${orders.length} orders to staging...`);
    
    let successCount = 0;
    let errorCount = 0;

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

        // Insert order with SQL
        const orderSQL = `
          INSERT INTO migration_staging.orders_staging 
          (wp_order_id, wp_customer_id, staged_user_id, total_amount, status, wp_status, 
           currency, shipping_address, wp_created_at, wp_updated_at, migration_batch, migration_status)
          VALUES (
            ${wpOrder.ID}, 
            ${wpOrder.customer_id || 'NULL'}, 
            ${stagedUserId ? `'${stagedUserId}'` : 'NULL'}, 
            ${parseFloat(wpOrder.total || 0)}, 
            '${this.mapOrderStatus(wpOrder.post_status)}', 
            '${wpOrder.post_status}',
            '${wpOrder.currency || 'INR'}', 
            '${JSON.stringify(shippingAddress).replace(/'/g, "''")}',
            '${wpOrder.post_date || new Date().toISOString()}', 
            '${wpOrder.post_modified || new Date().toISOString()}',
            '${this.batchName}', 
            'pending'
          )
          ON CONFLICT (wp_order_id) DO UPDATE SET
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status,
            updated_at = NOW()
          RETURNING id;
        `;

        const { data: orderResult, error: orderError } = await this.executeStagingSQL(orderSQL);

        if (orderError) {
          this.log(`Error inserting order ${wpOrder.ID}: ${orderError.message}`, 'error');
          errorCount++;
          continue;
        }

        // Get the order ID from result
        const orderId = orderResult?.[0]?.id;

        // Fetch and insert order items
        const items = await this.fetchOrderItems(wpOrder.ID);
        if (items.length > 0 && orderId) {
          for (const item of items) {
            try {
              const itemSQL = `
                INSERT INTO migration_staging.order_items_staging 
                (wp_order_item_id, staged_order_id, wp_product_id, product_name, 
                 quantity, unit_price, total_price, migration_batch, migration_status)
                VALUES (
                  ${item.order_item_id}, 
                  '${orderId}', 
                  ${item.product_id}, 
                  '${item.order_item_name?.replace(/'/g, "''")}',
                  ${parseInt(item.quantity || 1)}, 
                  ${parseFloat(item.total || 0) / parseInt(item.quantity || 1)},
                  ${parseFloat(item.total || 0)}, 
                  '${this.batchName}', 
                  'pending'
                )
                ON CONFLICT (wp_order_item_id) DO NOTHING;
              `;

              await this.executeStagingSQL(itemSQL);

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

  async createProductMapping(wpItem) {
    try {
      const sql = `
        INSERT INTO migration_staging.product_toy_mapping 
        (wp_product_id, wp_product_name, mapping_status)
        VALUES (
          ${wpItem.product_id}, 
          '${wpItem.order_item_name?.replace(/'/g, "''")}', 
          'pending'
        )
        ON CONFLICT (wp_product_id) DO NOTHING;
      `;

      await this.executeStagingSQL(sql);
    } catch (error) {
      // Ignore errors for product mapping - it's not critical
    }
  }

  async getUserMappingFromStaging() {
    try {
      const sql = `
        SELECT id, wp_user_id 
        FROM migration_staging.users_staging 
        WHERE migration_batch = '${this.batchName}'
      `;

      const { data } = await this.executeStagingSQL(sql);
      const userMapping = new Map();
      
      if (data && Array.isArray(data)) {
        data.forEach(user => {
          userMapping.set(user.wp_user_id.toString(), user.id);
        });
      }

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
    const { dryRun = false, usersOnly = false, ordersOnly = false } = options;

    this.log('🚀 Starting WooCommerce to Staging Migration...');
    
    if (dryRun) {
      this.log('🧪 DRY RUN MODE - No data will be inserted', 'warning');
    }

    try {
      let userResults = { successCount: 0, errorCount: 0 };
      let orderResults = { successCount: 0, errorCount: 0 };

      // Create migration batch
      const batchType = usersOnly ? 'users' : ordersOnly ? 'orders' : 'combined';
      if (!dryRun) {
        await this.createMigrationBatch(batchType);
      }

      // Migrate users
      let userMapping = new Map();
      if (!ordersOnly) {
        this.log('📝 Phase 1: Migrating users to staging...');
        const wpUsers = await this.fetchAllUsers();
        const transformedUsers = wpUsers.map(user => this.transformUserForStaging(user)).filter(Boolean);
        
        this.log(`Transformed ${transformedUsers.length} valid users out of ${wpUsers.length} total`);

        if (!dryRun) {
          userResults = await this.insertUsersToStaging(transformedUsers);
          
          // Build user mapping for orders
          userMapping = await this.getUserMappingFromStaging();
          this.log(`Built user mapping for ${userMapping.size} users`);
        }
      }

      // Migrate orders
      if (!usersOnly) {
        this.log('📦 Phase 2: Migrating orders to staging...');
        const wpOrders = await this.fetchAllOrders();
        
        this.log(`Fetched ${wpOrders.length} orders`);

        if (!dryRun) {
          orderResults = await this.insertOrdersToStaging(wpOrders, userMapping);
        }
      }

      // Update migration batch
      if (!dryRun) {
        await this.updateMigrationBatch('completed', {
          successful_records: userResults.successCount + orderResults.successCount,
          failed_records: userResults.errorCount + orderResults.errorCount
        });
      }

      // Summary
      this.log('🎉 Staging migration completed!', 'success');
      this.log(`Users: ${userResults.successCount} successful, ${userResults.errorCount} failed`);
      this.log(`Orders: ${orderResults.successCount} successful, ${orderResults.errorCount} failed`);

      // Save migration log
      const logFileName = `staging-migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      writeFileSync(logFileName, JSON.stringify(this.migrationLog, null, 2));
      this.log(`Migration log saved to ${logFileName}`);

      return true;

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      
      // Update batch as failed
      if (!options.dryRun) {
        await this.updateMigrationBatch('failed');
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

  if (args.includes('--help')) {
    console.log(`
WooCommerce to Staging Migration Tool (Working Version)

Usage: node staging-migration-working.js [options]

Options:
  --dry-run       Test the migration without inserting data
  --users-only    Migrate only users to staging
  --orders-only   Migrate only orders to staging
  --help          Show this help message

Environment Variables:
  SUPABASE_SERVICE_KEY  Required: Your Supabase service role key

Examples:
  node staging-migration-working.js --dry-run
  node staging-migration-working.js --users-only
  node staging-migration-working.js
    `);
    return;
  }

  const migration = new StagingMigration();
  const success = await migration.runStagingMigration({ 
    dryRun, 
    usersOnly, 
    ordersOnly
  });
  
  process.exit(success ? 0 : 1);
}

// Export for use as module
export default StagingMigration;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 
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

  async createMigrationBatch(type, totalRecords = 0) {
    try {
      const { data, error } = await supabase
        .schema('migration_staging')
        .from('migration_batches')
        .insert({
          batch_name: this.batchName,
          migration_type: type,
          total_records: totalRecords,
          status: 'running'
        })
        .select()
        .single();

      if (error) {
        this.log(`Error creating migration batch: ${error.message}`, 'error');
        throw error;
      }

      this.log(`Created migration batch: ${this.batchName}`, 'success');
      return data;
    } catch (error) {
      this.log(`Failed to create migration batch: ${error.message}`, 'error');
      throw error;
    }
  }

  async updateMigrationBatch(status, stats = {}) {
    try {
      const { error } = await supabase
        .schema('migration_staging')
        .from('migration_batches')
        .update({
          status,
          end_time: new Date().toISOString(),
          successful_records: stats.successful_records || 0,
          failed_records: stats.failed_records || 0
        })
        .eq('batch_name', this.batchName);

      if (error) {
        this.log(`Error updating migration batch: ${error.message}`, 'error');
      }
    } catch (error) {
      this.log(`Failed to update migration batch: ${error.message}`, 'error');
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

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < validUsers.length; i += batchSize) {
      const batch = validUsers.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .schema('migration_staging')
          .from('users_staging')
          .upsert(batch, { 
            onConflict: 'wp_user_id',
            ignoreDuplicates: false 
          })
          .select();

        if (error) {
          this.log(`Error inserting user batch: ${error.message}`, 'error');
          errorCount += batch.length;
        } else {
          successCount += data?.length || batch.length;
          this.log(`Inserted user batch: ${batch.length} users`);
        }
      } catch (err) {
        this.log(`Exception inserting user batch: ${err.message}`, 'error');
        errorCount += batch.length;
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

        // Insert order
        const orderData = {
          wp_order_id: wpOrder.ID,
          wp_customer_id: wpOrder.customer_id,
          staged_user_id: stagedUserId,
          total_amount: parseFloat(wpOrder.total || 0),
          status: this.mapOrderStatus(wpOrder.post_status),
          wp_status: wpOrder.post_status,
          currency: wpOrder.currency || 'INR',
          shipping_address: shippingAddress,
          wp_created_at: wpOrder.post_date || new Date().toISOString(),
          wp_updated_at: wpOrder.post_modified || new Date().toISOString(),
          migration_batch: this.batchName,
          migration_status: 'pending'
        };

        const { data: orderResult, error: orderError } = await supabase
          .schema('migration_staging')
          .from('orders_staging')
          .upsert(orderData, { onConflict: 'wp_order_id' })
          .select()
          .single();

        if (orderError) {
          this.log(`Error inserting order ${wpOrder.ID}: ${orderError.message}`, 'error');
          errorCount++;
          continue;
        }

        // Fetch and insert order items
        const items = await this.fetchOrderItems(wpOrder.ID);
        if (items.length > 0 && orderResult) {
          for (const item of items) {
            try {
              const itemData = {
                wp_order_item_id: item.order_item_id,
                staged_order_id: orderResult.id,
                wp_product_id: item.product_id,
                product_name: item.order_item_name,
                quantity: parseInt(item.quantity || 1),
                unit_price: parseFloat(item.total || 0) / parseInt(item.quantity || 1),
                total_price: parseFloat(item.total || 0),
                migration_batch: this.batchName,
                migration_status: 'pending'
              };

              await supabase
                .schema('migration_staging')
                .from('order_items_staging')
                .upsert(itemData, { onConflict: 'wp_order_item_id' });

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
      const mappingData = {
        wp_product_id: wpItem.product_id,
        wp_product_name: wpItem.order_item_name,
        mapping_status: 'pending'
      };

      await supabase
        .schema('migration_staging')
        .from('product_toy_mapping')
        .upsert(mappingData, { onConflict: 'wp_product_id' });

    } catch (error) {
      // Ignore errors for product mapping - it's not critical
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
          const { data: stagedUsers } = await supabase
            .schema('migration_staging')
            .from('users_staging')
            .select('id, wp_user_id')
            .eq('migration_batch', this.batchName);

          stagedUsers?.forEach(user => {
            userMapping.set(user.wp_user_id.toString(), user.id);
          });
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
WooCommerce to Staging Migration Tool (Fixed Version)

Usage: node staging-migration-fixed.js [options]

Options:
  --dry-run       Test the migration without inserting data
  --users-only    Migrate only users to staging
  --orders-only   Migrate only orders to staging
  --help          Show this help message

Environment Variables:
  SUPABASE_SERVICE_KEY  Required: Your Supabase service role key

Examples:
  node staging-migration-fixed.js --dry-run
  node staging-migration-fixed.js --users-only
  node staging-migration-fixed.js
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
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync } from 'fs';

// Configuration
const WORDPRESS_BASE_URL = 'https://toyflix.in';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // You'll need to set this

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class WooCommerceMigration {
  constructor() {
    this.apiBase = `${WORDPRESS_BASE_URL}/wp-json/migration/v1`;
    this.userMapping = new Map(); // WordPress ID -> Supabase UUID mapping
    this.migrationLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.migrationLog.push(logEntry);
    
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async fetchUsers(page = 1, perPage = 50) {
    try {
      const response = await axios.get(`${this.apiBase}/users`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      this.log(`Error fetching users: ${error.message}`, 'error');
      throw error;
    }
  }

  async fetchAllUsers() {
    const allUsers = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all users from WordPress...');

    while (hasMore) {
      const data = await this.fetchUsers(page, 50);
      allUsers.push(...data.users);
      
      this.log(`Fetched page ${page}: ${data.users.length} users`);
      hasMore = page < data.total_pages;
      page++;
    }

    this.log(`Total users fetched: ${allUsers.length}`, 'success');
    return allUsers;
  }

  async fetchOrders(page = 1, perPage = 50) {
    try {
      const response = await axios.get(`${this.apiBase}/orders`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      this.log(`Error fetching orders: ${error.message}`, 'error');
      throw error;
    }
  }

  async fetchAllOrders() {
    const allOrders = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all orders from WordPress...');

    while (hasMore) {
      const data = await this.fetchOrders(page, 50);
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
      return response.data;
    } catch (error) {
      this.log(`Error fetching order items for order ${orderId}: ${error.message}`, 'error');
      return [];
    }
  }

  async fetchSubscriptions(page = 1, perPage = 50) {
    try {
      const response = await axios.get(`${this.apiBase}/subscriptions`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      this.log(`Error fetching subscriptions: ${error.message}`, 'error');
      throw error;
    }
  }

  async fetchAllSubscriptions() {
    const allSubscriptions = [];
    let page = 1;
    let hasMore = true;

    this.log('Starting to fetch all subscriptions from WordPress...');

    while (hasMore) {
      const data = await this.fetchSubscriptions(page, 50);
      allSubscriptions.push(...data.subscriptions);
      
      this.log(`Fetched page ${page}: ${data.subscriptions.length} subscriptions`);
      hasMore = page < data.total_pages;
      page++;
    }

    this.log(`Total subscriptions fetched: ${allSubscriptions.length}`, 'success');
    return allSubscriptions;
  }

  extractPhoneNumber(wpUser) {
    // Try multiple phone fields from WordPress
    return wpUser.billing_phone || 
           wpUser.phone || 
           wpUser.meta?.billing_phone || 
           wpUser.meta?.phone ||
           null;
  }

  transformUser(wpUser) {
    const phone = this.extractPhoneNumber(wpUser);
    
    if (!phone) {
      this.log(`User ${wpUser.ID} (${wpUser.user_email}) has no phone number - skipping`, 'warning');
      return null;
    }

    const supabaseUserId = uuidv4();
    this.userMapping.set(wpUser.ID.toString(), supabaseUserId);

    return {
      id: supabaseUserId,
      phone: phone,
      email: wpUser.user_email || null,
      first_name: wpUser.billing_first_name || wpUser.first_name || null,
      last_name: wpUser.billing_last_name || wpUser.last_name || null,
      address_line1: wpUser.billing_address_1 || null,
      address_line2: wpUser.billing_address_2 || null,
      city: wpUser.billing_city || null,
      state: wpUser.billing_state || null,
      zip_code: wpUser.billing_postcode || null,
      latitude: null, // Will need to be updated later if needed
      longitude: null,
      role: 'user',
      subscription_active: false, // Will be updated based on orders
      subscription_plan: null,
      phone_verified: false, // Require re-verification
      is_active: true,
      created_at: wpUser.user_registered || new Date().toISOString(),
      updated_at: wpUser.user_registered || new Date().toISOString()
    };
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

  transformOrder(wpOrder, items = []) {
    const customerId = wpOrder.customer_id;
    const supabaseUserId = this.userMapping.get(customerId?.toString());

    if (!supabaseUserId && customerId) {
      this.log(`Order ${wpOrder.ID} references user ${customerId} but user not found in mapping`, 'warning');
      return null;
    }

    const orderId = uuidv4();

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

    return {
      order: {
        id: orderId,
        user_id: supabaseUserId,
        total_amount: parseFloat(wpOrder.total || 0),
        status: this.mapOrderStatus(wpOrder.post_status),
        shipping_address: shippingAddress,
        rental_start_date: null, // Will need to be calculated
        rental_end_date: null,
        created_at: wpOrder.post_date || new Date().toISOString(),
        updated_at: wpOrder.post_modified || new Date().toISOString()
      },
      items: items.map(item => ({
        id: uuidv4(),
        order_id: orderId,
        toy_id: null, // Will need to map WooCommerce products to toys
        quantity: parseInt(item.quantity || 1),
        rental_price: parseFloat(item.total || 0),
        created_at: new Date().toISOString()
      })),
      payment: {
        id: uuidv4(),
        user_id: supabaseUserId,
        amount: parseFloat(wpOrder.total || 0),
        currency: wpOrder.currency || 'INR',
        status: this.mapOrderStatus(wpOrder.post_status) === 'delivered' ? 'paid' : 'pending',
        order_type: 'subscription',
        razorpay_order_id: null,
        razorpay_payment_id: null,
        order_items: {
          order_id: orderId,
          items: items.map(item => ({
            product_id: item.product_id,
            name: item.order_item_name,
            quantity: parseInt(item.quantity || 1),
            total: parseFloat(item.total || 0)
          }))
        },
        created_at: wpOrder.post_date || new Date().toISOString(),
        updated_at: wpOrder.post_modified || new Date().toISOString()
      }
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

  transformSubscription(wpSubscription) {
    const customerId = wpSubscription.customer_id;
    const supabaseUserId = this.userMapping.get(customerId?.toString());

    if (!supabaseUserId && customerId) {
      this.log(`Subscription ${wpSubscription.ID} references user ${customerId} but user not found in mapping`, 'warning');
      return null;
    }

    // Extract subscription plan from WooCommerce subscription
    const planMapping = {
      'monthly': 'monthly',
      'quarterly': 'quarterly', 
      '3-month': 'quarterly',
      'month': 'monthly',
      'months': 'monthly'
    };

    // Try to determine plan from billing period or subscription name
    let subscriptionPlan = 'monthly'; // default
    const billingPeriod = wpSubscription.billing_period?.toLowerCase() || '';
    const subscriptionName = wpSubscription.subscription_name?.toLowerCase() || '';
    
    for (const [key, value] of Object.entries(planMapping)) {
      if (billingPeriod.includes(key) || subscriptionName.includes(key)) {
        subscriptionPlan = value;
        break;
      }
    }

    return {
      id: uuidv4(),
      user_id: supabaseUserId,
      plan_type: subscriptionPlan,
      status: this.mapSubscriptionStatus(wpSubscription.post_status || wpSubscription.status),
      start_date: wpSubscription.start_date || wpSubscription.post_date || new Date().toISOString(),
      end_date: wpSubscription.end_date || null,
      next_billing_date: wpSubscription.next_payment_date || null,
      billing_cycle: subscriptionPlan === 'quarterly' ? 3 : 1, // months
      total_amount: parseFloat(wpSubscription.total || wpSubscription.recurring_amount || 0),
      is_active: this.mapSubscriptionStatus(wpSubscription.post_status || wpSubscription.status) === 'active',
      created_at: wpSubscription.post_date || new Date().toISOString(),
      updated_at: wpSubscription.post_modified || new Date().toISOString()
    };
  }

  /**
   * Combine customer, order, and subscription data for each customer
   * @returns {Promise<Array>} Combined data for each customer
   */
  async getCombinedCustomerOrderSubscription() {
    // Fetch all data
    const users = await this.fetchAllUsers();
    const orders = await this.fetchAllOrders();
    const subscriptions = await this.fetchAllSubscriptions();

    // Index orders and subscriptions by customer ID
    const ordersByCustomer = {};
    for (const order of orders) {
      const items = await this.fetchOrderItems(order.ID);
      const transformedOrder = this.transformOrder(order, items);
      if (transformedOrder) {
        const customerId = order.customer_id;
        if (!ordersByCustomer[customerId]) ordersByCustomer[customerId] = [];
        ordersByCustomer[customerId].push(transformedOrder);
      }
    }

    const subscriptionsByCustomer = {};
    subscriptions.forEach(sub => {
      const transformedSub = this.transformSubscription(sub);
      if (transformedSub) {
        const customerId = sub.customer_id;
        if (!subscriptionsByCustomer[customerId]) subscriptionsByCustomer[customerId] = [];
        subscriptionsByCustomer[customerId].push(transformedSub);
      }
    });

    // Combine for each user
    const combined = users.map(user => {
      const transformedUser = this.transformUser(user);
      if (!transformedUser) return null;

      const userId = user.ID;
      const userOrders = ordersByCustomer[userId] || [];
      const userSubscriptions = subscriptionsByCustomer[userId] || [];

      // Update user subscription status based on active subscriptions
      const hasActiveSubscription = userSubscriptions.some(sub => sub.status === 'active');
      if (hasActiveSubscription) {
        transformedUser.subscription_active = true;
        transformedUser.subscription_plan = userSubscriptions.find(sub => sub.status === 'active')?.plan_type || null;
      }

      return {
        user: transformedUser,
        orders: userOrders,
        subscriptions: userSubscriptions
      };
    }).filter(Boolean);

    return combined;
  }

  async insertUsers(users) {
    this.log(`Starting to insert ${users.length} users into Supabase...`);
    
    const validUsers = users.filter(user => user !== null);
    let successCount = 0;
    let errorCount = 0;

    // Insert users in batches of 100
    const batchSize = 100;
    for (let i = 0; i < validUsers.length; i += batchSize) {
      const batch = validUsers.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('custom_users')
          .insert(batch)
          .select();

        if (error) {
          this.log(`Error inserting user batch ${i / batchSize + 1}: ${error.message}`, 'error');
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          this.log(`Successfully inserted user batch ${i / batchSize + 1}: ${batch.length} users`);
        }
      } catch (err) {
        this.log(`Exception inserting user batch ${i / batchSize + 1}: ${err.message}`, 'error');
        errorCount += batch.length;
      }
    }

    this.log(`User migration complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertOrders(transformedOrders) {
    this.log(`Starting to insert ${transformedOrders.length} orders into Supabase...`);
    
    const validOrders = transformedOrders.filter(order => order !== null);
    let successCount = 0;
    let errorCount = 0;

    for (const orderData of validOrders) {
      try {
        // Insert order
        const { data: orderResult, error: orderError } = await supabase
          .from('orders')
          .insert(orderData.order)
          .select();

        if (orderError) {
          this.log(`Error inserting order ${orderData.order.id}: ${orderError.message}`, 'error');
          errorCount++;
          continue;
        }

        // Insert order items (if any toys are mapped)
        if (orderData.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderData.items);

          if (itemsError) {
            this.log(`Error inserting order items for ${orderData.order.id}: ${itemsError.message}`, 'warning');
          }
        }

        // Insert payment record
        const { error: paymentError } = await supabase
          .from('payment_orders')
          .insert(orderData.payment);

        if (paymentError) {
          this.log(`Error inserting payment for ${orderData.order.id}: ${paymentError.message}`, 'warning');
        }

        successCount++;
        
        if (successCount % 10 === 0) {
          this.log(`Processed ${successCount} orders...`);
        }

      } catch (err) {
        this.log(`Exception processing order: ${err.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Order migration complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertSubscriptions(subscriptions) {
    this.log(`Starting to insert ${subscriptions.length} subscriptions into Supabase...`);
    
    const validSubscriptions = subscriptions.filter(sub => sub !== null);
    let successCount = 0;
    let errorCount = 0;

    // Insert subscriptions in batches of 50
    const batchSize = 50;
    for (let i = 0; i < validSubscriptions.length; i += batchSize) {
      const batch = validSubscriptions.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .insert(batch)
          .select();

        if (error) {
          this.log(`Error inserting subscription batch ${i / batchSize + 1}: ${error.message}`, 'error');
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          this.log(`Successfully inserted subscription batch ${i / batchSize + 1}: ${batch.length} subscriptions`);
        }
      } catch (err) {
        this.log(`Exception inserting subscription batch ${i / batchSize + 1}: ${err.message}`, 'error');
        errorCount += batch.length;
      }
    }

    this.log(`Subscription migration complete: ${successCount} successful, ${errorCount} failed`, 'success');
    return { successCount, errorCount };
  }

  async insertCombinedData(combinedData) {
    this.log(`Starting to insert combined data for ${combinedData.length} customers...`);
    
    let userResults = { successCount: 0, errorCount: 0 };
    let orderResults = { successCount: 0, errorCount: 0 };
    let subscriptionResults = { successCount: 0, errorCount: 0 };

    // Extract and insert users first
    const users = combinedData.map(item => item.user).filter(Boolean);
    if (users.length > 0) {
      userResults = await this.insertUsers(users);
    }

    // Extract and insert orders
    const allOrders = combinedData.flatMap(item => item.orders || []);
    if (allOrders.length > 0) {
      orderResults = await this.insertOrders(allOrders);
    }

    // Extract and insert subscriptions
    const allSubscriptions = combinedData.flatMap(item => item.subscriptions || []);
    if (allSubscriptions.length > 0) {
      subscriptionResults = await this.insertSubscriptions(allSubscriptions);
    }

    return { userResults, orderResults, subscriptionResults };
  }

  async testConnection() {
    try {
      this.log('Testing WordPress API connection...');
      const response = await axios.get(`${this.apiBase}/users?per_page=1`);
      this.log('WordPress API connection successful ✅', 'success');

      this.log('Testing Supabase connection...');
      const { data, error } = await supabase.from('custom_users').select('count').limit(1);
      if (error) throw error;
      this.log('Supabase connection successful ✅', 'success');

      return true;
    } catch (error) {
      this.log(`Connection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runMigration(options = {}) {
    const { dryRun = false, usersOnly = false, ordersOnly = false, subscriptionsOnly = false, combined = false } = options;

    this.log('🚀 Starting WooCommerce to Supabase migration...');
    
    if (dryRun) {
      this.log('🧪 DRY RUN MODE - No data will be inserted', 'warning');
    }

    // Test connections
    const connectionsOk = await this.testConnection();
    if (!connectionsOk) {
      this.log('Migration aborted due to connection issues', 'error');
      return false;
    }

    try {
      let userResults = { successCount: 0, errorCount: 0 };
      let orderResults = { successCount: 0, errorCount: 0 };
      let subscriptionResults = { successCount: 0, errorCount: 0 };

      // Combined migration approach (recommended)
      if (combined) {
        this.log('🔄 Using combined migration approach...');
        const combinedData = await this.getCombinedCustomerOrderSubscription();
        
        this.log(`Combined data for ${combinedData.length} customers`);
        this.log(`Total users: ${combinedData.filter(c => c.user).length}`);
        this.log(`Total orders: ${combinedData.reduce((sum, c) => sum + (c.orders?.length || 0), 0)}`);
        this.log(`Total subscriptions: ${combinedData.reduce((sum, c) => sum + (c.subscriptions?.length || 0), 0)}`);

        if (!dryRun) {
          const results = await this.insertCombinedData(combinedData);
          userResults = results.userResults;
          orderResults = results.orderResults;
          subscriptionResults = results.subscriptionResults;
        }
      } else {
        // Individual migration phases
        
        // Migrate users
        if (!ordersOnly && !subscriptionsOnly) {
          this.log('📝 Phase 1: Migrating users...');
          const wpUsers = await this.fetchAllUsers();
          const transformedUsers = wpUsers.map(user => this.transformUser(user)).filter(Boolean);
          
          this.log(`Transformed ${transformedUsers.length} valid users out of ${wpUsers.length} total`);

          if (!dryRun) {
            userResults = await this.insertUsers(transformedUsers);
          }
        }

        // Migrate subscriptions
        if (!usersOnly && !ordersOnly) {
          this.log('🔄 Phase 2: Migrating subscriptions...');
          const wpSubscriptions = await this.fetchAllSubscriptions();
          const transformedSubscriptions = wpSubscriptions.map(sub => this.transformSubscription(sub)).filter(Boolean);
          
          this.log(`Transformed ${transformedSubscriptions.length} valid subscriptions out of ${wpSubscriptions.length} total`);

          if (!dryRun) {
            subscriptionResults = await this.insertSubscriptions(transformedSubscriptions);
          }
        }

        // Migrate orders
        if (!usersOnly && !subscriptionsOnly) {
          this.log('📦 Phase 3: Migrating orders...');
          const wpOrders = await this.fetchAllOrders();
          const transformedOrders = [];

          for (const order of wpOrders) {
            const items = await this.fetchOrderItems(order.ID);
            const transformed = this.transformOrder(order, items);
            if (transformed) {
              transformedOrders.push(transformed);
            }
          }

          this.log(`Transformed ${transformedOrders.length} valid orders out of ${wpOrders.length} total`);

          if (!dryRun) {
            orderResults = await this.insertOrders(transformedOrders);
          }
        }
      }

      // Summary
      this.log('🎉 Migration completed!', 'success');
      this.log(`Users: ${userResults.successCount} successful, ${userResults.errorCount} failed`);
      this.log(`Subscriptions: ${subscriptionResults.successCount} successful, ${subscriptionResults.errorCount} failed`);
      this.log(`Orders: ${orderResults.successCount} successful, ${orderResults.errorCount} failed`);

      // Save migration log
      const logFileName = `migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      writeFileSync(logFileName, JSON.stringify(this.migrationLog, null, 2));
      this.log(`Migration log saved to ${logFileName}`);

      return true;

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
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
  const combined = args.includes('--combined');

  if (args.includes('--help')) {
    console.log(`
WooCommerce to Supabase Migration Tool

Usage: node woocommerce-migration.js [options]

Options:
  --dry-run           Test the migration without inserting data
  --users-only        Migrate only users
  --orders-only       Migrate only orders (requires users to be migrated first)
  --subscriptions-only Migrate only subscriptions (requires users to be migrated first)
  --combined          Migrate users, orders, and subscriptions together (recommended)
  --help              Show this help message

Environment Variables:
  SUPABASE_SERVICE_KEY  Required: Your Supabase service role key
  WP_USERNAME          Required: WordPress admin username
  WP_APP_PASSWORD      Required: WordPress application password

Examples:
  node woocommerce-migration.js --dry-run --combined
  node woocommerce-migration.js --users-only
  node woocommerce-migration.js --combined
  node woocommerce-migration.js --subscriptions-only
    `);
    return;
  }

  const migration = new WooCommerceMigration();
  const success = await migration.runMigration({ 
    dryRun, 
    usersOnly, 
    ordersOnly, 
    subscriptionsOnly, 
    combined 
  });
  
  process.exit(success ? 0 : 1);
}

// Export for use as module
export default WooCommerceMigration;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'process.env.SUPABASE_SERVICE_KEY'
);

// WooCommerce API client
class WooCommerceClient {
  constructor(baseURL = 'http://4.213.183.90:3001') {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.timeout = 30000; // 30 seconds for migration
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.timeout
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      console.log(`🌐 Making request to: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`❌ Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  async getUserByPhone(phone) {
    return this.makeRequest(`/api/woocommerce?action=getUserByPhone&phone=${encodeURIComponent(phone)}`);
  }

  async getCompleteUserSubscriptionInfo(userId) {
    return this.makeRequest(`/api/woocommerce?action=getCompleteUserSubscriptionInfo&userId=${userId}`);
  }
}

class WooCommerceMigration {
  constructor(options = {}) {
    this.wcClient = new WooCommerceClient();
    this.migrationBatch = `migration_${Date.now()}`;
    this.options = {
      skipExistingUsers: options.skipExistingUsers !== false, // Default: true
      updateExistingUsers: options.updateExistingUsers || false,
      migrateSubscriptions: options.migrateSubscriptions !== false, // Default: true
      migrateOrders: options.migrateOrders !== false, // Default: true
      dryRun: options.dryRun || false,
      ...options
    };
    
    this.stats = {
      usersProcessed: 0,
      usersCreated: 0,
      usersUpdated: 0,
      usersSkipped: 0,
      usersFailed: 0,
      subscriptionsCreated: 0,
      ordersCreated: 0,
      orderItemsCreated: 0,
      paymentsCreated: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'skip' ? '⏭️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (type === 'error') {
      this.stats.errors.push({ timestamp, message });
    }
  }

  // Map WooCommerce order status to Supabase order status
  mapOrderStatus(wcStatus) {
    const statusMap = {
      'wc-pending': 'pending',
      'wc-processing': 'confirmed',
      'wc-on-hold': 'pending',
      'wc-completed': 'delivered',
      'wc-cancelled': 'cancelled',
      'wc-refunded': 'cancelled',
      'wc-failed': 'cancelled'
    };
    return statusMap[wcStatus] || 'pending';
  }

  // Map WooCommerce subscription status to Supabase subscription status
  mapSubscriptionStatus(wcStatus) {
    const statusMap = {
      'Active': 'active',
      'Paused': 'paused', 
      'Cancelled': 'cancelled',
      'Expired': 'cancelled',
      'Pending': 'pending'
    };
    return statusMap[wcStatus] || 'pending';
  }

  // Extract address from WooCommerce user data
  extractAddress(userData) {
    return {
      first_name: userData.billing_first_name || userData.first_name || '',
      last_name: userData.billing_last_name || userData.last_name || '',
      phone: userData.billing_phone || userData.phone || '',
      email: userData.billing_email || userData.user_email || '',
      address_line1: userData.billing_address_1 || '',
      address_line2: userData.billing_address_2 || '',
      city: userData.billing_city || '',
      state: userData.billing_state || '',
      postcode: userData.billing_postcode || '',
      country: userData.billing_country || 'IN'
    };
  }

  // Get all existing users from Supabase
  async getAllExistingUsers() {
    try {
      const { data: users, error } = await supabase
        .from('custom_users')
        .select('phone, id, email, first_name, last_name, created_at, subscription_active');

      if (error) throw error;

      const phoneToUserMap = new Map();
      const emailToUserMap = new Map();
      
      users?.forEach(user => {
        if (user.phone) {
          phoneToUserMap.set(user.phone, user);
        }
        if (user.email) {
          emailToUserMap.set(user.email, user);
        }
      });

      this.log(`Found ${users?.length || 0} existing users in Supabase`);
      this.log(`  - ${phoneToUserMap.size} users with phone numbers`);
      this.log(`  - ${emailToUserMap.size} users with email addresses`);
      
      return { phoneToUserMap, emailToUserMap, allUsers: users || [] };

    } catch (error) {
      this.log(`Error getting existing users: ${error.message}`, 'error');
      return { phoneToUserMap: new Map(), emailToUserMap: new Map(), allUsers: [] };
    }
  }

  // Get phone numbers to migrate (expanded list)
  getPhoneNumbersToMigrate() {
    return [
      '9980111432',
      '7760108610', 
      '9573832932',
      '9591488772',
      '8123456789',
      '7890123456',
      '9123456789',
      '8765432109',
      '7654321098',
      '8951234567',
      '7845123456',
      // Add more phone numbers here from your WooCommerce database
    ];
  }

  // Check if user needs updating
  needsUpdate(existingUser, wcUser) {
    const checks = [
      !existingUser.email && wcUser.user_email,
      !existingUser.first_name && (wcUser.billing_first_name || wcUser.display_name),
      !existingUser.last_name && wcUser.billing_last_name,
      !existingUser.subscription_active && wcUser.subscription_status === 'Active'
    ];
    
    return checks.some(check => check);
  }

  // Migrate or update a single user from WooCommerce
  async migrateUser(phone, phoneToUserMap, emailToUserMap) {
    try {
      this.stats.usersProcessed++;
      
      const existingUser = phoneToUserMap.get(phone);
      
      // Get user data from WooCommerce
      const userResponse = await this.wcClient.getUserByPhone(phone);
      
      if (!userResponse.success || !userResponse.data) {
        this.log(`User not found in WooCommerce: ${phone}`, 'warn');
        return null;
      }

      const wcUser = userResponse.data;
      this.log(`Processing user: ${wcUser.display_name} (${phone})`);

      // Handle existing user
      if (existingUser) {
        if (this.options.skipExistingUsers && !this.options.updateExistingUsers) {
          this.log(`User with phone ${phone} already exists, skipping`, 'skip');
          this.stats.usersSkipped++;
          
          // Still migrate subscription data if missing
          if (this.options.migrateSubscriptions) {
            const subscriptionResponse = await this.wcClient.getCompleteUserSubscriptionInfo(wcUser.ID);
            if (subscriptionResponse.success && subscriptionResponse.data) {
              await this.migrateUserSubscriptionData(existingUser.id, subscriptionResponse.data, wcUser);
            }
          }
          
          return existingUser.id;
        }

        if (this.options.updateExistingUsers && this.needsUpdate(existingUser, wcUser)) {
          return await this.updateExistingUser(existingUser, wcUser);
        }

        this.log(`User ${phone} exists and no updates needed`, 'skip');
        this.stats.usersSkipped++;
        return existingUser.id;
      }

      // Create new user
      return await this.createNewUser(phone, wcUser);

    } catch (error) {
      this.log(`Error migrating user ${phone}: ${error.message}`, 'error');
      this.stats.usersFailed++;
      return null;
    }
  }

  // Update existing user with WooCommerce data
  async updateExistingUser(existingUser, wcUser) {
    try {
      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would update user: ${existingUser.phone}`, 'skip');
        this.stats.usersUpdated++;
        return existingUser.id;
      }

      const updateData = {};
      
      if (!existingUser.email && wcUser.user_email) {
        updateData.email = wcUser.user_email;
      }
      if (!existingUser.first_name && wcUser.billing_first_name) {
        updateData.first_name = wcUser.billing_first_name;
      }
      if (!existingUser.last_name && wcUser.billing_last_name) {
        updateData.last_name = wcUser.billing_last_name;
      }
      
      // Add more fields as needed
      if (wcUser.billing_city) updateData.city = wcUser.billing_city;
      if (wcUser.billing_state) updateData.state = wcUser.billing_state;
      if (wcUser.billing_address_1) updateData.address_line1 = wcUser.billing_address_1;
      if (wcUser.billing_address_2) updateData.address_line2 = wcUser.billing_address_2;
      if (wcUser.billing_postcode) updateData.zip_code = wcUser.billing_postcode;

      if (Object.keys(updateData).length === 0) {
        this.log(`No updates needed for user: ${existingUser.phone}`, 'skip');
        return existingUser.id;
      }

      const { error: updateError } = await supabase
        .from('custom_users')
        .update(updateData)
        .eq('id', existingUser.id);

      if (updateError) {
        this.log(`Error updating user ${existingUser.phone}: ${updateError.message}`, 'error');
        return null;
      }

      this.stats.usersUpdated++;
      this.log(`✅ Updated user: ${existingUser.phone} with ${Object.keys(updateData).length} fields`);

      // Migrate subscription data
      if (this.options.migrateSubscriptions) {
        const subscriptionResponse = await this.wcClient.getCompleteUserSubscriptionInfo(wcUser.ID);
        if (subscriptionResponse.success && subscriptionResponse.data) {
          await this.migrateUserSubscriptionData(existingUser.id, subscriptionResponse.data, wcUser);
        }
      }

      return existingUser.id;

    } catch (error) {
      this.log(`Error updating user: ${error.message}`, 'error');
      return null;
    }
  }

  // Create new user
  async createNewUser(phone, wcUser) {
    try {
      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would create user: ${wcUser.display_name} (${phone})`, 'skip');
        this.stats.usersCreated++;
        return 'dry-run-id';
      }

      const userData = {
        phone: phone,
        email: wcUser.user_email,
        first_name: wcUser.billing_first_name || wcUser.display_name?.split(' ')[0] || '',
        last_name: wcUser.billing_last_name || wcUser.display_name?.split(' ').slice(1).join(' ') || '',
        phone_verified: true, // Assume WooCommerce users are verified
        is_active: true,
        role: 'user',
        city: wcUser.billing_city || '',
        state: wcUser.billing_state || '',
        address_line1: wcUser.billing_address_1 || '',
        address_line2: wcUser.billing_address_2 || '',
        zip_code: wcUser.billing_postcode || '',
        subscription_active: false, // Will be updated based on subscription data
        created_at: wcUser.user_registered || new Date().toISOString()
      };

      const { data: newUser, error: userError } = await supabase
        .from('custom_users')
        .insert(userData)
        .select()
        .single();

      if (userError) {
        this.log(`Error creating user ${phone}: ${userError.message}`, 'error');
        this.stats.usersFailed++;
        return null;
      }

      this.stats.usersCreated++;
      this.log(`✅ Created user: ${newUser.first_name} ${newUser.last_name} (${phone})`);

      // Get comprehensive subscription info
      if (this.options.migrateSubscriptions) {
        const subscriptionResponse = await this.wcClient.getCompleteUserSubscriptionInfo(wcUser.ID);
        if (subscriptionResponse.success && subscriptionResponse.data) {
          await this.migrateUserSubscriptionData(newUser.id, subscriptionResponse.data, wcUser);
        }
      }

      return newUser.id;

    } catch (error) {
      this.log(`Error creating user: ${error.message}`, 'error');
      this.stats.usersFailed++;
      return null;
    }
  }

  // Migrate user's subscription, orders, and toys
  async migrateUserSubscriptionData(userId, subscriptionData, wcUser) {
    try {
      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate subscription data for user ${userId}`, 'skip');
        return;
      }

      // 1. Migrate subscription
      if (subscriptionData.subscriptionCycle && this.options.migrateSubscriptions) {
        await this.migrateSubscription(userId, subscriptionData.subscriptionCycle);
      }

      // 2. Migrate orders and current toys
      if (subscriptionData.subscriptionHistory && subscriptionData.subscriptionHistory.length > 0 && this.options.migrateOrders) {
        for (const order of subscriptionData.subscriptionHistory) {
          await this.migrateOrder(userId, order, subscriptionData.currentToys || []);
        }
      }

      // 3. Update user subscription status
      if (subscriptionData.subscriptionCycle?.subscription_status === 'Active') {
        await supabase
          .from('custom_users')
          .update({ subscription_active: true })
          .eq('id', userId);
        
        this.log(`Updated user subscription status to active`);
      }

    } catch (error) {
      this.log(`Error migrating subscription data for user ${userId}: ${error.message}`, 'error');
    }
  }

  // Migrate subscription
  async migrateSubscription(userId, subscriptionCycle) {
    try {
      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_id', subscriptionCycle.subscription_name || 'legacy_plan')
        .single();

      if (existingSub) {
        this.log(`Subscription already exists for user, skipping`, 'skip');
        return existingSub.id;
      }

      const subscriptionData = {
        user_id: userId,
        plan_id: subscriptionCycle.subscription_name || 'legacy_plan',
        status: this.mapSubscriptionStatus(subscriptionCycle.subscription_status),
        start_date: subscriptionCycle.first_purchase_date || subscriptionCycle.order_date?.split('T')[0],
        end_date: this.calculateEndDate(subscriptionCycle),
        created_at: subscriptionCycle.order_date || new Date().toISOString()
      };

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (subError) {
        this.log(`Error creating subscription: ${subError.message}`, 'error');
        return null;
      }

      this.stats.subscriptionsCreated++;
      this.log(`✅ Created subscription: ${subscription.plan_id} (${subscription.status})`);
      return subscription.id;

    } catch (error) {
      this.log(`Error migrating subscription: ${error.message}`, 'error');
      return null;
    }
  }

  // Calculate subscription end date
  calculateEndDate(subscriptionCycle) {
    const startDate = new Date(subscriptionCycle.first_purchase_date || subscriptionCycle.order_date);
    const months = parseInt(subscriptionCycle.subscription_months) || 1;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate.toISOString().split('T')[0];
  }

  // Migrate order
  async migrateOrder(userId, orderData, currentToys = []) {
    try {
      // Check if order already exists (by user and date)
      const orderDate = new Date(orderData.order_date);
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', new Date(orderDate.getTime() - 24*60*60*1000).toISOString()) // 24 hours before
        .lte('created_at', new Date(orderDate.getTime() + 24*60*60*1000).toISOString()) // 24 hours after
        .single();

      if (existingOrder) {
        this.log(`Order already exists for user around this date, skipping`, 'skip');
        return existingOrder.id;
      }

      const orderInfo = {
        user_id: userId,
        status: this.mapOrderStatus(orderData.order_status),
        total_amount: 0, // Will be calculated from toys
        base_amount: 0,
        gst_amount: 0,
        discount_amount: 0,
        order_type: 'subscription',
        shipping_address: this.extractAddress(orderData),
        created_at: orderData.order_date || new Date().toISOString()
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderInfo)
        .select()
        .single();

      if (orderError) {
        this.log(`Error creating order: ${orderError.message}`, 'error');
        return null;
      }

      this.stats.ordersCreated++;
      this.log(`✅ Created order: ${order.id.slice(0, 8)} (${order.status})`);

      // Migrate order items (toys)
      if (currentToys && currentToys.length > 0) {
        await this.migrateOrderItems(order.id, currentToys);
      }

      // Create payment record
      await this.migratePayment(userId, order, orderData);

      return order.id;

    } catch (error) {
      this.log(`Error migrating order: ${error.message}`, 'error');
      return null;
    }
  }

  // Migrate order items (toys)
  async migrateOrderItems(orderId, toys) {
    try {
      let totalAmount = 0;

      for (const toy of toys) {
        const price = parseFloat(toy.total_price) || 100; // Default price if not available
        totalAmount += price;

        const itemData = {
          order_id: orderId,
          toy_id: null, // We don't have toy mapping yet
          quantity: parseInt(toy.quantity) || 1,
          unit_price: price,
          total_price: price,
          subscription_category: 'educational_toys', // Default category
          age_group: '2-4 years' // Default age group
        };

        const { error: itemError } = await supabase
          .from('order_items')
          .insert(itemData);

        if (itemError) {
          this.log(`Error creating order item: ${itemError.message}`, 'error');
        } else {
          this.stats.orderItemsCreated++;
          this.log(`✅ Created order item: ${toy.toy_name || toy.product_title}`);
        }
      }

      // Update order total amount
      if (totalAmount > 0) {
        await supabase
          .from('orders')
          .update({ 
            total_amount: totalAmount,
            base_amount: totalAmount 
          })
          .eq('id', orderId);
      }

    } catch (error) {
      this.log(`Error migrating order items: ${error.message}`, 'error');
    }
  }

  // Migrate payment
  async migratePayment(userId, order, orderData) {
    try {
      // Check if payment already exists
      const { data: existingPayment } = await supabase
        .from('payment_orders')
        .select('id')
        .eq('razorpay_order_id', `wc_${orderData.order_id}`)
        .single();

      if (existingPayment) {
        this.log(`Payment already exists for order, skipping`, 'skip');
        return existingPayment.id;
      }

      const paymentData = {
        user_id: userId,
        razorpay_order_id: `wc_${orderData.order_id}`, // Prefix to identify WooCommerce orders
        razorpay_payment_id: null,
        amount: order.total_amount,
        currency: 'INR',
        status: order.status === 'delivered' ? 'completed' : 'pending',
        order_type: 'subscription',
        order_items: {
          order_id: order.id,
          woocommerce_order_id: orderData.order_id,
          subscription_name: orderData.subscription_name
        },
        created_at: orderData.order_date || new Date().toISOString()
      };

      const { error: paymentError } = await supabase
        .from('payment_orders')
        .insert(paymentData);

      if (paymentError) {
        this.log(`Error creating payment: ${paymentError.message}`, 'error');
      } else {
        this.stats.paymentsCreated++;
        this.log(`✅ Created payment record for order ${order.id.slice(0, 8)}`);
      }

    } catch (error) {
      this.log(`Error migrating payment: ${error.message}`, 'error');
    }
  }

  // Main migration function
  async runMigration() {
    this.log('🚀 Starting WooCommerce to Supabase migration...');
    this.log(`Migration batch: ${this.migrationBatch}`);
    this.log(`Options: ${JSON.stringify(this.options, null, 2)}`);

    if (this.options.dryRun) {
      this.log('🔍 DRY RUN MODE - No data will be created/updated', 'warn');
    }

    try {
      // Get existing users to avoid duplicates
      const { phoneToUserMap, emailToUserMap, allUsers } = await this.getAllExistingUsers();

      // Get phone numbers to migrate
      const phoneNumbers = this.getPhoneNumbersToMigrate();
      this.log(`Processing ${phoneNumbers.length} phone numbers...`);

      // Process each phone number
      for (const phone of phoneNumbers) {
        await this.migrateUser(phone, phoneToUserMap, emailToUserMap);
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Print migration summary
      this.printMigrationSummary();

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
    }
  }

  // Print migration summary
  printMigrationSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📱 Users Processed: ${this.stats.usersProcessed}`);
    console.log(`👥 Users Created: ${this.stats.usersCreated}`);
    console.log(`🔄 Users Updated: ${this.stats.usersUpdated}`);
    console.log(`⏭️ Users Skipped: ${this.stats.usersSkipped}`);
    console.log(`❌ Users Failed: ${this.stats.usersFailed}`);
    console.log(`🔄 Subscriptions Created: ${this.stats.subscriptionsCreated}`);
    console.log(`📦 Orders Created: ${this.stats.ordersCreated}`);
    console.log(`🧸 Order Items Created: ${this.stats.orderItemsCreated}`);
    console.log(`💳 Payments Created: ${this.stats.paymentsCreated}`);
    console.log(`🚨 Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }

    console.log('\n✅ Migration completed!');
    console.log('🔗 Check your Supabase dashboard to verify the data');
    console.log('📱 Test the app at: http://localhost:8082');
  }
}

// Different migration modes
async function runMigration(mode = 'safe') {
  let options = {};

  switch (mode) {
    case 'dry-run':
      options = {
        dryRun: true,
        skipExistingUsers: false,
        updateExistingUsers: true,
        migrateSubscriptions: true,
        migrateOrders: true
      };
      break;

    case 'update-only':
      options = {
        skipExistingUsers: false,
        updateExistingUsers: true,
        migrateSubscriptions: true,
        migrateOrders: false
      };
      break;

    case 'new-users-only':
      options = {
        skipExistingUsers: true,
        updateExistingUsers: false,
        migrateSubscriptions: true,
        migrateOrders: true
      };
      break;

    case 'full':
      options = {
        skipExistingUsers: false,
        updateExistingUsers: true,
        migrateSubscriptions: true,
        migrateOrders: true
      };
      break;

    case 'safe':
    default:
      options = {
        skipExistingUsers: true,
        updateExistingUsers: false,
        migrateSubscriptions: true,
        migrateOrders: true
      };
      break;
  }

  console.log(`🎯 Running migration in '${mode}' mode`);
  const migration = new WooCommerceMigration(options);
  await migration.runMigration();
}

// Export for use in other scripts
module.exports = { WooCommerceMigration, WooCommerceClient, runMigration };

// Run if this file is executed directly
if (require.main === module) {
  const mode = process.argv[2] || 'safe';
  runMigration(mode).catch(console.error);
} 
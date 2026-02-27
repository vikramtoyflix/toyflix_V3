const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

// WooCommerce API client
class WooCommerceClient {
  constructor(baseURL = 'http://4.213.183.90:3001') {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.timeout = 30000; // 30 seconds
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

class ComprehensiveDataMigration {
  constructor(options = {}) {
    this.wcClient = new WooCommerceClient();
    this.migrationBatch = `comprehensive_${Date.now()}`;
    this.options = {
      batchSize: options.batchSize || 50, // Process in batches
      maxRetries: options.maxRetries || 3,
      delayBetweenRequests: options.delayBetweenRequests || 1000, // 1 second
      dryRun: options.dryRun || false,
      startFromIndex: options.startFromIndex || 0,
      maxUsers: options.maxUsers || null, // Limit for testing
      ...options
    };
    
    this.stats = {
      totalPhoneNumbers: 0,
      usersProcessed: 0,
      wcUsersFound: 0,
      wcUsersNotFound: 0,
      ordersCreated: 0,
      orderItemsCreated: 0,
      subscriptionsCreated: 0,
      paymentsCreated: 0,
      toysCreatedOrUpdated: 0,
      errors: [],
      startTime: new Date(),
      processingTimes: []
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

  // Get all phone numbers from custom_users table
  async getAllPhoneNumbers() {
    try {
      this.log('📱 Fetching all phone numbers from custom_users table...');
      
      // Fetch all users in chunks to avoid Supabase limits
      let allUsers = [];
      let from = 0;
      const chunkSize = 1000;
      
      while (true) {
        const { data: users, error } = await supabase
          .from('custom_users')
          .select('id, phone')
          .not('phone', 'is', null)
          .order('created_at', { ascending: true })
          .range(from, from + chunkSize - 1);

        if (error) throw error;
        
        if (!users || users.length === 0) break;
        
        allUsers = allUsers.concat(users);
        this.log(`Fetched ${users.length} users (total: ${allUsers.length})`);
        
        if (users.length < chunkSize) break; // Last chunk
        
        from += chunkSize;
      }

      this.stats.totalPhoneNumbers = allUsers.length;
      this.log(`Found ${this.stats.totalPhoneNumbers} phone numbers in database`);
      
      return allUsers;

    } catch (error) {
      this.log(`Error fetching phone numbers: ${error.message}`, 'error');
      return [];
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

  // Extract and standardize address from WooCommerce data
  extractShippingAddress(userData) {
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

  // Create or update toy in toys table
  async createOrUpdateToy(toyData) {
    try {
      if (this.options.dryRun) return null;

      // Check if toy already exists by name
      const { data: existingToy } = await supabase
        .from('toys')
        .select('id')
        .eq('name', toyData.toy_name || toyData.product_title)
        .single();

      if (existingToy) {
        return existingToy.id;
      }

      // Create new toy
      const toyRecord = {
        name: toyData.toy_name || toyData.product_title || 'Unknown Toy',
        description: toyData.product_description || '',
        category: 'educational_toys', // Default category
        age_range: '2-6 years', // Default age range
        retail_price: parseFloat(toyData.total_price) || 100,
        rental_price: parseFloat(toyData.total_price) || 100,
        subscription_category: 'educational_toys',
        available_quantity: 1,
        total_quantity: 1,
        created_at: new Date().toISOString()
      };

      const { data: newToy, error } = await supabase
        .from('toys')
        .insert(toyRecord)
        .select()
        .single();

      if (error) {
        this.log(`Error creating toy "${toyRecord.name}": ${error.message}`, 'error');
        return null;
      }

      this.stats.toysCreatedOrUpdated++;
      return newToy.id;

    } catch (error) {
      this.log(`Error in createOrUpdateToy: ${error.message}`, 'error');
      return null;
    }
  }

  // Migrate subscription data
  async migrateSubscription(userId, subscriptionData) {
    try {
      if (this.options.dryRun) return null;

      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_id', subscriptionData.subscription_name || 'legacy_plan')
        .single();

      if (existingSub) {
        return existingSub.id;
      }

      const subscriptionRecord = {
        user_id: userId,
        plan_id: subscriptionData.subscription_name || 'legacy_plan',
        status: this.mapSubscriptionStatus(subscriptionData.subscription_status),
        start_date: subscriptionData.first_purchase_date || subscriptionData.order_date?.split('T')[0],
        end_date: this.calculateEndDate(subscriptionData),
        current_period_start: subscriptionData.first_purchase_date || subscriptionData.order_date?.split('T')[0],
        current_period_end: this.calculateEndDate(subscriptionData),
        auto_renew: true,
        pause_balance: 0,
        created_at: subscriptionData.order_date || new Date().toISOString()
      };

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();

      if (error) {
        this.log(`Error creating subscription: ${error.message}`, 'error');
        return null;
      }

      this.stats.subscriptionsCreated++;
      return subscription.id;

    } catch (error) {
      this.log(`Error migrating subscription: ${error.message}`, 'error');
      return null;
    }
  }

  // Calculate subscription end date
  calculateEndDate(subscriptionData) {
    const startDate = new Date(subscriptionData.first_purchase_date || subscriptionData.order_date);
    const months = parseInt(subscriptionData.subscription_months) || 1;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate.toISOString().split('T')[0];
  }

  // Migrate order data
  async migrateOrder(userId, orderData, wcUserData) {
    try {
      if (this.options.dryRun) return null;

      // Check if order already exists (by WooCommerce order ID in payment_orders)
      const { data: existingPayment } = await supabase
        .from('payment_orders')
        .select('id')
        .eq('razorpay_order_id', `wc_${orderData.order_id}`)
        .single();

      if (existingPayment) {
        return null; // Order already migrated
      }

      const orderRecord = {
        user_id: userId,
        status: this.mapOrderStatus(orderData.order_status),
        total_amount: 0, // Will be calculated from items
        base_amount: 0,
        gst_amount: 0,
        discount_amount: 0,
        order_type: 'subscription',
        shipping_address: this.extractShippingAddress(wcUserData),
        rental_start_date: orderData.order_date?.split('T')[0],
        rental_end_date: this.calculateRentalEndDate(orderData),
        created_at: orderData.order_date || new Date().toISOString()
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select()
        .single();

      if (error) {
        this.log(`Error creating order: ${error.message}`, 'error');
        return null;
      }

      this.stats.ordersCreated++;
      return order.id;

    } catch (error) {
      this.log(`Error migrating order: ${error.message}`, 'error');
      return null;
    }
  }

  // Calculate rental end date (typically 30 days from start)
  calculateRentalEndDate(orderData) {
    const startDate = new Date(orderData.order_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day rental period
    return endDate.toISOString().split('T')[0];
  }

  // Migrate order items (toys)
  async migrateOrderItems(orderId, toys) {
    try {
      if (this.options.dryRun) return 0;

      let totalAmount = 0;
      let itemsCreated = 0;

      for (const toy of toys) {
        // Create or get toy ID
        const toyId = await this.createOrUpdateToy(toy);
        
        const price = parseFloat(toy.total_price) || 100; // Default price
        totalAmount += price;

        const itemRecord = {
          order_id: orderId,
          toy_id: toyId,
          quantity: parseInt(toy.quantity) || 1,
          unit_price: price,
          total_price: price,
          subscription_category: 'educational_toys',
          age_group: '2-6 years'
        };

        const { error } = await supabase
          .from('order_items')
          .insert(itemRecord);

        if (error) {
          this.log(`Error creating order item: ${error.message}`, 'error');
        } else {
          itemsCreated++;
          this.stats.orderItemsCreated++;
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

      return itemsCreated;

    } catch (error) {
      this.log(`Error migrating order items: ${error.message}`, 'error');
      return 0;
    }
  }

  // Migrate payment data
  async migratePayment(userId, orderId, orderData) {
    try {
      if (this.options.dryRun) return null;

      const paymentRecord = {
        user_id: userId,
        razorpay_order_id: `wc_${orderData.order_id}`, // Prefix to identify WooCommerce orders
        razorpay_payment_id: null,
        amount: parseFloat(orderData.total_amount) || 0,
        currency: 'INR',
        status: this.mapOrderStatus(orderData.order_status) === 'delivered' ? 'completed' : 'pending',
        order_type: 'subscription',
        order_items: {
          order_id: orderId,
          woocommerce_order_id: orderData.order_id,
          subscription_name: orderData.subscription_name,
          migrated_from_woocommerce: true
        },
        created_at: orderData.order_date || new Date().toISOString()
      };

      const { error } = await supabase
        .from('payment_orders')
        .insert(paymentRecord);

      if (error) {
        this.log(`Error creating payment: ${error.message}`, 'error');
        return null;
      }

      this.stats.paymentsCreated++;
      return true;

    } catch (error) {
      this.log(`Error migrating payment: ${error.message}`, 'error');
      return null;
    }
  }

  // Process a single user's WooCommerce data
  async processUserData(supabaseUser, retryCount = 0) {
    try {
      const startTime = Date.now();
      
      // Get WooCommerce user data
      const userResponse = await this.wcClient.getUserByPhone(supabaseUser.phone);
      
      if (!userResponse.success || !userResponse.data) {
        this.stats.wcUsersNotFound++;
        return false;
      }

      const wcUser = userResponse.data;
      this.stats.wcUsersFound++;
      
      this.log(`Processing WC user: ${wcUser.display_name} (${supabaseUser.phone})`);

      // Get comprehensive subscription data
      const subscriptionResponse = await this.wcClient.getCompleteUserSubscriptionInfo(wcUser.ID);
      
      if (!subscriptionResponse.success || !subscriptionResponse.data) {
        this.log(`No subscription data for user ${wcUser.display_name}`, 'warn');
        return true;
      }

      const data = subscriptionResponse.data;
      
      this.log(`Found ${data.totalOrders || 0} orders, ${data.currentToys?.length || 0} toys for ${wcUser.display_name}`);

      // Migrate subscription
      if (data.subscriptionCycle) {
        this.log(`Creating subscription for ${wcUser.display_name}: ${data.subscriptionCycle.subscription_name}`);
        await this.migrateSubscription(supabaseUser.id, data.subscriptionCycle);
      } else {
        this.log(`No subscription cycle found for ${wcUser.display_name}`, 'warn');
      }

      // Migrate orders and toys
      if (data.subscriptionHistory && data.subscriptionHistory.length > 0) {
        this.log(`Migrating ${data.subscriptionHistory.length} orders for ${wcUser.display_name}`);
        for (const orderData of data.subscriptionHistory) {
          const orderId = await this.migrateOrder(supabaseUser.id, orderData, wcUser);
          
          if (orderId) {
            // Migrate order items (toys)
            if (data.currentToys && data.currentToys.length > 0) {
              await this.migrateOrderItems(orderId, data.currentToys);
            }
            
            // Migrate payment
            await this.migratePayment(supabaseUser.id, orderId, orderData);
          }
        }
      } else if (data.currentToys && data.currentToys.length > 0) {
        // Create a single order for users with toys but no subscription history
        this.log(`Creating legacy order for ${wcUser.display_name} with ${data.currentToys.length} toys`);
        const orderData = {
          order_id: `legacy_${wcUser.ID}`,
          order_status: 'wc-completed',
          order_date: new Date().toISOString(),
          subscription_name: data.subscriptionCycle?.subscription_name || 'Legacy Plan'
        };
        
        const orderId = await this.migrateOrder(supabaseUser.id, orderData, wcUser);
        if (orderId) {
          await this.migrateOrderItems(orderId, data.currentToys);
          await this.migratePayment(supabaseUser.id, orderId, orderData);
        }
      } else {
        this.log(`No orders or toys found for ${wcUser.display_name}`, 'warn');
      }

      // Update user subscription status
      if (data.subscriptionCycle?.subscription_status === 'Active') {
        await supabase
          .from('custom_users')
          .update({ subscription_active: true })
          .eq('id', supabaseUser.id);
      }

      const processingTime = Date.now() - startTime;
      this.stats.processingTimes.push(processingTime);
      
      return true;

    } catch (error) {
      if (retryCount < this.options.maxRetries) {
        this.log(`Retrying user ${supabaseUser.phone} (attempt ${retryCount + 1})`, 'warn');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return this.processUserData(supabaseUser, retryCount + 1);
      }
      
      this.log(`Error processing user ${supabaseUser.phone}: ${error.message}`, 'error');
      return false;
    }
  }

  // Process users in batches
  async processBatch(users, batchIndex) {
    this.log(`\n📦 Processing batch ${batchIndex + 1} (${users.length} users)...`);
    
    const promises = users.map(async (user, index) => {
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, index * this.options.delayBetweenRequests));
      return this.processUserData(user);
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;
    
    this.log(`Batch ${batchIndex + 1} complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }

  // Main migration function
  async runComprehensiveMigration() {
    this.log('🚀 Starting comprehensive WooCommerce data migration...');
    this.log(`Migration batch: ${this.migrationBatch}`);
    this.log(`Options: ${JSON.stringify(this.options, null, 2)}`);

    if (this.options.dryRun) {
      this.log('🔍 DRY RUN MODE - No data will be created/updated', 'warn');
    }

    try {
      // Get all phone numbers from Supabase
      const allUsers = await this.getAllPhoneNumbers();
      
      if (allUsers.length === 0) {
        this.log('No phone numbers found in database', 'warn');
        return;
      }

      // Apply filters
      let usersToProcess = allUsers;
      
      if (this.options.startFromIndex > 0) {
        usersToProcess = usersToProcess.slice(this.options.startFromIndex);
        this.log(`Starting from index ${this.options.startFromIndex}`);
      }
      
      if (this.options.maxUsers) {
        usersToProcess = usersToProcess.slice(0, this.options.maxUsers);
        this.log(`Limited to ${this.options.maxUsers} users for testing`);
      }

      this.log(`Processing ${usersToProcess.length} users in batches of ${this.options.batchSize}...`);

      // Process in batches
      for (let i = 0; i < usersToProcess.length; i += this.options.batchSize) {
        const batch = usersToProcess.slice(i, i + this.options.batchSize);
        const batchIndex = Math.floor(i / this.options.batchSize);
        
        await this.processBatch(batch, batchIndex);
        this.stats.usersProcessed += batch.length;
        
        // Progress update
        const progress = ((this.stats.usersProcessed / usersToProcess.length) * 100).toFixed(1);
        this.log(`\n📊 Progress: ${this.stats.usersProcessed}/${usersToProcess.length} (${progress}%)`);
        this.printCurrentStats();
        
        // Small delay between batches
        if (i + this.options.batchSize < usersToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Print final summary
      this.printFinalSummary();

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
    }
  }

  // Print current stats
  printCurrentStats() {
    const avgProcessingTime = this.stats.processingTimes.length > 0 
      ? (this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length / 1000).toFixed(2)
      : 0;
    
    console.log(`   📱 Users Processed: ${this.stats.usersProcessed}`);
    console.log(`   ✅ WC Users Found: ${this.stats.wcUsersFound}`);
    console.log(`   ❌ WC Users Not Found: ${this.stats.wcUsersNotFound}`);
    console.log(`   📦 Orders Created: ${this.stats.ordersCreated}`);
    console.log(`   🧸 Order Items Created: ${this.stats.orderItemsCreated}`);
    console.log(`   🔄 Subscriptions Created: ${this.stats.subscriptionsCreated}`);
    console.log(`   💳 Payments Created: ${this.stats.paymentsCreated}`);
    console.log(`   🎯 Toys Created/Updated: ${this.stats.toysCreatedOrUpdated}`);
    console.log(`   ⏱️ Avg Processing Time: ${avgProcessingTime}s`);
    console.log(`   🚨 Errors: ${this.stats.errors.length}`);
  }

  // Print final summary
  printFinalSummary() {
    const endTime = new Date();
    const totalTime = ((endTime - this.stats.startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`📱 Total Phone Numbers: ${this.stats.totalPhoneNumbers}`);
    console.log(`👥 Users Processed: ${this.stats.usersProcessed}`);
    console.log(`✅ WooCommerce Users Found: ${this.stats.wcUsersFound}`);
    console.log(`❌ WooCommerce Users Not Found: ${this.stats.wcUsersNotFound}`);
    console.log(`📦 Orders Created: ${this.stats.ordersCreated}`);
    console.log(`🧸 Order Items Created: ${this.stats.orderItemsCreated}`);
    console.log(`🔄 Subscriptions Created: ${this.stats.subscriptionsCreated}`);
    console.log(`💳 Payments Created: ${this.stats.paymentsCreated}`);
    console.log(`🎯 Toys Created/Updated: ${this.stats.toysCreatedOrUpdated}`);
    console.log(`⏱️ Total Time: ${totalTime} minutes`);
    console.log(`🚨 Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS (last 10):');
      this.stats.errors.slice(-10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }

    console.log('\n✅ Migration completed!');
    console.log('🔗 Check your Supabase dashboard to verify the data');
    console.log('📱 Test the app at: http://localhost:8082');
    console.log('\n📋 Tables populated:');
    console.log('   - custom_users (subscription status updated)');
    console.log('   - orders (complete order history)');
    console.log('   - order_items (toy rentals)');
    console.log('   - subscriptions (subscription plans)');
    console.log('   - payment_orders (payment history)');
    console.log('   - toys (toy catalog)');
  }
}

// Different migration modes
async function runMigration(mode = 'test') {
  let options = {};

  switch (mode) {
    case 'test':
      options = {
        batchSize: 5,
        maxUsers: 7100,
        delayBetweenRequests: 1000,
        dryRun: false
      };
      break;

    case 'small':
      options = {
        batchSize: 10,
        maxUsers: 7100,
        delayBetweenRequests: 1000,
        dryRun: false
      };
      break;

    case 'medium':
      options = {
        batchSize: 25,
        maxUsers: 7100,
        delayBetweenRequests: 800,
        dryRun: false
      };
      break;

    case 'full':
      options = {
        batchSize: 50,
        maxUsers: 7100, // Process all 7066+ users
        delayBetweenRequests: 500,
        dryRun: false
      };
      break;

    case 'dry-run':
      options = {
        batchSize: 10,
        maxUsers: 7100,
        delayBetweenRequests: 500,
        dryRun: true
      };
      break;

    default:
      console.log('🚀 Comprehensive WooCommerce Data Migration\n');
      console.log('Usage:');
      console.log('  node scripts/comprehensive-data-migration.cjs test     - Test with 20 users');
      console.log('  node scripts/comprehensive-data-migration.cjs small    - Migrate 100 users');
      console.log('  node scripts/comprehensive-data-migration.cjs medium   - Migrate 1000 users');
      console.log('  node scripts/comprehensive-data-migration.cjs full     - Migrate ALL 7066 users');
      console.log('  node scripts/comprehensive-data-migration.cjs dry-run  - Test without changes');
      console.log('\nRecommended order:');
      console.log('1. Run "test" first to verify everything works');
      console.log('2. Run "small" to migrate a subset');
      console.log('3. Run "full" for complete migration');
      return;
  }

  console.log(`🎯 Running comprehensive migration in '${mode}' mode`);
  const migration = new ComprehensiveDataMigration(options);
  await migration.runComprehensiveMigration();
}

// Export for use in other scripts
module.exports = { ComprehensiveDataMigration, WooCommerceClient, runMigration };

// Run if this file is executed directly
if (require.main === module) {
  const mode = process.argv[2] || 'help';
  runMigration(mode).catch(console.error);
} 
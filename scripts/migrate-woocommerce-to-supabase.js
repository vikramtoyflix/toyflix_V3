import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
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

class WooCommerceToSupabaseMigrator {
  constructor() {
    this.apiBase = 'http://4.213.183.90:3001';
    this.batchSize = 50;
    this.requestDelay = 2000; // 2 seconds between requests
    this.stats = {
      totalUsers: 0,
      processedUsers: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: [],
      skippedUsers: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeAPIRequest(endpoint) {
    const url = `${this.apiBase}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 30000
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.log(`API Request failed: ${endpoint} - ${error.message}`, 'error');
      throw error;
    }
  }

  async getAllUsersWithPhones() {
    try {
      const { data: users, error } = await supabase
        .from('custom_users')
        .select('id, phone, name, email')
        .not('phone', 'is', null)
        .not('phone', 'eq', '')
        .order('id');

      if (error) throw error;

      this.log(`Found ${users.length} users with phone numbers`);
      return users;
    } catch (error) {
      this.log(`Error fetching users: ${error.message}`, 'error');
      throw error;
    }
  }

  normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digitsOnly.length === 10) {
      return `91${digitsOnly}`; // Add country code
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return digitsOnly; // Already has country code
    } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
      return digitsOnly.substring(1); // Remove leading 0
    }
    
    return digitsOnly; // Return as-is for other formats
  }

  async getUserFromWooCommerce(phone) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      const response = await this.makeAPIRequest(`/api/woocommerce?action=getUserByPhone&phone=${normalizedPhone}`);
      
      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.log(`Error getting user from WooCommerce: ${error.message}`, 'error');
      return null;
    }
  }

  async getCompleteUserData(wcUserId) {
    try {
      const response = await this.makeAPIRequest(`/api/woocommerce?action=getCompleteUserSubscriptionInfo&userId=${wcUserId}`);
      
      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      this.log(`Error getting complete user data: ${error.message}`, 'error');
      return null;
    }
  }

  // Enhanced function to determine subscription plan details
  getSubscriptionPlanDetails(subscriptionName) {
    const planMappings = {
      // Legacy WooCommerce plan names mapped to current system
      'Trial Plan': { 
        actualName: 'Discovery Delight', 
        planId: 'discovery-delight',
        category: 'monthly', 
        ageGroup: 'mixed', 
        monthlyValue: 1299,
        duration: 1
      },
      '6 Month Plan': { 
        actualName: 'Silver Pack', 
        planId: 'silver-pack',
        category: 'six_month', 
        ageGroup: 'mixed', 
        monthlyValue: 5999,
        duration: 6
      },
      '6 Month Plan PRO': { 
        actualName: 'Gold Pack PRO', 
        planId: 'gold-pack',
        category: 'six_month', 
        ageGroup: 'mixed', 
        monthlyValue: 7999,
        duration: 6
      },
      // Additional legacy mappings
      'Discovery Delight': { 
        actualName: 'Discovery Delight', 
        planId: 'discovery-delight',
        category: 'monthly', 
        ageGroup: 'mixed', 
        monthlyValue: 1299,
        duration: 1
      },
      'Silver Pack': { 
        actualName: 'Silver Pack', 
        planId: 'silver-pack',
        category: 'six_month', 
        ageGroup: 'mixed', 
        monthlyValue: 5999,
        duration: 6
      },
      'Gold Pack PRO': { 
        actualName: 'Gold Pack PRO', 
        planId: 'gold-pack',
        category: 'six_month', 
        ageGroup: 'mixed', 
        monthlyValue: 7999,
        duration: 6
      },
      'Ride-On Monthly': { 
        actualName: 'Ride-On Monthly', 
        planId: 'ride_on_fixed',
        category: 'monthly', 
        ageGroup: 'mixed', 
        monthlyValue: 1999,
        duration: 1
      }
    };

    return planMappings[subscriptionName] || { 
      actualName: subscriptionName || 'Unknown Plan',
      planId: 'discovery-delight',
      category: 'monthly', 
      ageGroup: 'mixed', 
      monthlyValue: 1299,
      duration: 1
    };
  }

  // Enhanced function to create shipping address from available data
  createShippingAddress(userData) {
    const address = {
      firstName: userData.billing_first_name || userData.display_name?.split(' ')[0] || '',
      lastName: userData.billing_last_name || userData.display_name?.split(' ').slice(1).join(' ') || '',
      email: userData.billing_email || userData.user_email || '',
      phone: userData.billing_phone || '',
      // Set defaults for missing address components
      address1: '', // Not available in current API
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN', // Default to India
      landmark: '',
      addressType: 'home'
    };

    return address;
  }

  // Enhanced function to process toys with comprehensive data
  processToysData(currentToys) {
    if (!currentToys || currentToys.length === 0) {
      return [];
    }

    // Deduplicate toys by name and product_id
    const uniqueToys = [];
    const seenToys = new Set();

    for (const toy of currentToys) {
      const toyKey = `${toy.toy_name}:${toy.product_id}`;
      
      if (!seenToys.has(toyKey) && toy.toy_name && !toy.toy_name.includes('Month Plan')) {
        seenToys.add(toyKey);
        
        uniqueToys.push({
          id: toy.product_id,
          name: toy.toy_name,
          title: toy.product_title || toy.toy_name,
          description: toy.product_description || '',
          quantity: parseInt(toy.quantity) || 1,
          price: parseFloat(toy.total_price) || 0,
          category: this.categorizeToy(toy.toy_name),
          ageGroup: this.getAgeGroupFromToy(toy.toy_name),
          deliveryStatus: 'pending',
          returnStatus: 'not_returned',
          condition: 'new',
          notes: ''
        });
      }
    }

    return uniqueToys;
  }

  // Enhanced toy categorization
  categorizeToy(toyName) {
    if (!toyName) return 'miscellaneous';
    
    const name = toyName.toLowerCase();
    
    if (name.includes('book') || name.includes('story') || name.includes('tales')) return 'books';
    if (name.includes('puzzle') || name.includes('brain') || name.includes('logic')) return 'educational';
    if (name.includes('car') || name.includes('bike') || name.includes('vehicle') || name.includes('jeep')) return 'vehicles';
    if (name.includes('game') || name.includes('board') || name.includes('card')) return 'games';
    if (name.includes('musical') || name.includes('piano') || name.includes('drum')) return 'musical';
    if (name.includes('doll') || name.includes('figure') || name.includes('character')) return 'dolls';
    if (name.includes('block') || name.includes('building') || name.includes('construction')) return 'building';
    if (name.includes('art') || name.includes('craft') || name.includes('draw')) return 'arts_crafts';
    if (name.includes('baby') || name.includes('infant') || name.includes('toddler')) return 'baby';
    if (name.includes('outdoor') || name.includes('sports') || name.includes('ball')) return 'outdoor';
    
    return 'toys';
  }

  // Enhanced age group detection
  getAgeGroupFromToy(toyName) {
    if (!toyName) return 'mixed';
    
    const name = toyName.toLowerCase();
    
    if (name.includes('baby') || name.includes('infant') || name.includes('6 months')) return '0-1';
    if (name.includes('toddler') || name.includes('12 months') || name.includes('18 months')) return '1-2';
    if (name.includes('junior') || name.includes('2 years') || name.includes('3 years')) return '2-4';
    if (name.includes('senior') || name.includes('4 years') || name.includes('5 years')) return '4-8';
    if (name.includes('8 years') || name.includes('teen') || name.includes('adult')) return '8+';
    
    return 'mixed';
  }

  // Enhanced function to create rental order with comprehensive data
  async createRentalOrder(user, wcUserData, completeData, planDetails) {
    try {
      const { subscriptionCycle, currentToys } = completeData;
      
      if (!subscriptionCycle) {
        throw new Error('No subscription cycle data available');
      }
      const shippingAddress = this.createShippingAddress(wcUserData);
      const toysData = this.processToysData(currentToys);

      // Enhanced order data with comprehensive fields
      const orderData = {
        // Basic order information
        order_number: `WC-${subscriptionCycle.order_id}`,
        user_id: user.id,
        legacy_order_id: subscriptionCycle.order_id,
        legacy_created_at: subscriptionCycle.order_date,
        migrated_at: new Date().toISOString(),
        
        // Order status and type
        status: this.mapOrderStatus(subscriptionCycle.order_status),
        order_type: 'subscription',
        
        // Subscription details
        subscription_plan: planDetails.actualName, // Use the actual current plan name
        subscription_id: null, // Will be populated when subscription is created
        subscription_category: planDetails.category,
        age_group: planDetails.ageGroup,
        
        // Financial information (with defaults for missing data)
        total_amount: planDetails.monthlyValue,
        base_amount: Math.round(planDetails.monthlyValue * 0.82), // Assuming 18% GST
        gst_amount: Math.round(planDetails.monthlyValue * 0.18),
        discount_amount: 0, // Not available in current API
        payment_amount: planDetails.monthlyValue,
        payment_currency: 'INR',
        
        // Payment information (defaults for missing data)
        payment_status: subscriptionCycle.order_status === 'wc-completed' ? 'paid' : 'pending',
        payment_method: 'unknown', // Not available in current API
        razorpay_order_id: '', // Not available in current API
        razorpay_payment_id: '', // Not available in current API
        razorpay_signature: '', // Not available in current API
        coupon_code: '', // Not available in current API
        
        // Rental cycle information
        cycle_number: 1, // First cycle for migrated data
        rental_start_date: subscriptionCycle.first_purchase_date,
        rental_end_date: this.calculateRentalEndDate(subscriptionCycle.first_purchase_date, planDetails.duration),
        
        // Delivery information
        delivery_date: null, // To be updated when delivered
        returned_date: null, // To be updated when returned
        return_status: 'not_returned',
        
        // Toys information
        toys_data: toysData,
        toys_delivered_count: 0, // To be updated when delivered
        toys_returned_count: 0, // To be updated when returned
        
        // Address information
        shipping_address: shippingAddress,
        delivery_instructions: '',
        pickup_instructions: '',
        
        // Next cycle preparation
        next_cycle_address: shippingAddress,
        next_cycle_toys_selected: false,
        next_cycle_prepared: false,
        
        // Quality and feedback
        quality_rating: null,
        feedback: '',
        damage_reported: false,
        damage_details: '',
        
        // Administrative
        admin_notes: `Migrated from WooCommerce Order #${subscriptionCycle.order_id}. Original plan: "${subscriptionCycle.subscription_name}" → Mapped to: "${planDetails.actualName}" (${planDetails.planId})`,
        internal_status: 'migrated',
        dispatch_tracking_number: '',
        return_tracking_number: '',
        
        // User contact info
        user_phone: user.phone,
        
        // Timestamps
        created_at: subscriptionCycle.order_date,
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
        
        // Status timestamps
        confirmed_at: subscriptionCycle.order_status === 'wc-processing' ? subscriptionCycle.order_date : null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: subscriptionCycle.order_status === 'wc-cancelled' ? subscriptionCycle.order_date : null
      };

      // Insert the rental order
      const { data: insertedOrder, error } = await supabase
        .from('rental_orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      this.log(`✅ Created rental order ${insertedOrder.order_number} for user ${user.name} (${toysData.length} toys)`);
      
      return insertedOrder;

    } catch (error) {
      this.log(`Error creating rental order: ${error.message}`, 'error');
      throw error;
    }
  }

  // Helper function to map WooCommerce order status to our system
  mapOrderStatus(wcStatus) {
    const statusMap = {
      'wc-processing': 'confirmed',
      'wc-completed': 'delivered',
      'wc-cancelled': 'cancelled',
      'wc-refunded': 'refunded',
      'wc-failed': 'failed',
      'wc-pending': 'pending',
      'wc-on-hold': 'on_hold'
    };

    return statusMap[wcStatus] || 'pending';
  }

  // Helper function to calculate rental end date based on plan duration
  calculateRentalEndDate(startDate, durationMonths = 1) {
    const start = new Date(startDate);
    const end = new Date(start);
    
    // For monthly plans, use 30-day cycles
    if (durationMonths === 1) {
      end.setDate(start.getDate() + 30);
    } else {
      // For multi-month plans, calculate end date based on months
      end.setMonth(start.getMonth() + durationMonths);
    }
    
    return end.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  async migrateUser(user) {
    try {
      this.log(`\n🔄 Processing user: ${user.name} (${user.phone})`);

      // Step 1: Get user from WooCommerce
      const wcUser = await this.getUserFromWooCommerce(user.phone);
      if (!wcUser) {
        this.log(`⚠️ User not found in WooCommerce: ${user.phone}`, 'warn');
        this.stats.skippedUsers++;
        return false;
      }

      this.log(`✅ Found WooCommerce user: ${wcUser.display_name} (ID: ${wcUser.ID})`);

      // Step 2: Get complete subscription data
      const completeData = await this.getCompleteUserData(wcUser.ID);
      if (!completeData || !completeData.subscriptionCycle) {
        this.log(`⚠️ No subscription data found for user ${wcUser.display_name}`, 'warn');
        this.stats.skippedUsers++;
        return false;
      }

      const planDetails = this.getSubscriptionPlanDetails(completeData.subscriptionCycle.subscription_name);
      this.log(`✅ Found subscription: "${completeData.subscriptionCycle.subscription_name}" → "${planDetails.actualName}" (₹${planDetails.monthlyValue})`);
      this.log(`✅ Found ${completeData.currentToys?.length || 0} toys`);

      // Step 3: Check if already migrated
      const { data: existingOrder } = await supabase
        .from('rental_orders')
        .select('id, order_number')
        .eq('user_id', user.id)
        .eq('legacy_order_id', completeData.subscriptionCycle.order_id)
        .single();

      if (existingOrder) {
        this.log(`⚠️ Order already migrated: ${existingOrder.order_number}`, 'warn');
        this.stats.skippedUsers++;
        return false;
      }

      // Step 4: Create comprehensive rental order
      await this.createRentalOrder(user, wcUser, completeData, planDetails);

      this.stats.successfulMigrations++;
      return true;

    } catch (error) {
      this.log(`❌ Failed to migrate user ${user.name}: ${error.message}`, 'error');
      this.stats.errors.push({
        user: user.name,
        phone: user.phone,
        error: error.message
      });
      this.stats.failedMigrations++;
      return false;
    }
  }

  async runMigration() {
    console.log('🚀 ENHANCED WOOCOMMERCE TO SUPABASE MIGRATION');
    console.log('='.repeat(80));

    try {
      // Get all users
      const users = await this.getAllUsersWithPhones();
      this.stats.totalUsers = users.length;

      this.log(`📊 Starting migration for ${users.length} users`);
      this.log(`⏱️ Estimated time: ${Math.ceil(users.length * this.requestDelay / 1000 / 60)} minutes`);

      // Process users in batches
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        
        this.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(users.length / this.batchSize)} (${batch.length} users)`);

        for (const user of batch) {
          await this.migrateUser(user);
          this.stats.processedUsers++;
          
          // Progress update
          if (this.stats.processedUsers % 10 === 0) {
            const progress = (this.stats.processedUsers / this.stats.totalUsers * 100).toFixed(1);
            this.log(`📈 Progress: ${this.stats.processedUsers}/${this.stats.totalUsers} (${progress}%)`);
          }
          
          // Rate limiting
          await this.sleep(this.requestDelay);
        }
      }

      // Final statistics
      this.printFinalStats();

    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  printFinalStats() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION COMPLETE - FINAL STATISTICS');
    console.log('='.repeat(80));

    this.log(`📋 Total Users: ${this.stats.totalUsers}`);
    this.log(`✅ Successful Migrations: ${this.stats.successfulMigrations}`);
    this.log(`❌ Failed Migrations: ${this.stats.failedMigrations}`);
    this.log(`⏭️ Skipped Users: ${this.stats.skippedUsers}`);
    this.log(`📊 Success Rate: ${(this.stats.successfulMigrations / this.stats.totalUsers * 100).toFixed(1)}%`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS SUMMARY:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.user} (${error.phone}): ${error.error}`);
      });
    }

    console.log('\n✅ Migration process completed successfully!');
  }
}

// Run the migration
const migrator = new WooCommerceToSupabaseMigrator();
migrator.runMigration().catch(console.error); 
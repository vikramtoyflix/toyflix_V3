/**
 * WooCommerce API Client
 * External client to interact with the WooCommerce API server
 * 
 * Usage:
 * const client = new WooCommerceClient('http://4.213.183.90:3001');
 * 
 * // Get user by phone
 * const user = await client.getUserByPhone('9573832932');
 * 
 * // Get subscription cycle
 * const subscriptions = await client.getSubscriptionCycle(3438);
 * 
 * // Get order items
 * const items = await client.getOrderItems(28192);
 */

class WooCommerceClient {
  constructor(baseURL = 'http://4.213.183.90:3001') {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Make HTTP request with error handling
   */
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
      console.log(`✅ Request successful: ${endpoint}`);
      return data;

    } catch (error) {
      console.error(`❌ Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    return this.makeRequest('/health');
  }

  /**
   * Get user by phone number
   * @param {string} phone - Phone number (with or without +91)
   */
  async getUserByPhone(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    return this.makeRequest(`/api/woocommerce?action=getUserByPhone&phone=${encodeURIComponent(phone)}`);
  }

  /**
   * Get user by email
   * @param {string} email - User email address
   */
  async getUserByEmail(email) {
    if (!email) {
      throw new Error('Email is required');
    }
    
    return this.makeRequest(`/api/woocommerce?action=getUserByEmail&email=${encodeURIComponent(email)}`);
  }

  /**
   * Get subscription cycle for a user
   * @param {number|string} userId - User ID
   */
  async getSubscriptionCycle(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    return this.makeRequest(`/api/woocommerce?action=getUserSubscriptionCycle&userId=${userId}`);
  }

  /**
   * Get order items for a specific order
   * @param {number|string} orderId - Order ID
   */
  async getOrderItems(orderId) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    return this.makeRequest(`/api/woocommerce?action=getOrderItems&orderId=${orderId}`);
  }

  /**
   * Get comprehensive user subscription info (NEW - uses single comprehensive endpoint)
   * @param {number|string} userId - User ID
   */
  async getCompleteUserSubscriptionInfo(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    return this.makeRequest(`/api/woocommerce?action=getCompleteUserSubscriptionInfo&userId=${userId}`);
  }

  /**
   * Get complete user profile with subscriptions and current toys
   * @param {string} phone - Phone number
   */
  async getCompleteUserProfile(phone) {
    try {
      // Get user by phone first
      const userResponse = await this.getUserByPhone(phone);
      if (!userResponse.success) {
        throw new Error('User not found');
      }

      const user = userResponse.data;
      
      // NEW: Try comprehensive endpoint first
      try {
        console.log(`📦 Using comprehensive API endpoint for user ${user.ID}...`);
        const comprehensiveResponse = await this.getCompleteUserSubscriptionInfo(user.ID);
        
        if (comprehensiveResponse.success && comprehensiveResponse.data) {
          console.log(`✅ Comprehensive data retrieved successfully`);
          
          return {
            success: true,
            user: user,
            comprehensiveData: comprehensiveResponse.data,
            subscriptions: comprehensiveResponse.data.subscriptionHistory || [],
            currentToys: comprehensiveResponse.data.currentToys || [],
            activeSubscription: comprehensiveResponse.data.subscriptionCycle,
            totalOrders: comprehensiveResponse.data.totalOrders || 0,
            totalSubscriptionOrders: comprehensiveResponse.data.totalSubscriptionOrders || 0,
            usedComprehensiveEndpoint: true
          };
        }
      } catch (comprehensiveError) {
        console.warn(`⚠️ Comprehensive endpoint failed, falling back to manual collection:`, comprehensiveError.message);
      }
      
      // FALLBACK: Original manual method
      // Get subscription cycle
      const subscriptionResponse = await this.getSubscriptionCycle(user.ID);
      
      // Get order items for each order
      const ordersWithItems = [];
      for (const order of subscriptionResponse.data || []) {
        try {
          const itemsResponse = await this.getOrderItems(order.order_id);
          ordersWithItems.push({
            ...order,
            items: itemsResponse.data || []
          });
        } catch (error) {
          console.warn(`Failed to get items for order ${order.order_id}:`, error.message);
          ordersWithItems.push({
            ...order,
            items: []
          });
        }
      }

      return {
        success: true,
        user: user,
        subscriptions: ordersWithItems,
        currentToys: ordersWithItems.find(order => 
          order.order_status === 'wc-processing' || 
          order.subscription_status === 'Active'
        )?.items || [],
        usedComprehensiveEndpoint: false
      };

    } catch (error) {
      console.error('Failed to get complete user profile:', error.message);
      throw error;
    }
  }

  /**
   * Get all users with phone numbers (for testing/migration)
   * Note: This would need to be implemented on the server side
   */
  async getAllUsers() {
    // This endpoint would need to be added to the server
    return this.makeRequest('/api/users');
  }
}

// Example usage and testing functions
class WooCommerceClientExamples {
  constructor() {
    this.client = new WooCommerceClient();
  }

  /**
   * Test all endpoints with a known phone number
   */
  async testAllEndpoints() {
    const testPhone = '9573832932';
    
    console.log('🧪 Testing WooCommerce API Client...\n');

    try {
      // 1. Health check
      console.log('1. Testing health check...');
      const health = await this.client.healthCheck();
      console.log('Health:', health);
      console.log('');

      // 2. Get user by phone
      console.log('2. Testing user lookup by phone...');
      const user = await this.client.getUserByPhone(testPhone);
      console.log('User:', user.data);
      console.log('');

      // 3. Get subscription cycle
      console.log('3. Testing subscription cycle...');
      const subscriptions = await this.client.getSubscriptionCycle(user.data.ID);
      console.log('Subscriptions:', subscriptions.data);
      console.log('');

      // 4. Get order items for first order
      if (subscriptions.data && subscriptions.data.length > 0) {
        console.log('4. Testing order items...');
        const firstOrder = subscriptions.data[0];
        const items = await this.client.getOrderItems(firstOrder.order_id);
        console.log('Order items:', items.data);
        console.log('');
      }

      // 5. Get complete profile
      console.log('5. Testing complete profile...');
      const profile = await this.client.getCompleteUserProfile(testPhone);
      console.log('Complete profile:', {
        user: profile.user,
        subscriptionCount: profile.subscriptions.length,
        currentToysCount: profile.currentToys.length
      });

      console.log('\n✅ All tests completed successfully!');

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  /**
   * Example: Get user profile and display current toys
   */
  async getUserCurrentToys(phone) {
    try {
      const profile = await this.client.getCompleteUserProfile(phone);
      
      console.log(`\n👤 User: ${profile.user.first_name} ${profile.user.last_name}`);
      console.log(`📧 Email: ${profile.user.user_email}`);
      console.log(`📱 Phone: ${profile.user.phone}`);
      console.log(`📍 Address: ${profile.user.address_1}, ${profile.user.city}`);
      
      console.log(`\n🎯 Current Toys (${profile.currentToys.length}):`);
      profile.currentToys.forEach((toy, index) => {
        console.log(`  ${index + 1}. ${toy.product_name} (Qty: ${toy.quantity})`);
      });

      console.log(`\n📦 Subscription History (${profile.subscriptions.length} orders):`);
      profile.subscriptions.forEach((order, index) => {
        console.log(`  ${index + 1}. Order #${order.order_id} - ${order.subscription_name} (${order.order_status})`);
        console.log(`     Toys: ${order.items.length} items`);
      });

      return profile;

    } catch (error) {
      console.error('Failed to get user toys:', error.message);
      throw error;
    }
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WooCommerceClient, WooCommerceClientExamples };
}

// Browser usage example
if (typeof window !== 'undefined') {
  window.WooCommerceClient = WooCommerceClient;
  window.WooCommerceClientExamples = WooCommerceClientExamples;
}

// Auto-run example if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const examples = new WooCommerceClientExamples();
  examples.testAllEndpoints();
} 
/**
 * WooCommerce API Service
 * TypeScript implementation of the WooCommerce API client
 * Based on the api_client.js structure for consistency
 * 
 * Usage:
 * const client = new WooCommerceApiService();
 * 
 * // Get user by phone
 * const user = await client.getUserByPhone('9573832932');
 * 
 * // Get subscription cycle
 * const subscriptions = await client.getSubscriptionCycle(3438);
 * 
 * // Get order items
 * const items = await client.getOrderItems(28192);
 * 
 * // Get complete user profile
 * const profile = await client.getCompleteUserProfile('9573832932');
 */

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: string;
  user_id?: string;
  count?: number;
}

interface UserProfile {
  success: boolean;
  user: any;
  subscriptions: any[];
  currentToys: any[];
  error?: string;
}

export class WooCommerceApiService {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = 'http://4.213.183.90:3001') {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
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

    } catch (error: any) {
      console.error(`❌ Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.makeRequest('/api/health');
    // Health API returns { status: "healthy", database: "connected" }
    return {
      success: response.status === 'healthy' && response.database === 'connected',
      data: response
    };
  }

  /**
   * Get user by phone number
   * @param phone - Phone number (with or without +91)
   */
  async getUserByPhone(phone: string): Promise<ApiResponse | null> {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    try {
      const response = await this.makeRequest(`/api/user-by-phone/${encodeURIComponent(phone)}`);
      // User API returns { success: true, data: {...}, timestamp: "..." }
      return response;
    } catch (error: any) {
      // Handle 404 as null (user not found)
      if (error.message.includes('404')) {
        console.log(`❌ No WooCommerce user found for phone: ${phone}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user by email
   * @param email - User email address
   */
  async getUserByEmail(email: string): Promise<ApiResponse> {
    if (!email) {
      throw new Error('Email is required');
    }
    
    return this.makeRequest(`/api/user/${encodeURIComponent(email)}`);
  }

  /**
   * Get subscription cycle for a user
   * @param userId - User ID
   */
  async getSubscriptionCycle(userId: number | string): Promise<ApiResponse> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await this.makeRequest(`/api/subscription-cycle/${userId}`);
    // Subscription cycle API returns { user_id: "3438", all_subscriptions: [...] }
    // Transform to expected format
    return {
      success: true,
      data: response.all_subscriptions || [],
      user_id: response.user_id
    };
  }

  /**
   * Get order items for a specific order
   * @param orderId - Order ID
   */
  async getOrderItems(orderId: number | string): Promise<ApiResponse> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    const response = await this.makeRequest(`/api/order-items/${orderId}`);
    // Order items API returns { success: true, data: [...], count: 4, timestamp: "..." }
    return response;
  }

  /**
   * Get complete user profile with subscriptions and current toys
   * @param phone - Phone number
   */
  async getCompleteUserProfile(phone: string): Promise<UserProfile> {
    try {
      // Get user by phone
      const userResponse = await this.getUserByPhone(phone);
      if (!userResponse?.success) {
        return {
          success: false,
          error: 'User not found',
          user: null,
          subscriptions: [],
          currentToys: []
        };
      }

      const user = userResponse.data;
      
      // Get subscription cycle
      const subscriptionResponse = await this.getSubscriptionCycle(user.ID);
      
      // Transform subscriptions to consistent format
      const transformedSubscriptions = subscriptionResponse.data.map((item: any) => ({
        order_id: item.order_id,
        created_at: item.order_date, // API uses order_date
        order_status: item.order_status,
        subscription_name: item.subscription_name,
        subscription_status: item.subscription_status,
        subscription_months: item.subscription_months,
        total_amount: item.total_amount || 0,
        currency: 'INR',
        customer_id: user.ID,
        items: [], // Will be populated below
        _raw: item
      }));
      
      // Get order items for each order
      const ordersWithItems = [];
      for (const order of transformedSubscriptions) {
        try {
          const itemsResponse = await this.getOrderItems(order.order_id);
          ordersWithItems.push({
            ...order,
            items: itemsResponse.data || []
          });
        } catch (error: any) {
          console.warn(`⚠️ Failed to get items for order ${order.order_id}:`, error.message);
          ordersWithItems.push({
            ...order,
            items: []
          });
        }
      }

      // Find current toys (from active orders)
      const activeToys = [];
      for (const order of ordersWithItems) {
        // Consider toys current if from processing or active orders
        if (order.order_status === 'wc-processing' || order.subscription_status === 'Active') {
          activeToys.push(...(order.items || []));
        }
      }



      return {
        success: true,
        user: user,
        subscriptions: ordersWithItems,
        currentToys: activeToys
      };

    } catch (error: any) {
      console.error('❌ Failed to get complete user profile:', error.message);
      return {
        success: false,
        error: error.message,
        user: null,
        subscriptions: [],
        currentToys: []
      };
    }
  }

  /**
   * Example: Get user profile and display current toys
   */
  async getUserCurrentToys(phone: string) {
    try {
      const profile = await this.getCompleteUserProfile(phone);
      
      if (!profile.success) {
        console.log(`❌ Failed to get profile: ${profile.error}`);
        return profile;
      }
      
      console.log(`\n👤 User: ${profile.user.first_name} ${profile.user.last_name}`);
      console.log(`📧 Email: ${profile.user.user_email}`);
      console.log(`📱 Phone: ${profile.user.phone}`);
      console.log(`📍 Address: ${profile.user.address_1}, ${profile.user.city}`);
      
      console.log(`\n🎯 Current Toys (${profile.currentToys.length}):`);
      profile.currentToys.forEach((toy: any, index: number) => {
        console.log(`  ${index + 1}. ${toy.product_name} (Qty: ${toy.quantity})`);
      });

      console.log(`\n📦 Subscription History (${profile.subscriptions.length} orders):`);
      profile.subscriptions.forEach((order: any, index: number) => {
        console.log(`  ${index + 1}. Order #${order.order_id} - ${order.subscription_name} (${order.order_status})`);
        console.log(`     Toys: ${order.items.length} items`);
      });

      return profile;

    } catch (error: any) {
      console.error('Failed to get user toys:', error.message);
      throw error;
    }
  }

  /**
   * Test all endpoints with a known phone number
   */
  async testAllEndpoints(testPhone: string = '9573832932') {
    console.log('🧪 Testing WooCommerce API Client...\n');

    try {
      // 1. Health check
      console.log('1. Testing health check...');
      const health = await this.healthCheck();
      console.log('Health:', health);
      console.log('');

      // 2. Get user by phone
      console.log('2. Testing user lookup by phone...');
      const user = await this.getUserByPhone(testPhone);
      if (user?.data) {
        console.log('User:', user.data);
        console.log('');

        // 3. Get subscription cycle
        console.log('3. Testing subscription cycle...');
        const subscriptions = await this.getSubscriptionCycle(user.data.ID);
        console.log('Subscriptions:', subscriptions.data);
        console.log('');

        // 4. Get order items for first order
        if (subscriptions.data && subscriptions.data.length > 0) {
          console.log('4. Testing order items...');
          const firstOrder = subscriptions.data[0];
          const items = await this.getOrderItems(firstOrder.order_id);
          console.log('Order items:', items.data);
          console.log('');
        }

        // 5. Get complete profile
        console.log('5. Testing complete profile...');
        const profile = await this.getCompleteUserProfile(testPhone);
        console.log('Complete profile:', {
          success: profile.success,
          user: profile.user ? `${profile.user.first_name} ${profile.user.last_name}` : null,
          subscriptionCount: profile.subscriptions.length,
          currentToysCount: profile.currentToys.length,
          error: profile.error
        });
      } else {
        console.log('No user found for phone:', testPhone);
      }

      console.log('\n✅ All tests completed successfully!');

    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Export singleton instance
export const wooCommerceApiService = new WooCommerceApiService();

// Export class for custom instances
export default WooCommerceApiService; 
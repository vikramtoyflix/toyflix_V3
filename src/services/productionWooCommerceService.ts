// Production WooCommerce Service - Uses Azure Function
// This service is specifically for production environment
export class ProductionWooCommerceService {
  private static readonly AZURE_FUNCTION_URL = 'https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net';
  private static timeout = 15000; // 15 seconds timeout for production

  /**
   * Make HTTP request to Azure Function with production-specific error handling
   */
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.AZURE_FUNCTION_URL}${endpoint}`;
    
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
      console.log(`🌐 [PRODUCTION] Making request to: ${url}`);
      
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
      console.log(`✅ [PRODUCTION] Request successful: ${endpoint}`);
      return data;

    } catch (error: any) {
      console.error(`❌ [PRODUCTION] Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck() {
    const response = await this.makeRequest('/api/health');
    return {
      success: response.success && response.data?.status === 'healthy',
      data: response.data,
      proxy: response.proxy || 'azure-function'
    };
  }

  /**
   * Get user by phone number
   */
  static async getUserByPhone(phone: string) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    try {
      const response = await this.makeRequest(`/api/user-by-phone/${encodeURIComponent(phone)}`);
      console.log(`✅ [PRODUCTION] Found user for phone: ${phone}`);
      return response;
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log(`❌ [PRODUCTION] No WooCommerce user found for phone: ${phone}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get subscription cycle for a user
   */
  static async getSubscriptionCycle(userId: number | string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await this.makeRequest(`/api/subscription-cycle/${userId}`);
    return {
      success: true,
      data: response.all_subscriptions || [],
      user_id: response.user_id
    };
  }

  /**
   * Get order items for a specific order
   */
  static async getOrderItems(orderId: number | string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    const response = await this.makeRequest(`/api/order-items/${orderId}`);
    return response;
  }

  /**
   * Get complete user profile with subscriptions and current toys
   */
  static async getCompleteUserProfile(phone: string) {
    try {
      console.log(`🔍 [PRODUCTION] Getting complete profile for phone: ${phone}`);
      
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
      console.log(`👤 [PRODUCTION] Found user: ${user.first_name} ${user.last_name} (ID: ${user.ID})`);
      
      // Get subscription cycle
      const subscriptionResponse = await this.getSubscriptionCycle(user.ID);
      
      // Transform subscriptions to consistent format
      const transformedSubscriptions = subscriptionResponse.data.map((item: any) => ({
        order_id: item.order_id,
        created_at: item.order_date,
        order_status: item.order_status,
        subscription_name: item.subscription_name,
        subscription_status: item.subscription_status,
        subscription_months: item.subscription_months,
        total_amount: item.total_amount || 0,
        currency: 'INR',
        customer_id: user.ID,
        items: [],
        _raw: item
      }));
      
      console.log(`📦 [PRODUCTION] Found ${transformedSubscriptions.length} subscriptions`);
      
      // Get order items for each order
      const ordersWithItems = [];
      for (const order of transformedSubscriptions) {
        try {
          const itemsResponse = await this.getOrderItems(order.order_id);
          const items = itemsResponse.data || [];
          
          // Filter out subscription plans from toys
          const actualToys = items.filter((item: any) => 
            item.product_name && 
            !item.product_name.toLowerCase().includes('plan') &&
            !item.product_name.toLowerCase().includes('subscription') &&
            item.order_item_type === 'line_item'
          );
          
          ordersWithItems.push({
            ...order,
            items: actualToys
          });
          
          console.log(`📋 [PRODUCTION] Order ${order.order_id}: ${items.length} total items, ${actualToys.length} toys`);
        } catch (error: any) {
          console.warn(`⚠️ [PRODUCTION] Failed to get items for order ${order.order_id}:`, error.message);
          ordersWithItems.push({
            ...order,
            items: []
          });
        }
      }

      // Find current toys (from active orders)
      const activeToys = [];
      for (const order of ordersWithItems) {
        if (order.order_status === 'wc-processing' || order.subscription_status === 'Active') {
          activeToys.push(...(order.items || []));
        }
      }

      console.log(`🎯 [PRODUCTION] Found ${activeToys.length} current toys`);

      return {
        success: true,
        user: user,
        subscriptions: ordersWithItems,
        currentToys: activeToys,
        environment: 'production',
        proxy: 'azure-function'
      };

    } catch (error: any) {
      console.error('❌ [PRODUCTION] Failed to get complete user profile:', error.message);
      return {
        success: false,
        error: error.message,
        user: null,
        subscriptions: [],
        currentToys: [],
        environment: 'production'
      };
    }
  }

  // Legacy methods for backward compatibility
  static async getUserOrders(userId: string) {
    try {
      console.log(`📦 [PRODUCTION] Fetching orders for user: ${userId}`);
      const response = await this.getSubscriptionCycle(userId);
      
      const orders = (response.data || []).map((item: any) => ({
        order_id: item.order_id,
        created_at: item.order_date,
        post_status: item.order_status,
        total_amount: item.total_amount || 0,
        currency: 'INR',
        subscription_name: item.subscription_name,
        subscription_status: item.subscription_status,
        subscription_months: item.subscription_months,
        customer_id: userId,
        order_status: item.order_status,
        _raw: item
      }));
      
      console.log(`✅ [PRODUCTION] Processed ${orders.length} orders for user ${userId}`);
      return orders;
      
    } catch (error: any) {
      console.error('❌ [PRODUCTION] Error fetching user orders:', error.message);
      return [];
    }
  }

  static async getUserSubscriptions(userId: string) {
    try {
      console.log(`🔄 [PRODUCTION] Fetching subscriptions for user: ${userId}`);
      const orders = await this.getUserOrders(userId);
      
      const subscriptions = orders.map((order: any) => ({
        subscription_id: order.order_id,
        created_at: order.created_at,
        post_status: order.post_status,
        billing_period: order.subscription_name || 'Monthly',
        billing_interval: order.subscription_months || '1',
        total_amount: order.total_amount,
        next_payment_date: null,
        subscription_name: order.subscription_name,
        subscription_status: order.subscription_status,
        _raw: order._raw
      }));
      
      console.log(`✅ [PRODUCTION] Processed ${subscriptions.length} subscriptions for user ${userId}`);
      return subscriptions;
      
    } catch (error: any) {
      console.error('❌ [PRODUCTION] Error fetching user subscriptions:', error.message);
      return [];
    }
  }

  // Test connection to Azure Function
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      console.log('✅ [PRODUCTION] Azure Function connection test:', response);
      return response.success;
      
    } catch (error: any) {
      console.warn('⚠️ [PRODUCTION] Azure Function connection test failed:', error.message);
      return false;
    }
  }

  // Helper method to get environment info
  static getEnvironmentInfo() {
    return {
      environment: 'production',
      service: 'Azure Function',
      endpoint: this.AZURE_FUNCTION_URL,
      timeout: this.timeout
    };
  }
} 
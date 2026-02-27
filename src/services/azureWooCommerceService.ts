// Azure VM-based WooCommerce Service
// Uses Express.js server running on Azure VM for fast local database access

// Environment-specific API URL configuration
const getAzureVmApiUrl = () => {
  // In production, use HTTPS if available, otherwise fallback to HTTP
  if (process.env.NODE_ENV === 'production') {
    // TODO: Replace with HTTPS endpoint or Azure API Management URL when configured
    // return 'https://toyflix-api-management.azure-api.net';
    return 'http://4.213.183.90:3001';
  }
  // Local development
  return 'http://4.213.183.90:3001';
};

const AZURE_VM_API_URL = getAzureVmApiUrl();

export class AzureWooCommerceService {
  private static timeout = 15000; // Increased timeout for Azure networking

  /**
   * Make HTTP request with improved error handling and timeout
   */
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${AZURE_VM_API_URL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add headers for Azure networking
        'User-Agent': 'Toyflix-StaticWebApp/1.0'
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
        
        // Enhanced error handling for Azure networking issues
        if (response.status === 0 || response.status >= 500) {
          console.error(`🔥 Azure VM connectivity issue: ${response.status}`);
          throw new Error(`Azure VM server unavailable (${response.status}). Please check network configuration.`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error: any) {
      // Enhanced error handling for different types of network issues
      if (error.name === 'AbortError') {
        console.error(`⏱️ Request timeout: ${endpoint} (${this.timeout}ms)`);
        throw new Error(`Request timeout - Azure VM may be unreachable from Static Web App`);
      }
      
      if (error.message.includes('fetch')) {
        console.error(`🌐 Network error: ${endpoint}`, error.message);
        throw new Error(`Network error - Azure networking configuration may be needed`);
      }
      
      console.error(`❌ Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck() {
    const response = await this.makeRequest('/api/health');
    // Health API returns { status: "healthy", database: "connected" }
    return {
      success: response.status === 'healthy' && response.database === 'connected',
      data: response
    };
  }

  /**
   * Get user by phone number
   * @param {string} phone - Phone number (with or without +91)
   */
  static async getUserByPhone(phone: string) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    try {
      const response = await this.makeRequest(`/api/user-by-phone/${encodeURIComponent(phone)}`);
      // User API returns { success: true, data: {...}, timestamp: "..." }
      return response;
    } catch (error: any) {
      // Handle not found as null rather than error
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log(`❌ No WooCommerce user found for phone: ${phone}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email address
   */
  static async getUserByEmail(email: string) {
    if (!email) {
      throw new Error('Email is required');
    }
    
    return this.makeRequest(`/api/user/${encodeURIComponent(email)}`);
  }

  /**
   * Get subscription cycle for a user
   * @param {number|string} userId - User ID
   */
  static async getSubscriptionCycle(userId: number | string) {
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
   * @param {number|string} orderId - Order ID
   */
  static async getOrderItems(orderId: number | string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    const response = await this.makeRequest(`/api/order-items/${orderId}`);
    // Order items API returns { success: true, data: [...], count: 4, timestamp: "..." }
    return response;
  }

  /**
   * Get complete user profile with subscriptions and current toys
   * @param {string} phone - Phone number
   */
  static async getCompleteUserProfile(phone: string) {
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

  // Legacy methods for backward compatibility
  static async getUserOrders(userId: string) {
    try {
      console.log(`📦 Fetching orders for user: ${userId}`);
      const response = await this.getSubscriptionCycle(userId);
      
      const orders = (response.data || []).map((item: any) => ({
        order_id: item.order_id,
        created_at: item.order_date, // API field mapping
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
      
      console.log(`✅ Processed ${orders.length} orders for user ${userId}`);
      return orders;
      
    } catch (error: any) {
      console.error('❌ Error fetching user orders:', error.message);
      return [];
    }
  }

  static async getUserSubscriptions(userId: string) {
    try {
      console.log(`🔄 Fetching subscriptions for user: ${userId}`);
      const orders = await this.getUserOrders(userId);
      
      // Transform orders to subscription format
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
      
      console.log(`✅ Processed ${subscriptions.length} subscriptions for user ${userId}`);
      return subscriptions;
      
    } catch (error: any) {
      console.error('❌ Error fetching user subscriptions:', error.message);
      return [];
    }
  }

  // Helper method to map subscription status from WooCommerce
  static mapSubscriptionStatus(wcStatus: string): string {
    const statusMap: Record<string, string> = {
      'wc-active': 'active',
      'Active': 'active',
      'active': 'active',
      'wc-cancelled': 'cancelled',
      'cancelled': 'cancelled',
      'wc-expired': 'expired',
      'expired': 'expired',
      'wc-pending': 'pending',
      'pending': 'pending',
      'wc-on-hold': 'on-hold',
      'on-hold': 'on-hold',
      'wc-pic-completed': 'completed',
      'wc-completed': 'completed',
      'wc-processing': 'processing',
      'processing': 'processing',
    };
    
    return statusMap[wcStatus] || wcStatus;
  }

  // Helper method to map order status from WooCommerce
  static mapOrderStatus(wcStatus: string): string {
    const statusMap: Record<string, string> = {
      'wc-completed': 'completed',
      'completed': 'completed',
      'wc-processing': 'processing',
      'processing': 'processing',
      'wc-pending': 'pending',
      'pending': 'pending',
      'wc-cancelled': 'cancelled',
      'cancelled': 'cancelled',
      'wc-refunded': 'refunded',
      'refunded': 'refunded',
      'wc-failed': 'failed',
      'failed': 'failed',
      'wc-on-hold': 'on-hold',
      'on-hold': 'on-hold',
      'wc-pic-completed': 'completed',
    };
    
    return statusMap[wcStatus] || wcStatus;
  }

  // Test connection to VM server
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      console.log('✅ WooCommerce server connection test:', response);
      return response.success;
      
    } catch (error: any) {
      console.warn('⚠️ WooCommerce server connection test failed:', error.message);
      return false;
    }
  }
} 
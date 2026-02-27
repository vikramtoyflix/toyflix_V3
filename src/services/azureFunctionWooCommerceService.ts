// Azure Function-based WooCommerce Service
// Uses Azure Function as proxy to solve networking issues between Static Web App and VM

const getAzureFunctionUrl = () => {
  // Get the full function app name from environment
  const functionAppName = process.env.VITE_AZURE_FUNCTION_APP_NAME || 'toyflix-woocommerce-proxy-bjh8hchjagdtgnhp';
  
  // For Central India region, use the correct endpoint
  return `https://${functionAppName}.centralindia-01.azurewebsites.net/api`;
};

export class AzureFunctionWooCommerceService {
  private static timeout = 30000; // 30 seconds for Azure Function
  private static baseUrl = getAzureFunctionUrl();

  /**
   * Make HTTP request through Azure Function proxy
   */
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Toyflix-StaticWebApp-FunctionProxy/1.0'
      }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      console.log(`🌐 [Azure Function] Making request to: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text().catch(() => '');
        throw new Error(`Azure Function Error ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      // Handle Azure Function response format
      if (data.success === false) {
        throw new Error(data.error || 'Azure Function returned error');
      }
      
      return data;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`⏱️ Azure Function timeout: ${endpoint}`);
        throw new Error(`Azure Function timeout - may need longer timeout or optimization`);
      }
      
      if (error.message.includes('fetch')) {
        console.error(`🌐 Azure Function network error: ${endpoint}`, error.message);
        throw new Error(`Azure Function network error - check function app status`);
      }
      
      console.error(`❌ Azure Function request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Health check through Azure Function
   */
  static async healthCheck() {
    const response = await this.makeRequest('/health');
    return {
      success: true,
      data: response.data,
      proxy: response.proxy || 'azure-function'
    };
  }

  /**
   * Get user by phone number through Azure Function
   */
  static async getUserByPhone(phone: string) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    try {
      const response = await this.makeRequest(`/user-by-phone/${encodeURIComponent(phone)}`);
      return response.data; // Azure Function wraps the VM response in data property
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log(`❌ No WooCommerce user found for phone: ${phone}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user by email through Azure Function
   */
  static async getUserByEmail(email: string) {
    if (!email) {
      throw new Error('Email is required');
    }
    
    const response = await this.makeRequest(`/user/${encodeURIComponent(email)}`);
    return response.data;
  }

  /**
   * Get subscription cycle through Azure Function
   */
  static async getSubscriptionCycle(userId: number | string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await this.makeRequest(`/subscription-cycle/${userId}`);
    
    // Transform to expected format
    return {
      success: true,
      data: response.data.all_subscriptions || [],
      user_id: response.data.user_id
    };
  }

  /**
   * Get order items through Azure Function
   */
  static async getOrderItems(orderId: number | string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    const response = await this.makeRequest(`/order-items/${orderId}`);
    return response.data;
  }

  /**
   * Get complete user profile with subscriptions and current toys
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
        if (order.order_status === 'wc-processing' || order.subscription_status === 'Active') {
          activeToys.push(...(order.items || []));
        }
      }

      return {
        success: true,
        user: user,
        subscriptions: ordersWithItems,
        currentToys: activeToys,
        proxy: 'azure-function'
      };

    } catch (error: any) {
      console.error('❌ Failed to get complete user profile through Azure Function:', error.message);
      return {
        success: false,
        error: error.message,
        user: null,
        subscriptions: [],
        currentToys: [],
        proxy: 'azure-function'
      };
    }
  }

  // Helper method to map subscription status
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

  // Helper method to map order status
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

  // Test connection to Azure Function
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      console.log('✅ Azure Function connection test:', response);
      return response.success;
      
    } catch (error: any) {
      console.warn('⚠️ Azure Function connection test failed:', error.message);
      return false;
    }
  }
} 
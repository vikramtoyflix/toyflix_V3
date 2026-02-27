// Static Web App WooCommerce Service
// Uses relative API routes in production Static Web App to proxy to Direct VM API
// Eliminates CORS issues by keeping requests on the same domain

export class StaticWebAppWooCommerceService {
  private static timeout = 10000; // 10 seconds timeout

  /**
   * Detect if we're running in production (Static Web App)
   */
  private static isProduction(): boolean {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return process.env.NODE_ENV === 'production';
    }
    
    // In browser: check hostname
    const hostname = window.location.hostname;
    
    // Production: Azure Static Web Apps domains
    const isAzureStaticWebApp = hostname.includes('.azurestaticapps.net') || 
                                hostname.includes('.azurewebsites.net');
    
    // Development: localhost or local IPs
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname.startsWith('192.168.');
    
    return isAzureStaticWebApp && !isLocalhost;
  }

  /**
   * Get the appropriate base URL for API calls
   */
  private static getBaseURL(): string {
    // TEMP FIX: Always use Direct VM API due to Static Web App networking restrictions
    // Static Web Apps cannot make HTTP calls to external IPs, even in production
    // This affects both localhost and production environments  
    console.log('🔧 Using Direct VM API due to Static Web App networking restrictions');
    return 'http://4.213.183.90:3001';
    
    /* ORIGINAL LOGIC (DISABLED DUE TO NETWORKING RESTRICTIONS):
    if (this.isProduction()) {
      // Production: Use relative URLs to Static Web App API routes
      return '/api';
    } else {
      // Development: Use Direct VM API since it's working now
      return 'http://4.213.183.90:3001';
    }
    */
  }

  /**
   * Make HTTP request with improved error handling and timeout
   */
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const baseURL = this.getBaseURL();
    let url: string;
    
    // Handle different API formats
    if (baseURL.includes('4.213.183.90:3001')) {
      // Direct VM API format: use query parameters
      if (endpoint === '/health') {
        url = `${baseURL}/health`;
      } else {
        const action = this.mapEndpointToAction(endpoint);
        url = `${baseURL}/api/woocommerce?${action}`;
      }
    } else if (baseURL.includes('azurewebsites.net')) {
      // Azure Function format: append action and parameters as query params
      const action = this.mapEndpointToAction(endpoint);
      url = `${baseURL}?${action}`;
    } else {
      // Static Web App format (production)
      url = `${baseURL}${endpoint}`;
    }
    
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
      const environment = this.isProduction() ? 'PRODUCTION (Direct VM - Static Web App Fix)' : 'DEVELOPMENT (VM API)';
      console.log(`🌐 [${environment}] Making request to: ${url}`);
      
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
      console.log(`✅ [${environment}] Request successful: ${endpoint}`);
      return data;

    } catch (error: any) {
      const environment = this.isProduction() ? 'PRODUCTION (Direct VM)' : 'DEVELOPMENT';
      console.error(`❌ [${environment}] Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * Map endpoint paths to Azure Function action parameters
   */
  private static mapEndpointToAction(endpoint: string): string {
    if (endpoint === '/health') {
      return 'action=health';
    } else if (endpoint.startsWith('/user-by-phone/')) {
      const phone = endpoint.replace('/user-by-phone/', '');
      return `action=getUserByPhone&phone=${encodeURIComponent(phone)}`;
    } else if (endpoint.startsWith('/subscription-cycle/')) {
      const userId = endpoint.replace('/subscription-cycle/', '');
      return `action=getUserOrders&userId=${encodeURIComponent(userId)}`;
    } else if (endpoint.startsWith('/order-items/')) {
      const orderId = endpoint.replace('/order-items/', '');
      return `action=getOrderItems&orderId=${encodeURIComponent(orderId)}`;
    } else if (endpoint.startsWith('/complete-subscription-info/')) {
      const userId = endpoint.replace('/complete-subscription-info/', '');
      return `action=getCompleteUserSubscriptionInfo&userId=${encodeURIComponent(userId)}`;
    }
    
    // Fallback: assume it's a direct action
    return endpoint.replace('/', '');
  }

  /**
   * Health check endpoint
   */
  static async healthCheck() {
    const response = await this.makeRequest('/health');
    // Both Direct VM and Static Web App API return similar structure
    return {
      success: response.success || (response.status === 'healthy' && response.database === 'connected'),
      data: response,
      environment: this.isProduction() ? 'production' : 'development'
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
    
    // Normalize phone number - remove +91 prefix for API compatibility
    const normalizedPhone = phone.replace(/^\+91/, '');
    console.log(`📱 Normalizing phone: ${phone} → ${normalizedPhone}`);
    
    const response = await this.makeRequest(`/user-by-phone/${encodeURIComponent(normalizedPhone)}`);
    return response;
  }

  /**
   * Get subscription cycle for a user
   * @param {number|string} userId - User ID
   */
  static async getSubscriptionCycle(userId: number | string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await this.makeRequest(`/subscription-cycle/${userId}`);
    return response;
  }

  /**
   * Get order items for a specific order
   * @param {number|string} orderId - Order ID
   */
  static async getOrderItems(orderId: number | string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    const response = await this.makeRequest(`/order-items/${orderId}`);
    return response;
  }

  /**
   * Get complete user profile with subscriptions and current toys
   * @param {string} phone - Phone number
   */
  static async getCompleteUserProfile(phone: string) {
    try {
      // Normalize phone number consistently
      const normalizedPhone = phone.replace(/^\+91/, '');
      console.log(`🔍 Fetching complete profile for phone: ${phone} → ${normalizedPhone}`);
      
      // Get user by phone (already normalized in getUserByPhone, but being explicit)
      const userResponse = await this.getUserByPhone(phone);
      if (!userResponse.success || !userResponse.data) {
        throw new Error('User not found');
      }

      const user = userResponse.data;
      console.log(`👤 Found WooCommerce user: ${user.display_name || user.first_name} ${user.last_name} (ID: ${user.ID})`);
      
      // NEW: Use the comprehensive endpoint instead of manual data collection
      try {
        console.log(`📦 Using comprehensive API endpoint for user ${user.ID}...`);
        const comprehensiveResponse = await this.getCompleteUserSubscriptionInfo(user.ID);
        
        if (comprehensiveResponse.success && comprehensiveResponse.data) {
          console.log(`✅ Comprehensive data retrieved successfully`);
          
          const data = comprehensiveResponse.data;
          
          // Transform to our expected format but with much richer data
          const result = {
            success: true,
            user: {
              ...user,
              // Enhanced user data from comprehensive endpoint
              username: data.user.username,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              billingAddress: data.user.billingAddress
            },
            subscriptions: data.subscriptionHistory || [],
            currentToys: data.currentToys || [],
            activeSubscription: data.subscriptionCycle,
            metadata: {
              total_orders: data.totalOrders || 0,
              total_subscription_orders: data.totalSubscriptionOrders || 0,
              active_subscription: !!data.subscriptionCycle,
              has_subscription_data: true,
              user_type: 'woocommerce_legacy_comprehensive',
              environment: this.isProduction() ? 'production' : 'development',
              comprehensive_api_used: true
            }
          };

          console.log(`✅ Comprehensive WooCommerce profile assembled for ${data.user.username}: ${data.totalOrders} orders, ${data.currentToys?.length} total toys, active: ${!!data.subscriptionCycle}`);
          return result;
        }
      } catch (comprehensiveError: any) {
        console.warn(`⚠️ Comprehensive endpoint failed, falling back to manual collection:`, comprehensiveError.message);
      }

      // FALLBACK: Original manual data collection method
      // Try to get subscription data, but don't fail if it's not available
      let subscriptions = [];
      let totalToys = 0;
      let hasSubscriptionData = false;

      try {
        console.log(`📦 Attempting to fetch subscription data for user ${user.ID}...`);
        const subscriptionResponse = await this.getSubscriptionCycle(user.ID);
        subscriptions = subscriptionResponse.all_subscriptions || subscriptionResponse.data || [];
        hasSubscriptionData = true;
        
        console.log(`📦 Found ${subscriptions.length} subscription orders`);
        
        // Get order items for each order
        const ordersWithItems = [];
        
        for (const order of subscriptions) {
          try {
            const itemsResponse = await this.getOrderItems(order.order_id);
            const items = itemsResponse.data || [];
            
            // Filter out subscription plans to show only toys
            const actualToys = items.filter((item: any) => 
              item.product_name && 
              !item.product_name.toLowerCase().includes('plan') &&
              !item.product_name.toLowerCase().includes('subscription') &&
              item.order_item_type === 'line_item'
            );
            
            totalToys += actualToys.length;
            
            ordersWithItems.push({
              ...order,
              items: actualToys
            });
            
            console.log(`📦 Order ${order.order_id}: ${actualToys.length} toys (filtered from ${items.length} total items)`);
            
          } catch (error: any) {
            console.warn(`Failed to get items for order ${order.order_id}:`, error.message);
            ordersWithItems.push({
              ...order,
              items: []
            });
          }
        }
        
        subscriptions = ordersWithItems;
        
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch subscription data for user ${user.ID}:`, error.message);
        console.log(`✅ Still returning as WooCommerce user (basic profile available)`);
        hasSubscriptionData = false;
      }

      // Find active subscription
      const activeOrder = subscriptions.find(order => 
        order.order_status === 'wc-processing' || 
        order.subscription_status === 'Active' ||
        order.post_status === 'wc-processing' ||
        order.order_status === 'processing'
      );

      const result = {
        success: true,
        user: user,
        subscriptions: subscriptions,
        currentToys: activeOrder?.items || [],
        metadata: {
          total_orders: subscriptions.length,
          total_toys: totalToys,
          active_subscription: !!activeOrder,
          has_subscription_data: hasSubscriptionData,
          user_type: 'woocommerce_legacy_fallback',
          environment: this.isProduction() ? 'production' : 'development',
          comprehensive_api_used: false
        }
      };

      console.log(`✅ WooCommerce profile assembled for ${user.display_name}: ${result.metadata.total_orders} orders, ${result.metadata.total_toys} total toys, active: ${result.metadata.active_subscription}, subscription_data: ${hasSubscriptionData}`);
      return result;

    } catch (error: any) {
      console.error('Failed to get complete user profile:', error.message);
      throw error;
    }
  }

  /**
   * NEW: Get comprehensive user subscription info using the documented endpoint
   * @param {number|string} userId - User ID
   */
  static async getCompleteUserSubscriptionInfo(userId: number | string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await this.makeRequest(`/complete-subscription-info/${userId}`);
    return response;
  }

  // Legacy methods for backward compatibility
  static async getUserOrders(userId: string) {
    try {
      console.log(`📦 Fetching orders for user: ${userId}`);
      const response = await this.getSubscriptionCycle(userId);
      
      const orders = (response.all_subscriptions || response.data || []).map((item: any) => ({
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

  // Test connection to see which environment we're using
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      const environment = this.isProduction() ? 'PRODUCTION (Static Web App API)' : 'DEVELOPMENT (Direct VM API)';
      console.log(`✅ [${environment}] WooCommerce connection test:`, response);
      return response.success;
      
    } catch (error: any) {
      const environment = this.isProduction() ? 'PRODUCTION' : 'DEVELOPMENT';
      console.warn(`⚠️ [${environment}] WooCommerce connection test failed:`, error.message);
      return false;
    }
  }

  // Get current environment info
  static getEnvironmentInfo() {
    const isProduction = this.isProduction();
    const baseURL = this.getBaseURL();
    
    return {
      environment: isProduction ? 'production' : 'development',
      isProduction,
      baseURL,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side'
    };
  }
} 
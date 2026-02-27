// Supabase-based WooCommerce Service
// Uses Supabase Edge Function to access WordPress database
const getEdgeFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return supabaseUrl ? `${supabaseUrl}/functions/v1/woocommerce-proxy` : '';
};

export class SupabaseWooCommerceService {
  // Make API call to edge function with anon key for Supabase access
  private static async makeRequest(action: string, params: Record<string, string>) {
    try {
      const edgeFunctionUrl = getEdgeFunctionUrl();
      if (!edgeFunctionUrl) {
        throw new Error('Supabase URL not configured');
      }
      const url = new URL(edgeFunctionUrl);
      url.searchParams.set('action', action);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      console.log(`🔄 WooCommerce API: ${action}`, params);

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error('Supabase anon key not configured');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`API Error: ${data.error}`);
      }

      console.log(`✅ WooCommerce API: ${action} successful`);
      return data.data;

    } catch (error) {
      console.error(`❌ WooCommerce API: ${action} failed:`, error.message);
      throw error;
    }
  }

  // Get user by phone number
  static async getUserByPhone(phone: string) {
    return await this.makeRequest('getUserByPhone', { phone });
  }

  // Get user orders
  static async getUserOrders(userId: string) {
    return await this.makeRequest('getUserOrders', { userId });
  }

  // Get user subscriptions
  static async getUserSubscriptions(userId: string) {
    return await this.makeRequest('getUserSubscriptions', { userId });
  }

  // Get order items
  static async getOrderItems(orderId: string) {
    return await this.makeRequest('getOrderItems', { orderId });
  }

  // Helper method to map subscription status from WooCommerce
  static mapSubscriptionStatus(wcStatus: string): string {
    const statusMap: Record<string, string> = {
      'wc-active': 'active',
      'active': 'active',
      'wc-cancelled': 'cancelled',
      'cancelled': 'cancelled',
      'wc-expired': 'expired',
      'expired': 'expired',
      'wc-pending': 'pending',
      'pending': 'pending',
      'wc-on-hold': 'on-hold',
      'on-hold': 'on-hold'
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
      'on-hold': 'on-hold'
    };
    
    return statusMap[wcStatus] || wcStatus;
  }
} 
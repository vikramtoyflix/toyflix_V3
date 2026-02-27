// Mock WooCommerce Service for Local Development
// Simulates the Azure VM API responses with realistic data

export class MockWooCommerceService {
  // Mock user data based on your API testing
  private static mockUsers = {
    '9573332932': {
      ID: 3438,
      user_login: 'jyothi_k',
      user_email: 'jyothiharinath6.5@gmail.com',
      user_registered: '2024-10-18 00:00:00',
      display_name: 'Jyothi K',
      first_name: 'Jyothi',
      last_name: 'K',
      phone: '9573332932',
      address_1: 'SMN PG for gents / #34, #32, ground floor',
      address_2: '',
      city: 'Bengaluru',
      state: 'KA',
      postcode: '560064',
      country: 'IN'
    },
    '7795300742': {
      ID: 3501,
      user_login: 'test_user',
      user_email: 'test@example.com',
      user_registered: '2024-09-15 00:00:00',
      display_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      phone: '7795300742',
      address_1: 'Test Address',
      address_2: '',
      city: 'Mumbai',
      state: 'MH',
      postcode: '400001',
      country: 'IN'
    }
  };

  // Mock orders data based on your API testing
  private static mockOrders = {
    '3438': [
      {
        order_id: 28192,
        created_at: '2025-06-25 00:00:00',
        post_status: 'wc-pic-completed',
        total_amount: '0',
        currency: 'INR',
        subscription_name: 'Trial Plan',
        subscription_status: 'processing',
        subscription_months: '1',
        customer_id: '3438'
      },
      {
        order_id: 22165,
        created_at: '2024-11-19 00:00:00',
        post_status: 'wc-completed',
        total_amount: '5999',
        currency: 'INR',
        subscription_name: '6 Month Plan',
        subscription_status: 'completed',
        subscription_months: '6',
        customer_id: '3438'
      },
      {
        order_id: 20932,
        created_at: '2024-10-18 00:00:00',
        post_status: 'wc-completed',
        total_amount: '5999',
        currency: 'INR',
        subscription_name: '6 Month Plan',
        subscription_status: 'completed',
        subscription_months: '6',
        customer_id: '3438'
      }
    ],
    '3501': [
      {
        order_id: 25000,
        created_at: '2024-12-01 00:00:00',
        post_status: 'wc-completed',
        total_amount: '1299',
        currency: 'INR',
        subscription_name: 'Monthly Plan',
        subscription_status: 'active',
        subscription_months: '1',
        customer_id: '3501'
      }
    ]
  };

  // Mock order items based on your API testing
  private static mockOrderItems = {
    '28192': [
      {
        order_item_id: 101,
        product_name: 'Baybee Push Ride on Baby Jeep for Kids',
        product_id: '24509',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 102,
        product_name: 'Electronic Steering Wheel',
        product_id: '9232',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 103,
        product_name: 'ABC artificial intelligence board book',
        product_id: '28134',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 104,
        product_name: 'Snoeplay Tracto Busy Board',
        product_id: '9230',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      }
    ],
    '22165': [
      {
        order_item_id: 201,
        product_name: '6 Month Plan',
        product_id: '7826',
        quantity: '1',
        total: '5999',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 202,
        product_name: 'Indoor Slide Junior',
        product_id: '8218',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 203,
        product_name: 'Spinning Tower',
        product_id: '9234',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 204,
        product_name: 'Play Go Busy Ball Tower',
        product_id: '7952',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 205,
        product_name: 'Touch and Feel Pet Animals Book',
        product_id: '22014',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      }
    ],
    '25000': [
      {
        order_item_id: 301,
        product_name: 'Educational Building Blocks',
        product_id: '12345',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      },
      {
        order_item_id: 302,
        product_name: 'Colorful Puzzle Set',
        product_id: '12346',
        quantity: '1',
        total: '0',
        variation_id: null,
        order_item_type: 'line_item'
      }
    ]
  };

  static async getUserByPhone(phone: string) {
    console.log(`🧪 Mock: Looking up user by phone: ${phone}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.mockUsers[phone as keyof typeof this.mockUsers];
    if (user) {
      console.log(`✅ Mock: Found user:`, user);
      return user;
    } else {
      console.log(`❌ Mock: No user found for phone: ${phone}`);
      return null;
    }
  }

  static async getUserOrders(userId: string) {
    console.log(`📦 Mock: Fetching orders for user: ${userId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const orders = this.mockOrders[userId as keyof typeof this.mockOrders] || [];
    
    const processedOrders = orders.map(order => ({
      order_id: order.order_id,
      created_at: order.created_at,
      post_status: order.post_status,
      total_amount: order.total_amount,
      currency: order.currency,
      subscription_name: order.subscription_name,
      subscription_status: order.subscription_status,
      subscription_months: order.subscription_months,
      customer_id: order.customer_id,
      _raw: order
    }));
    
    console.log(`✅ Mock: Found ${processedOrders.length} orders:`, processedOrders);
    return processedOrders;
  }

  static async getUserSubscriptions(userId: string) {
    console.log(`🔄 Mock: Fetching subscriptions for user: ${userId}`);
    
    const orders = await this.getUserOrders(userId);
    
    // Transform orders to subscription format
    const subscriptions = orders.map(order => ({
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
    
    console.log(`✅ Mock: Found ${subscriptions.length} subscriptions:`, subscriptions);
    return subscriptions;
  }

  static async getOrderItems(orderId: string) {
    console.log(`📋 Mock: Fetching items for order: ${orderId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const items = this.mockOrderItems[orderId as keyof typeof this.mockOrderItems] || [];
    
    const processedItems = items.map(item => ({
      order_item_id: item.order_item_id,
      product_name: item.product_name,
      product_id: item.product_id,
      quantity: item.quantity,
      total: item.total,
      variation_id: item.variation_id,
      order_item_type: item.order_item_type,
      _raw: item
    }));
    
    console.log(`✅ Mock: Found ${processedItems.length} items:`, processedItems);
    return processedItems;
  }

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
      'on-hold': 'on-hold',
      'wc-pic-completed': 'completed',
      'wc-completed': 'completed',
      'wc-processing': 'processing',
    };
    
    return statusMap[wcStatus] || wcStatus;
  }

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

  static async testConnection(): Promise<boolean> {
    console.log('✅ Mock: Connection test always succeeds');
    return true;
  }
} 
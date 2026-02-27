import mysql from 'mysql2/promise';

// WooCommerce Database Service
// Provides read-only access to existing WordPress/WooCommerce data
export class WooCommerceService {
  private static connection: mysql.Connection | null = null;

  // Initialize connection to WooCommerce database
  private static async getConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.VITE_WC_DB_HOST || 'localhost',
        user: process.env.VITE_WC_DB_USER || 'root',
        password: process.env.VITE_WC_DB_PASSWORD || '',
        database: process.env.VITE_WC_DB_NAME || 'wordpress',
        port: parseInt(process.env.VITE_WC_DB_PORT || '3306'),
        ssl: process.env.VITE_WC_DB_SSL === 'true' ? {} : false
      });
    }
    return this.connection;
  }

  // Find user by phone number in WooCommerce
  static async getUserByPhone(phone: string): Promise<any | null> {
    try {
      const connection = await this.getConnection();
      
      // Clean phone number (remove +91, spaces, etc.)
      const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
      
      const [rows] = await connection.execute(`
        SELECT 
          u.ID,
          u.user_login,
          u.user_email,
          u.user_registered,
          u.display_name,
          billing_first_name.meta_value as first_name,
          billing_last_name.meta_value as last_name,
          billing_phone.meta_value as phone,
          billing_address_1.meta_value as address_1,
          billing_address_2.meta_value as address_2,
          billing_city.meta_value as city,
          billing_state.meta_value as state,
          billing_postcode.meta_value as postcode,
          billing_country.meta_value as country
        FROM wp_users u
        LEFT JOIN wp_usermeta billing_first_name ON u.ID = billing_first_name.user_id AND billing_first_name.meta_key = 'billing_first_name'
        LEFT JOIN wp_usermeta billing_last_name ON u.ID = billing_last_name.user_id AND billing_last_name.meta_key = 'billing_last_name'
        LEFT JOIN wp_usermeta billing_phone ON u.ID = billing_phone.user_id AND billing_phone.meta_key = 'billing_phone'
        LEFT JOIN wp_usermeta billing_address_1 ON u.ID = billing_address_1.user_id AND billing_address_1.meta_key = 'billing_address_1'
        LEFT JOIN wp_usermeta billing_address_2 ON u.ID = billing_address_2.user_id AND billing_address_2.meta_key = 'billing_address_2'
        LEFT JOIN wp_usermeta billing_city ON u.ID = billing_city.user_id AND billing_city.meta_key = 'billing_city'
        LEFT JOIN wp_usermeta billing_state ON u.ID = billing_state.user_id AND billing_state.meta_key = 'billing_state'
        LEFT JOIN wp_usermeta billing_postcode ON u.ID = billing_postcode.user_id AND billing_postcode.meta_key = 'billing_postcode'
        LEFT JOIN wp_usermeta billing_country ON u.ID = billing_country.user_id AND billing_country.meta_key = 'billing_country'
        WHERE billing_phone.meta_value LIKE ?
        LIMIT 1
      `, [`%${cleanPhone}%`]);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error fetching WooCommerce user:', error);
      return null;
    }
  }

  // Get user orders from WooCommerce
  static async getUserOrders(userId: string): Promise<any[]> {
    try {
      const connection = await this.getConnection();
      
      const [rows] = await connection.execute(`
        SELECT 
          p.ID as order_id,
          p.post_date as created_at,
          p.post_status,
          order_total.meta_value as total_amount,
          order_currency.meta_value as currency,
          billing_first_name.meta_value as billing_first_name,
          billing_last_name.meta_value as billing_last_name,
          billing_phone.meta_value as billing_phone,
          billing_address_1.meta_value as billing_address_1,
          billing_city.meta_value as billing_city,
          billing_state.meta_value as billing_state,
          billing_postcode.meta_value as billing_postcode
        FROM wp_posts p
        LEFT JOIN wp_postmeta customer_user ON p.ID = customer_user.post_id AND customer_user.meta_key = '_customer_user'
        LEFT JOIN wp_postmeta order_total ON p.ID = order_total.post_id AND order_total.meta_key = '_order_total'
        LEFT JOIN wp_postmeta order_currency ON p.ID = order_currency.post_id AND order_currency.meta_key = '_order_currency'
        LEFT JOIN wp_postmeta billing_first_name ON p.ID = billing_first_name.post_id AND billing_first_name.meta_key = '_billing_first_name'
        LEFT JOIN wp_postmeta billing_last_name ON p.ID = billing_last_name.post_id AND billing_last_name.meta_key = '_billing_last_name'
        LEFT JOIN wp_postmeta billing_phone ON p.ID = billing_phone.post_id AND billing_phone.meta_key = '_billing_phone'
        LEFT JOIN wp_postmeta billing_address_1 ON p.ID = billing_address_1.post_id AND billing_address_1.meta_key = '_billing_address_1'
        LEFT JOIN wp_postmeta billing_city ON p.ID = billing_city.post_id AND billing_city.meta_key = '_billing_city'
        LEFT JOIN wp_postmeta billing_state ON p.ID = billing_state.post_id AND billing_state.meta_key = '_billing_state'
        LEFT JOIN wp_postmeta billing_postcode ON p.ID = billing_postcode.post_id AND billing_postcode.meta_key = '_billing_postcode'
        WHERE p.post_type = 'shop_order'
        AND customer_user.meta_value = ?
        ORDER BY p.post_date DESC
      `, [userId]);

      return rows as any[];
    } catch (error) {
      console.error('Error fetching WooCommerce orders:', error);
      return [];
    }
  }

  // Get order items for a specific order
  static async getOrderItems(orderId: string): Promise<any[]> {
    try {
      const connection = await this.getConnection();
      
      const [rows] = await connection.execute(`
        SELECT 
          oi.order_item_id,
          oi.order_item_name as product_name,
          oi.order_item_type,
          qty.meta_value as quantity,
          total.meta_value as total,
          product_id.meta_value as product_id
        FROM wp_woocommerce_order_items oi
        LEFT JOIN wp_woocommerce_order_itemmeta qty ON oi.order_item_id = qty.order_item_id AND qty.meta_key = '_qty'
        LEFT JOIN wp_woocommerce_order_itemmeta total ON oi.order_item_id = total.order_item_id AND total.meta_key = '_line_total'
        LEFT JOIN wp_woocommerce_order_itemmeta product_id ON oi.order_item_id = product_id.order_item_id AND product_id.meta_key = '_product_id'
        WHERE oi.order_id = ?
        AND oi.order_item_type = 'line_item'
      `, [orderId]);

      return rows as any[];
    } catch (error) {
      console.error('Error fetching WooCommerce order items:', error);
      return [];
    }
  }

  // Get user subscriptions from WooCommerce
  static async getUserSubscriptions(userId: string): Promise<any[]> {
    try {
      const connection = await this.getConnection();
      
      const [rows] = await connection.execute(`
        SELECT 
          p.ID as subscription_id,
          p.post_date as created_at,
          p.post_status,
          billing_period.meta_value as billing_period,
          billing_interval.meta_value as billing_interval,
          order_total.meta_value as total_amount,
          start_date.meta_value as start_date,
          end_date.meta_value as end_date,
          next_payment.meta_value as next_payment_date
        FROM wp_posts p
        LEFT JOIN wp_postmeta customer_user ON p.ID = customer_user.post_id AND customer_user.meta_key = '_customer_user'
        LEFT JOIN wp_postmeta billing_period ON p.ID = billing_period.post_id AND billing_period.meta_key = '_billing_period'
        LEFT JOIN wp_postmeta billing_interval ON p.ID = billing_interval.post_id AND billing_interval.meta_key = '_billing_interval'
        LEFT JOIN wp_postmeta order_total ON p.ID = order_total.post_id AND order_total.meta_key = '_order_total'
        LEFT JOIN wp_postmeta start_date ON p.ID = start_date.post_id AND start_date.meta_key = '_schedule_start'
        LEFT JOIN wp_postmeta end_date ON p.ID = end_date.post_id AND end_date.meta_key = '_schedule_end'
        LEFT JOIN wp_postmeta next_payment ON p.ID = next_payment.post_id AND next_payment.meta_key = '_schedule_next_payment'
        WHERE p.post_type = 'shop_subscription'
        AND customer_user.meta_value = ?
        ORDER BY p.post_date DESC
      `, [userId]);

      return rows as any[];
    } catch (error) {
      console.error('Error fetching WooCommerce subscriptions:', error);
      return [];
    }
  }

  // Map WooCommerce order status to our system
  static mapOrderStatus(wcStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'wc-pending': 'pending',
      'wc-processing': 'processing',
      'wc-on-hold': 'on_hold',
      'wc-completed': 'delivered',
      'wc-cancelled': 'cancelled',
      'wc-refunded': 'refunded',
      'wc-failed': 'failed'
    };
    
    return statusMap[wcStatus] || wcStatus.replace('wc-', '');
  }

  // Map WooCommerce subscription status to our system
  static mapSubscriptionStatus(wcStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'wc-active': 'active',
      'wc-pending': 'pending',
      'wc-on-hold': 'paused',
      'wc-cancelled': 'cancelled',
      'wc-expired': 'expired',
      'wc-pending-cancel': 'pending_cancellation'
    };
    
    return statusMap[wcStatus] || wcStatus.replace('wc-', '');
  }

  // Close database connection
  static async closeConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
} 
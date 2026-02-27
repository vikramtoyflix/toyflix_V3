const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: 'localhost', // Since this runs on the same VM as MySQL
  user: 'toyflix_user',
  password: 'toyflixX1@@',
  database: 'toyflix',
  port: 3306,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 10000
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'WooCommerce API Server'
  });
});

// Get user by phone number (NEW ENDPOINT)
app.get('/api/user-by-phone/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    console.log(`Looking up user by phone: ${phone}`);

    const connection = await mysql.createConnection(dbConfig);
    
    // Clean phone number (remove +91, spaces, etc.)
    const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
    console.log(`Cleaned phone: ${cleanPhone}`);
    
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

    await connection.end();

    if (rows && rows.length > 0) {
      console.log(`Found user with ID: ${rows[0].ID}`);
      res.json({
        success: true,
        data: rows[0],
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`No user found with phone: ${cleanPhone}`);
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error looking up user by phone:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get user by email (EXISTING ENDPOINT)
app.get('/api/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    console.log(`Looking up user: ${email}`);

    const connection = await mysql.createConnection(dbConfig);
    
    const [userRows] = await connection.execute(
      'SELECT * FROM wp_users WHERE user_email = ?',
      [email]
    );
    
    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userRows[0];
    
    const [metaRows] = await connection.execute(
      'SELECT meta_key, meta_value FROM wp_usermeta WHERE user_id = ?',
      [user.ID]
    );
    
    await connection.end();
    
    const userMeta = {};
    metaRows.forEach(row => {
      userMeta[row.meta_key] = row.meta_value;
    });
    
    res.json({
      success: true,
      data: {
        user,
        meta: userMeta
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get subscription cycle for user (EXISTING ENDPOINT)
app.get('/api/subscription-cycle/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Looking up subscription cycle for user: ${userId}`);

    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        p.ID as order_id,
        p.post_date as created_at,
        p.post_status,
        customer_user.meta_value as customer_id,
        order_total.meta_value as total_amount,
        order_currency.meta_value as currency,
        subscription_name.meta_value as subscription_name,
        subscription_status.meta_value as subscription_status,
        subscription_months.meta_value as subscription_months,
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
      LEFT JOIN wp_postmeta subscription_name ON p.ID = subscription_name.post_id AND subscription_name.meta_key = 'subscription_name'
      LEFT JOIN wp_postmeta subscription_status ON p.ID = subscription_status.post_id AND subscription_status.meta_key = 'subscription_status'
      LEFT JOIN wp_postmeta subscription_months ON p.ID = subscription_months.post_id AND subscription_months.meta_key = 'subscription_months'
      LEFT JOIN wp_postmeta billing_first_name ON p.ID = billing_first_name.post_id AND billing_first_name.meta_key = '_billing_first_name'
      LEFT JOIN wp_postmeta billing_last_name ON p.ID = billing_last_name.post_id AND billing_last_name.meta_key = '_billing_last_name'
      LEFT JOIN wp_postmeta billing_phone ON p.ID = billing_phone.post_id AND billing_phone.meta_key = '_billing_phone'
      LEFT JOIN wp_postmeta billing_address_1 ON p.ID = billing_address_1.post_id AND billing_address_1.meta_key = '_billing_address_1'
      LEFT JOIN wp_postmeta billing_city ON p.ID = billing_city.post_id AND billing_city.meta_key = '_billing_city'
      LEFT JOIN wp_postmeta billing_state ON p.ID = billing_state.post_id AND billing_state.meta_key = '_billing_state'
      LEFT JOIN wp_postmeta billing_postcode ON p.ID = billing_postcode.post_id AND billing_postcode.meta_key = '_billing_postcode'
      WHERE p.post_type = 'shop_order'
      AND customer_user.meta_value = ?
      AND p.post_status IN ('wc-completed', 'wc-processing', 'wc-pic-completed')
      ORDER BY p.post_date DESC
    `, [userId]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get order items (NEW ENDPOINT)
app.get('/api/order-items/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(`Looking up order items for order: ${orderId}`);

    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        oi.order_item_id,
        oi.order_item_name as product_name,
        oi.order_item_type,
        qty.meta_value as quantity,
        total.meta_value as total,
        product_id.meta_value as product_id,
        variation_id.meta_value as variation_id
      FROM wp_woocommerce_order_items oi
      LEFT JOIN wp_woocommerce_order_itemmeta qty ON oi.order_item_id = qty.order_item_id AND qty.meta_key = '_qty'
      LEFT JOIN wp_woocommerce_order_itemmeta total ON oi.order_item_id = total.order_item_id AND total.meta_key = '_line_total'
      LEFT JOIN wp_woocommerce_order_itemmeta product_id ON oi.order_item_id = product_id.order_item_id AND product_id.meta_key = '_product_id'
      LEFT JOIN wp_woocommerce_order_itemmeta variation_id ON oi.order_item_id = variation_id.order_item_id AND variation_id.meta_key = '_variation_id'
      WHERE oi.order_id = ?
      AND oi.order_item_type = 'line_item'
      ORDER BY oi.order_item_id
    `, [orderId]);

    await connection.end();
    
    console.log(`Found ${rows.length} items for order ${orderId}`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WooCommerce API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 User by email: http://localhost:${PORT}/api/user/:email`);
  console.log(`📱 User by phone: http://localhost:${PORT}/api/user-by-phone/:phone`);
  console.log(`🔄 Subscription cycle: http://localhost:${PORT}/api/subscription-cycle/:userId`);
  console.log(`📦 Order items: http://localhost:${PORT}/api/order-items/:orderId`);
  console.log(`🌐 External access: http://4.213.183.90:${PORT}/api/`);
});

module.exports = app; 
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

console.log("WooCommerce Proxy function started");

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const phone = url.searchParams.get('phone');
    const userId = url.searchParams.get('userId');
    const orderId = url.searchParams.get('orderId');

    console.log(`🔍 WooCommerce Proxy - Action: ${action}, Phone: ${phone}, UserId: ${userId}`);

    // Basic validation
    if (!action) {
      throw new Error('Action parameter is required');
    }

    // For custom auth, we can either:
    // 1. Skip auth validation for now (since this is internal data fetching)
    // 2. Validate custom JWT token if passed in headers
    // Let's allow unauthenticated access for WooCommerce data fetching
    
    console.log("🔓 Custom auth mode - allowing WooCommerce data access");

    // Get environment variables with fallbacks
    const dbHost = Deno.env.get('WC_DB_HOST') || '4.213.183.90';
    const dbUser = Deno.env.get('WC_DB_USER') || 'toyflix_user';
    const dbPassword = Deno.env.get('WC_DB_PASSWORD') || 'toyflixX1@@';
    const dbName = Deno.env.get('WC_DB_NAME') || 'toyflix';
    const dbPort = parseInt(Deno.env.get('WC_DB_PORT') || '3306');

    console.log(`🔌 Connecting to database: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

    // Connect to WordPress database
    const client = await new Client().connect({
      hostname: dbHost,
      username: dbUser,
      password: dbPassword,
      db: dbName,
      port: dbPort,
    });

    console.log("✅ Connected to WordPress database");

    let result = null;

    switch (action) {
      case 'getUserByPhone':
        if (!phone) {
          throw new Error('Phone parameter is required');
        }
        result = await getUserByPhone(client, phone);
        break;

      case 'getUserOrders':
        if (!userId) {
          throw new Error('UserId parameter is required');
        }
        result = await getUserOrders(client, userId);
        break;

      case 'getUserSubscriptions':
        if (!userId) {
          throw new Error('UserId parameter is required');
        }
        result = await getUserSubscriptions(client, userId);
        break;

      case 'getOrderItems':
        if (!orderId) {
          throw new Error('OrderId parameter is required');
        }
        result = await getOrderItems(client, orderId);
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    await client.close();
    console.log(`✅ WooCommerce Proxy - ${action} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ WooCommerce Proxy Error:", error.message);
    console.error("❌ Stack trace:", error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Find user by phone number in WooCommerce
async function getUserByPhone(client: Client, phone: string) {
  console.log(`🔍 Searching for user with phone: ${phone}`);
  
  // Clean phone number (remove +91, spaces, etc.)
  const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
  console.log(`🧹 Cleaned phone: ${cleanPhone}`);
  
  try {
    const result = await client.execute(`
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

    if (result.rows && result.rows.length > 0) {
      console.log(`✅ Found user with ID: ${result.rows[0].ID}`);
      return result.rows[0];
    } else {
      console.log(`❌ No user found with phone: ${cleanPhone}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Database error in getUserByPhone:`, error.message);
    throw error;
  }
}

// Get user orders from WooCommerce
async function getUserOrders(client: Client, userId: string) {
  console.log(`📦 Fetching orders for user: ${userId}`);
  
  try {
    const result = await client.execute(`
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

    console.log(`✅ Found ${result.rows?.length || 0} orders for user ${userId}`);
    return result.rows || [];
  } catch (error) {
    console.error(`❌ Database error in getUserOrders:`, error.message);
    throw error;
  }
}

// Get user subscriptions from WooCommerce
async function getUserSubscriptions(client: Client, userId: string) {
  console.log(`🔄 Fetching subscriptions for user: ${userId}`);
  
  try {
    const result = await client.execute(`
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

    console.log(`✅ Found ${result.rows?.length || 0} subscriptions for user ${userId}`);
    return result.rows || [];
  } catch (error) {
    console.error(`❌ Database error in getUserSubscriptions:`, error.message);
    throw error;
  }
}

// Get order items for a specific order
async function getOrderItems(client: Client, orderId: string) {
  console.log(`📋 Fetching order items for order: ${orderId}`);
  
  try {
    const result = await client.execute(`
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

    console.log(`✅ Found ${result.rows?.length || 0} items for order ${orderId}`);
    return result.rows || [];
  } catch (error) {
    console.error(`❌ Database error in getOrderItems:`, error.message);
    throw error;
  }
} 
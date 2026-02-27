const mysql = require('mysql2/promise');

module.exports = async function (context, req) {
    const orderId = req.params.orderId || (req.body && req.body.orderId);
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: corsHeaders
        };
        return;
    }

    if (!orderId) {
        context.res = {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: 'OrderId parameter is required',
                timestamp: new Date().toISOString()
            }
        };
        return;
    }

    try {
        context.log('📋 Fetching order items for order:', orderId);

        // Database connection
        const connection = await mysql.createConnection({
            host: process.env.WC_DB_HOST || '4.213.183.90',
            port: process.env.WC_DB_PORT || 3306,
            user: process.env.WC_DB_USER || 'toyflix_user',
            password: process.env.WC_DB_PASSWORD || 'toyflixX1@@',
            database: process.env.WC_DB_NAME || 'toyflix'
        });

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
        `, [orderId]);

        await connection.end();

        context.log('✅ Found items:', rows.length);

        // ✅ FIXED: Return single-nested data structure (no double nesting)
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: true,
                data: rows,  // ✅ DIRECT DATA ARRAY - matches working implementation
                count: rows.length,
                proxy: 'azure-function-fixed',
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('❌ Database error:', error.message);
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: error.message,
                proxy: 'azure-function-fixed',
                timestamp: new Date().toISOString()
            }
        };
    }
}; 
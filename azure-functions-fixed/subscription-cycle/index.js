const mysql = require('mysql2/promise');

module.exports = async function (context, req) {
    const userId = req.params.userId || (req.body && req.body.userId);
    
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

    if (!userId) {
        context.res = {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: 'User ID parameter is required',
                timestamp: new Date().toISOString()
            }
        };
        return;
    }

    try {
        context.log('🔄 Fetching subscription cycle for user:', userId);

        // Database connection
        const connection = await mysql.createConnection({
            host: process.env.WC_DB_HOST || '4.213.183.90',
            port: process.env.WC_DB_PORT || 3306,
            user: process.env.WC_DB_USER || 'toyflix_user',
            password: process.env.WC_DB_PASSWORD || 'toyflixX1@@',
            database: process.env.WC_DB_NAME || 'toyflix'
        });

        const [rows] = await connection.execute(`
            SELECT DISTINCT
                po.ID as order_id,
                po.post_date as order_date,
                po.post_status as order_status,
                pm_total.meta_value as total_amount,
                -- Try to get subscription info from different possible sources
                COALESCE(
                    sub_name.meta_value,
                    item_name.order_item_name,
                    'Unknown Plan'
                ) as subscription_name,
                COALESCE(
                    sub_status.meta_value,
                    CASE 
                        WHEN po.post_status = 'wc-processing' THEN 'Active'
                        WHEN po.post_status = 'wc-completed' THEN 'Completed'
                        ELSE 'Unknown'
                    END
                ) as subscription_status,
                -- Try to extract months from subscription name or default to 1
                CASE 
                    WHEN COALESCE(sub_name.meta_value, item_name.order_item_name) LIKE '%12%' OR 
                         COALESCE(sub_name.meta_value, item_name.order_item_name) LIKE '%year%' THEN 12
                    WHEN COALESCE(sub_name.meta_value, item_name.order_item_name) LIKE '%6%' THEN 6
                    WHEN COALESCE(sub_name.meta_value, item_name.order_item_name) LIKE '%3%' THEN 3
                    ELSE 1
                END as subscription_months
            FROM wp_posts po
            LEFT JOIN wp_postmeta pm_total ON po.ID = pm_total.post_id AND pm_total.meta_key = '_order_total'
            LEFT JOIN wp_postmeta pm_customer ON po.ID = pm_customer.post_id AND pm_customer.meta_key = '_customer_user'
            LEFT JOIN wp_postmeta sub_name ON po.ID = sub_name.post_id AND sub_name.meta_key = '_subscription_name'
            LEFT JOIN wp_postmeta sub_status ON po.ID = sub_status.post_id AND sub_status.meta_key = '_subscription_status'
            LEFT JOIN wp_woocommerce_order_items item_name ON po.ID = item_name.order_id AND item_name.order_item_type = 'line_item'
            WHERE po.post_type = 'shop_order' 
            AND pm_customer.meta_value = ?
            ORDER BY po.post_date DESC
        `, [userId]);

        await connection.end();

        context.log('✅ Found subscriptions:', rows.length);

        // Return in the format expected by subscription-cycle (already working correctly)
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                user_id: userId.toString(),
                all_subscriptions: rows,  // Direct array format that works
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
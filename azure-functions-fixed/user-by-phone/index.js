const mysql = require('mysql2/promise');

module.exports = async function (context, req) {
    const phone = req.params.phone || (req.body && req.body.phone);
    
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

    if (!phone) {
        context.res = {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: 'Phone parameter is required',
                timestamp: new Date().toISOString()
            }
        };
        return;
    }

    try {
        context.log('🔍 Looking up user by phone:', phone);

        // Database connection
        const connection = await mysql.createConnection({
            host: process.env.WC_DB_HOST || '4.213.183.90',
            port: process.env.WC_DB_PORT || 3306,
            user: process.env.WC_DB_USER || 'toyflix_user',
            password: process.env.WC_DB_PASSWORD || 'toyflixX1@@',
            database: process.env.WC_DB_NAME || 'toyflix'
        });

        // Clean phone number (remove +91, spaces, etc.)
        const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
        context.log('🧹 Cleaned phone:', cleanPhone);

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

        if (rows.length > 0) {
            context.log('✅ Found user:', rows[0].ID);
            
            // ✅ FIXED: Return single-nested data structure (no double nesting)
            context.res = {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    success: true,
                    data: rows[0],  // ✅ DIRECT DATA - matches working implementation
                    proxy: 'azure-function-fixed',
                    timestamp: new Date().toISOString()
                }
            };
        } else {
            context.log('❌ No user found for phone:', cleanPhone);
            context.res = {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    success: false,
                    error: 'User not found',
                    proxy: 'azure-function-fixed',
                    timestamp: new Date().toISOString()
                }
            };
        }

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
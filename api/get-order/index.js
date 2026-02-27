// Use REST API for Azure Functions compatibility
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';

module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: Get orders request');
        
        // Get token from query params
        let user_token = req.query.token;
        
        // Handle URL decoding issues - decode the token properly
        if (user_token) {
            user_token = decodeURIComponent(user_token);
            // Remove any whitespace that might have been introduced
            user_token = user_token.trim();
        }
        
        const page = parseInt(req.query.page) || 1;
        const per_page = parseInt(req.query.per_page) || -1;
        
        context.log(`📱 Get orders - Token: ${user_token ? `"${user_token}" (${user_token.length} chars)` : 'missing'}, Page: ${page}, Per page: ${per_page}`);
        
        if (!user_token) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'Please first sign up.'
                }
            };
        }
        
        // Extract phone number from token if it's in format: token_PHONE_TIMESTAMP
        let phoneNumber = user_token;
        const tokenMatch = user_token.match(/^token_(\d+)_\d+$/);
        if (tokenMatch) {
            phoneNumber = tokenMatch[1];
            context.log(`📱 Extracted phone from token: ${phoneNumber}`);
        }
        
        // Find user by phone number (similar to other endpoints)
        let user = null;
        
        // Try multiple phone formats for lookup
        const phoneFormats = [
            phoneNumber,                                      // Extracted phone number or original token
            phoneNumber.replace(/^\+91/, ''),                // Remove +91 prefix
            phoneNumber.replace(/^91/, ''),                  // Remove 91 prefix  
            phoneNumber.replace(/^\+?91/, ''),               // Remove any 91 prefix with optional +
            phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`, // Add +91 prefix if not present
            phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`,   // Add 91 prefix if not present
            phoneNumber.replace(/[^\d]/g, ''),               // Only digits
            phoneNumber.replace(/[^\d]/g, '').slice(-10),    // Last 10 digits only
        ];
        
        // Also try with common patterns for 10-digit numbers
        const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
        if (cleanPhone.length >= 10) {
            const last10 = cleanPhone.slice(-10);
            phoneFormats.push(
                last10,                                   // Clean 10 digits
                `+91${last10}`,                          // +91 + 10 digits
                `91${last10}`,                           // 91 + 10 digits
            );
        }
        
        const uniqueFormats = [...new Set(phoneFormats)];
        context.log(`🔍 Trying phone formats for orders: ${uniqueFormats.join(', ')}`);
        
        for (const phoneFormat of uniqueFormats) {
            const response = await fetch(`${supabaseUrl}/rest/v1/custom_users?phone=eq.${encodeURIComponent(phoneFormat)}&select=id,phone,first_name,last_name`, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                if (users && users.length > 0) {
                    user = users[0];
                    context.log(`✅ User found for orders with phone format: ${phoneFormat}`);
                    break;
                }
            }
        }
        
        if (!user) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'User not found. Please check your authentication.'
                }
            };
        }
        
        context.log(`✅ User validated: ${user.id}`);
        
        // Get user's orders from rental_orders table using REST API
        let ordersUrl = `${supabaseUrl}/rest/v1/rental_orders?user_id=eq.${user.id}&select=id,order_number,status,total_amount,created_at,delivery_date,toys_data,subscription_plan&order=created_at.desc`;
        
        // Apply pagination if specified
        if (per_page > 0) {
            const offset = (page - 1) * per_page;
            const limit = offset + per_page - 1;
            ordersUrl += `&offset=${offset}&limit=${per_page}`;
        }
        
        const ordersResponse = await fetch(ordersUrl, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        let orders = [];
        if (ordersResponse.ok) {
            orders = await ordersResponse.json();
        }
        
        if (!orders || orders.length === 0) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 404,
                    message: 'No orders found.',
                    data: [],
                    backend: "supabase-real-data",
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        // Format orders to match WordPress API response with enhanced mobile app compatibility
        const formattedOrders = orders.map(order => {
            // Parse toys data - ENHANCED with all fields mobile app might need
            let items = [];
            if (order.toys_data && Array.isArray(order.toys_data)) {
                items = order.toys_data.map(toy => ({
                    // All possible field names for maximum compatibility
                    id: toy.toy_id || toy.id,
                    product_id: toy.toy_id || toy.id,
                    product_name: toy.name || toy.product_name || 'Unknown Product',
                    name: toy.name || toy.product_name || 'Unknown Product',
                    product_image: toy.image_url || toy.image || '',
                    image: toy.image_url || toy.image || '',
                    quantity: toy.quantity || 1,
                    price: toy.unit_price || toy.total_price || 0,
                    unit_price: toy.unit_price || 0,
                    total_price: toy.total_price || 0
                }));
            }
            
            // Map status to readable format
            const statusMap = {
                'pending': 'Pending',
                'confirmed': 'Processing',
                'processing': 'Processing',
                'shipped': 'Shipped',
                'delivered': 'Completed',
                'completed': 'Completed',
                'cancelled': 'Cancelled'
            };
            
            const readable_status = statusMap[order.status] || order.status;
            
            // Determine if it's a subscription order
            const is_subscription = order.subscription_plan ? 1 : 0;
            
            // Return with MULTIPLE field name variations for maximum compatibility
            return {
                // Primary fields (current format)
                order_id: order.id,
                is_subscription: is_subscription,
                total: order.total_amount || 0,
                status: readable_status,
                order_date: order.created_at,
                delivery_date: order.delivery_date || null,
                items: items,
                
                // Alternative field names (for mobile app compatibility)
                id: order.id,  // Some apps expect 'id' not 'order_id'
                order_number: order.order_number || `ORD-${order.id?.substring(0, 8)}`,
                order_status: readable_status,  // Some apps expect 'order_status'
                subscription: is_subscription === 1,  // Boolean version
                total_amount: order.total_amount || 0,
                amount: order.total_amount || 0,
                created_at: order.created_at,
                date: order.created_at,
                products: items,  // Some apps expect 'products' not 'items'
                
                // Additional useful fields
                payment_status: order.payment_status || 'pending',
                user_phone: order.user_phone || null
            };
        });
        
        // Get total count for pagination using REST API
        const total_orders_count = orders.length; // For simplicity, use current batch count
        const total_pages = per_page > 0 ? Math.ceil(total_orders_count / per_page) : 1;
        
        context.log(`✅ Found ${formattedOrders.length} orders for user: ${user.id}`);
        context.log(`📋 Order IDs:`, formattedOrders.map(o => o.order_id));
        
        // Return response with MULTIPLE format options for maximum mobile app compatibility
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                status: 200,
                message: 'Orders retrieved successfully',
                data: formattedOrders,  // Nested format (standard)
                orders: formattedOrders,  // Alternative field name
                count: formattedOrders.length,  // Order count
                pagination: {
                    total: total_orders_count,
                    total_pages: total_pages,
                    current_page: page,
                    per_page: per_page
                },
                backend: "supabase-real-data",
                timestamp: new Date().toISOString(),
                // WordPress compatibility fields
                success: true,
                found: formattedOrders.length
            }
        };
        
    } catch (error) {
        context.log.error('❌ Error in get-order:', error);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                status: 500,
                message: error.message || 'Internal server error',
                data: null,
                backend: "supabase-real-data",
                timestamp: new Date().toISOString()
            }
        };
    }
};

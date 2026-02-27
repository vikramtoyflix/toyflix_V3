module.exports = async function (context, req) {
    const phone = req.params.phone;
    
    // CORS headers for Static Web App
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
                proxy: 'static-web-app-api',
                timestamp: new Date().toISOString()
            }
        };
        return;
    }

    try {
        context.log(`🔍 Static Web App API: Looking up order items for phone: ${phone}`);
        
        // Clean and decode phone number
        const cleanPhone = decodeURIComponent(phone);
        context.log(`🧹 Static Web App API: Cleaned phone: ${cleanPhone}`);
        
        // Proxy via Web App Proxy (HTTPS) instead of direct VM API (HTTP)
        const response = await fetch(`https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net/api/woocommerce?action=getOrderItems&phone=${encodeURIComponent(cleanPhone)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StaticWebApp-Proxy/1.0'
            },
            timeout: 10000
        });

        const data = await response.json();
        
        if (response.ok) {
            context.log(`✅ Static Web App API: Found order items for phone: ${cleanPhone}`);
            
            context.res = {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    success: true,
                    data: data.data,
                    proxy: 'static-web-app-api',
                    timestamp: new Date().toISOString()
                }
            };
        } else {
            context.log(`❌ Static Web App API: Order items not found for phone: ${cleanPhone}`);
            
            context.res = {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    success: false,
                    error: 'Order items not found',
                    proxy: 'static-web-app-api',
                    timestamp: new Date().toISOString()
                }
            };
        }

    } catch (error) {
        context.log.error(`❌ Static Web App API: Order items lookup failed for ${phone}:`, error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: error.message,
                proxy: 'static-web-app-api',
                timestamp: new Date().toISOString()
            }
        };
    }
}; 
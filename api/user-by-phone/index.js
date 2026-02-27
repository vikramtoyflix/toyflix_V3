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
        context.log(`🔍 Static Web App API: Looking up user by phone: ${phone}`);
        
        // Clean and decode phone number
        const cleanPhone = decodeURIComponent(phone);
        context.log(`🧹 Static Web App API: Cleaned phone: ${cleanPhone}`);
        
        // Try different VM API approaches
        const vmApiUrl = `https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net/api/woocommerce?action=getUserByPhone&phone=${encodeURIComponent(cleanPhone)}`;
        context.log(`🌐 Static Web App API: Attempting VM API call to: ${vmApiUrl}`);
        
        const response = await fetch(vmApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StaticWebApp-Proxy/1.0'
            }
        });

        context.log(`📡 Static Web App API: VM API response status: ${response.status}`);
        
        const data = await response.json();
        context.log(`📦 Static Web App API: VM API response data: ${JSON.stringify(data).substring(0, 200)}...`);
        
        if (response.ok && data.success) {
            context.log(`✅ Static Web App API: Found user for phone: ${cleanPhone}`);
            
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
            context.log(`❌ Static Web App API: User not found for phone: ${cleanPhone}, response: ${JSON.stringify(data)}`);
            
            context.res = {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    success: false,
                    error: 'User not found',
                    proxy: 'static-web-app-api',
                    vmResponse: data,
                    timestamp: new Date().toISOString()
                }
            };
        }

    } catch (error) {
        context.log.error(`❌ Static Web App API: User lookup failed for ${phone}:`, error.message);
        context.log.error(`❌ Static Web App API: Full error:`, error);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                error: `Network Error: ${error.message}`,
                errorType: error.name,
                proxy: 'static-web-app-api',
                timestamp: new Date().toISOString()
            }
        };
    }
}; 
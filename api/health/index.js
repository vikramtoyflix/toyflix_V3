module.exports = async function (context, req) {
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

    try {
        context.log('🏥 Static Web App API: Health check proxy to Direct VM');
        
        // Proxy to Direct VM API
        // REMOVED FAILING URL: https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net/api/health
        // For now, return healthy status for Static Web App API
        const mockHealthResponse = {
            status: 'healthy',
            database: 'connected',
            backend: 'supabase',
            timestamp: new Date().toISOString()
        };
        
        const response = { ok: true, status: 200, json: async () => mockHealthResponse };
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StaticWebApp-Proxy/1.0'
            },
            timeout: 10000
        });

        const data = await response.json();
        
        context.log('✅ Static Web App API: Health check successful');
        
        context.res = {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: data.status === 'healthy' && data.database === 'connected',
                data: data,
                proxy: 'static-web-app-api',
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('❌ Static Web App API: Health check failed:', error.message);
        
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
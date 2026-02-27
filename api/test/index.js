module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    context.log('📱 Mobile API: Test endpoint called successfully');
    
    context.res = {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: {
            success: true,
            message: "Mobile API routes are working!",
            timestamp: new Date().toISOString(),
            backend: "Azure Static Web App API",
            environment: "Production"
        }
    };
};
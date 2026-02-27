const mysql = require('mysql2/promise');

module.exports = async function (context, req) {
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

    try {
        context.log('🏥 Health check started');

        // Test database connection
        const connection = await mysql.createConnection({
            host: process.env.WC_DB_HOST || '4.213.183.90',
            port: process.env.WC_DB_PORT || 3306,
            user: process.env.WC_DB_USER || 'toyflix_user',
            password: process.env.WC_DB_PASSWORD || 'toyflixX1@@',
            database: process.env.WC_DB_NAME || 'toyflix'
        });

        // Simple query to test connection
        await connection.execute('SELECT 1');
        await connection.end();

        context.log('✅ Health check passed');

        // Return consistent structure (already working correctly)
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: true,
                data: {
                    status: 'healthy',
                    database: 'connected'
                },
                proxy: 'azure-function-fixed',
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('❌ Health check failed:', error.message);
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: false,
                data: {
                    status: 'unhealthy',
                    database: 'disconnected'
                },
                error: error.message,
                proxy: 'azure-function-fixed',
                timestamp: new Date().toISOString()
            }
        };
    }
}; 
const http = require('http');

module.exports = async function (context, req) {
    const VM_IP = '4.213.183.90';
    const VM_PORT = '3001';
    
    // CORS headers for all responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    };

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        context.res = { 
            status: 200, 
            headers: corsHeaders,
            body: ''
        };
        return;
    }
    
    // Get the original path from the request
    const originalUrl = req.headers['x-ms-original-url'] || req.url;
    let targetPath = originalUrl;
    
    // Map WordPress endpoints to your VM endpoints
    if (originalUrl.includes('/wp-json/api/v1/')) {
        // Keep WordPress API structure for compatibility
        targetPath = originalUrl;
    } else if (originalUrl.includes('/wp-json/custom-api/v1/')) {
        targetPath = originalUrl;
    } else if (originalUrl.includes('/wp-json/custom/v1/')) {
        targetPath = originalUrl;
    } else if (originalUrl.includes('/api/sendOtp.php')) {
        targetPath = '/api/sendOtp.php';
    } else if (originalUrl.includes('/api/verifyOtp.php')) {
        targetPath = '/api/verifyOtp.php';
    }
    
    context.log(`🔄 Mobile API Proxy: ${req.method} ${originalUrl} → http://${VM_IP}:${VM_PORT}${targetPath}`);
    
    const options = {
        hostname: VM_IP,
        port: VM_PORT,
        path: targetPath,
        method: req.method,
        headers: {
            ...req.headers,
            'host': `${VM_IP}:${VM_PORT}`,
            'x-forwarded-for': req.headers['x-forwarded-for'] || '127.0.0.1',
            'x-forwarded-proto': 'https',
            'user-agent': 'ToyFlix-Mobile-Proxy/1.0'
        }
    };
    
    // Remove Azure-specific headers that might cause issues
    delete options.headers['x-ms-original-url'];
    delete options.headers['x-ms-client-principal'];
    delete options.headers['x-ms-client-principal-id'];
    delete options.headers['x-ms-client-principal-name'];
    delete options.headers['x-ms-client-principal-idp'];
    delete options.headers['x-ms-request-id'];
    
    return new Promise((resolve) => {
        const proxyReq = http.request(options, (proxyRes) => {
            let body = '';
            
            proxyRes.on('data', (chunk) => {
                body += chunk;
            });
            
            proxyRes.on('end', () => {
                let responseBody = body;
                let contentType = proxyRes.headers['content-type'] || 'application/json';
                
                // Try to parse and format JSON responses
                try {
                    if (contentType.includes('application/json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
                        const jsonData = JSON.parse(body);
                        responseBody = JSON.stringify(jsonData);
                        contentType = 'application/json';
                    }
                } catch (e) {
                    // Keep original body if not JSON
                    context.log(`⚠️ Response not JSON, keeping as-is: ${e.message}`);
                }
                
                context.log(`✅ Proxy response: ${proxyRes.statusCode} (${body.length} bytes)`);
                
                context.res = {
                    status: proxyRes.statusCode,
                    headers: {
                        'Content-Type': contentType,
                        ...corsHeaders
                    },
                    body: responseBody
                };
                resolve();
            });
        });
        
        proxyReq.on('error', (error) => {
            context.log.error(`❌ Proxy error: ${error.message}`);
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({ 
                    success: false,
                    error: 'Proxy connection failed: ' + error.message,
                    target: `http://${VM_IP}:${VM_PORT}${targetPath}`,
                    timestamp: new Date().toISOString()
                })
            };
            resolve();
        });
        
        // Handle request timeout
        proxyReq.setTimeout(15000, () => {
            context.log.error(`⏰ Proxy timeout for ${targetPath}`);
            proxyReq.destroy();
            context.res = {
                status: 504,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({ 
                    success: false,
                    error: 'Gateway timeout - VM took too long to respond',
                    target: `http://${VM_IP}:${VM_PORT}${targetPath}`,
                    timestamp: new Date().toISOString()
                })
            };
            resolve();
        });
        
        // Forward the request body if it exists
        if (req.body) {
            const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            context.log(`📤 Forwarding body: ${bodyData.substring(0, 200)}${bodyData.length > 200 ? '...' : ''}`);
            proxyReq.write(bodyData);
        }
        
        proxyReq.end();
    });
};

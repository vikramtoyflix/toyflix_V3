const { app } = require('@azure/functions');

// VM API configuration
const VM_API_URL = 'http://4.213.183.90:3001';
const TIMEOUT = 15000; // 15 seconds

/**
 * Azure Function to proxy requests to WooCommerce VM
 * This solves the networking issue between Static Web App and VM
 */

// Health check endpoint
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check request received');

        try {
            const response = await fetchWithTimeout(`${VM_API_URL}/api/health`);
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
                    'Access-Control-Max-Age': '86400'
                },
                body: JSON.stringify({
                    success: true,
                    data: response,
                    proxy: 'azure-function',
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Health check failed:', error.message);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    proxy: 'azure-function'
                })
            };
        }
    }
});

// User lookup by phone
app.http('user-by-phone', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user-by-phone/{phone}',
    handler: async (request, context) => {
        const phone = request.params.phone;
        context.log(`User lookup request for phone: ${phone}`);

        if (!phone) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'Phone parameter required' })
            };
        }

        try {
            const response = await fetchWithTimeout(`${VM_API_URL}/api/user-by-phone/${encodeURIComponent(phone)}`);
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
                    'Access-Control-Max-Age': '86400'
                },
                body: JSON.stringify({
                    success: true,
                    data: response,
                    proxy: 'azure-function'
                })
            };
        } catch (error) {
            context.log.error(`User lookup failed for ${phone}:`, error.message);
            return {
                status: error.message.includes('404') ? 404 : 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    proxy: 'azure-function'
                })
            };
        }
    }
});

// Subscription cycle lookup
app.http('subscription-cycle', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'subscription-cycle/{userId}',
    handler: async (request, context) => {
        const userId = request.params.userId;
        context.log(`Subscription cycle request for user: ${userId}`);

        if (!userId) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'UserId parameter required' })
            };
        }

        try {
            const response = await fetchWithTimeout(`${VM_API_URL}/api/subscription-cycle/${encodeURIComponent(userId)}`);
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
                    'Access-Control-Max-Age': '86400'
                },
                body: JSON.stringify({
                    success: true,
                    data: response,
                    proxy: 'azure-function'
                })
            };
        } catch (error) {
            context.log.error(`Subscription cycle failed for ${userId}:`, error.message);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    proxy: 'azure-function'
                })
            };
        }
    }
});

// Order items lookup
app.http('order-items', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'order-items/{orderId}',
    handler: async (request, context) => {
        const orderId = request.params.orderId;
        context.log(`Order items request for order: ${orderId}`);

        if (!orderId) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: 'OrderId parameter required' })
            };
        }

        try {
            const response = await fetchWithTimeout(`${VM_API_URL}/api/order-items/${encodeURIComponent(orderId)}`);
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
                    'Access-Control-Max-Age': '86400'
                },
                body: JSON.stringify({
                    success: true,
                    data: response,
                    proxy: 'azure-function'
                })
            };
        } catch (error) {
            context.log.error(`Order items failed for ${orderId}:`, error.message);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    proxy: 'azure-function'
                })
            };
        }
    }
});

// OPTIONS handler for CORS preflight
app.http('options', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: '{*path}',
    handler: async (request, context) => {
        return {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }
});

// Helper function to fetch with timeout
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Azure-Function-Proxy/1.0',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${TIMEOUT}ms`);
        }
        throw error;
    }
} 
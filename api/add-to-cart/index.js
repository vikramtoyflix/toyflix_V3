// Simplified add-to-cart endpoint matching WordPress behavior
// Does NOT create orders or check subscriptions - just validates and returns success
// Real order creation happens in create-order endpoint

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
        context.log('📱 Mobile API: Add to cart (SIMPLIFIED - matching WordPress)');
        
        // Extract token and products from request
        const token = req.body?.token || req.query?.token;
        const products = req.body?.products || req.body?.items;
        
        context.log('📱 Request params:', {
            has_token: !!token,
            products_count: products?.length || 0,
            products_sample: products?.[0]
        });
        
        // Validate token
        if (!token) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 403,
                    message: 'Please first sign up.',
                    cart_status: false
                })
            };
        }
        
        // Validate products array
        if (!products || !Array.isArray(products) || products.length === 0) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: '404',  // Match WordPress format
                    message: 'No Products provided',
                    cart_status: false
                })
            };
        }
        
        // Normalize products (handle both 'id' and 'product_id' fields for mobile compatibility)
        const normalizedProducts = products.map(product => {
            const productId = product.id || product.product_id;
            const quantity = product.quantity || 1;
            
            context.log('📱 Normalizing product:', {
                original_id_field: product.id,
                original_product_id_field: product.product_id,
                normalized_id: productId,
                quantity: quantity
            });
            
            return {
                product_id: productId,
                id: productId,
                quantity: quantity,
                product_name: product.name || product.product_name || null
            };
        });
        
        context.log('✅ Products normalized:', {
            count: normalizedProducts.length,
            sample: normalizedProducts[0]
        });
        
        // Return success response (matching WordPress format exactly)
        // WordPress returns: { status: "success", added_products: [...], cart_status: false }
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: "success",  // String "success" (mobile app checks this!)
                message: "Products processed",  // WordPress message
                added_products: normalizedProducts,
                errors: [],  // WordPress includes this
                cart_status: false,  // Cart locked for 2 minutes (WordPress behavior)
                backend: "azure-simplified-wordpress-compatible",
                timestamp: new Date().toISOString()
            })
        };
        
        context.log('✅ Cart operation successful - returning WordPress-compatible response');
        
    } catch (error) {
        context.log.error('❌ Error in add-to-cart:', error);
        context.log.error('Error stack:', error.stack);
        
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: "error",
                message: error.message || 'Internal server error',
                cart_status: false,
                backend: "azure-simplified-wordpress-compatible",
                timestamp: new Date().toISOString()
            })
        };
    }
};

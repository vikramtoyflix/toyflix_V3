const { createClient } = require('@supabase/supabase-js');

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
        context.log('📱 Mobile API: Save reserved product request');
        
        // Get token and product IDs from request
        const token = req.body?.token;
        const product_ids = req.body?.product_ids;
        
        context.log(`📱 Reserve product - Token: ${token ? 'present' : 'missing'}, Product IDs: ${product_ids}`);
        
        if (!token) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'Please first sign up.',
                    cart_status: false
                }
            };
        }
        
        if (!product_ids) {
            return context.res = {
                status: 400,
                headers: corsHeaders,
                body: {
                    status: 400,
                    message: 'Product IDs are invalid'
                }
            };
        }
        
        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Validate token and get user
        const { data: user, error: userError } = await supabase
            .from('custom_users')
            .select('id')
            .eq('signup_token', token)
            .single();
            
        if (userError || !user) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'Invalid token. Please sign up again.',
                    cart_status: false
                }
            };
        }
        
        context.log(`✅ User validated: ${user.id}`);
        
        // Convert product_ids to array if it's a string
        let productIdsArray = [];
        if (typeof product_ids === 'string') {
            productIdsArray = product_ids.split(',').map(id => id.trim());
        } else if (Array.isArray(product_ids)) {
            productIdsArray = product_ids;
        } else {
            productIdsArray = [product_ids.toString()];
        }
        
        // Get existing reserved products for this user
        const { data: existingWishlist, error: wishlistError } = await supabase
            .from('wishlist')
            .select('toy_id')
            .eq('user_id', user.id);
        
        const existingProductIds = existingWishlist ? existingWishlist.map(item => item.toy_id) : [];
        
        // Filter out products that are already reserved
        const newProductIds = productIdsArray.filter(id => !existingProductIds.includes(id));
        
        if (newProductIds.length === 0) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 200,
                    message: 'Products are already reserved.'
                }
            };
        }
        
        // Validate that all products exist
        const { data: validProducts, error: productsError } = await supabase
            .from('toys')
            .select('id, name')
            .in('id', newProductIds);
        
        if (productsError || !validProducts || validProducts.length === 0) {
            return context.res = {
                status: 400,
                headers: corsHeaders,
                body: {
                    status: 400,
                    message: 'Invalid product IDs provided'
                }
            };
        }
        
        // Add products to wishlist (reserved products)
        const wishlistInserts = validProducts.map(product => ({
            user_id: user.id,
            toy_id: product.id
        }));
        
        const { error: insertError } = await supabase
            .from('wishlist')
            .insert(wishlistInserts);
        
        if (insertError) {
            context.log.error('Error saving reserved products:', insertError);
            return context.res = {
                status: 500,
                headers: corsHeaders,
                body: {
                    status: 500,
                    message: 'Failed to save reserved products'
                }
            };
        }
        
        context.log(`✅ Reserved ${validProducts.length} products for user: ${user.id}`);
        
        // Return success response (matching WordPress format)
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: {
                status: 200,
                message: 'Product IDs successfully saved for the user.'
            }
        };
        
    } catch (error) {
        context.log.error('❌ Error in save-reserved-product:', error);
        
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: {
                status: 500,
                message: 'Internal server error'
            }
        };
    }
};

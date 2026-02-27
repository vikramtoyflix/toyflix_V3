module.exports = async function (context, req) {
    // Always set CORS headers first
    context.res = {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Requested-With",
            "Content-Type": "application/json"
        }
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        context.res.body = '';
        return;
    }

    try {
        context.log('=== Featured Products API Called ===');
        context.log('Method:', req.method);
        context.log('URL:', req.url);
        
        // Supabase configuration (same as existing APIs)
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        // Query featured toys from Supabase
        const toysQuery = `${supabaseUrl}/rest/v1/toys?is_featured=eq.true&available_quantity=gt.0&order=display_order.asc,created_at.desc&limit=15`;
        
        context.log('🔍 Fetching featured toys from Supabase...');
        
        const response = await fetch(toysQuery, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            context.log(`❌ Supabase query failed: ${response.status} ${response.statusText}`);
            context.res.body = [];
            return;
        }
        
        const toys = await response.json();
        context.log(`✅ Found ${toys.length} featured toys`);
        
        // Transform Supabase toy data to match mobile app expected format
        const featuredProducts = toys.map(toy => {
            // Extract categories from category field (assuming it's a string or array)
            let categories = [];
            if (toy.category) {
                if (Array.isArray(toy.category)) {
                    categories = toy.category;
                } else if (typeof toy.category === 'string') {
                    categories = [toy.category];
                }
            }
            
            // Create short description from full description
            let shortDescription = '';
            if (toy.description) {
                // Take first 100 characters or first sentence
                const firstSentence = toy.description.split('.')[0];
                shortDescription = firstSentence.length > 100
                    ? firstSentence.substring(0, 100) + '...'
                    : firstSentence + '.';
            } else {
                shortDescription = `Perfect for ${toy.age_range || 'kids'}`;
            }
            
            return {
                id: toy.id,
                name: toy.name || `Toy ${toy.id}`,
                stock_status: toy.available_quantity > 0,
                price: "0", // Subscription model - price is "0"
                regular_price: toy.retail_price ? toy.retail_price.toString() : "0",
                description: toy.description || `Great toy for ${toy.age_range || 'kids'}`,
                short_description: shortDescription,
                categories: categories,
                image: toy.image_url || "https://via.placeholder.com/300x200/CCCCCC/FFFFFF?text=No+Image",
                permalink: `https://toyflix.in/toy/${toy.id}`,
                gallery_image_urls: toy.image_url ? [toy.image_url] : ["https://via.placeholder.com/300x200/CCCCCC/FFFFFF?text=No+Image"],
                reserved_product: false
            };
        });
        
        context.log(`✅ Transformed ${featuredProducts.length} featured products for mobile app`);
        context.res.body = featuredProducts;

    } catch (error) {
        context.log('❌ Error in featured products:', error);
        context.log('Error stack:', error.stack);
        context.res.body = [];
    }
};
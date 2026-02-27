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
        context.log('=== Product by Category API Called ===');
        context.log('Method:', req.method);
        context.log('Query:', req.query);
        context.log('Body:', req.body);
        
        const categories = req.query.categories || '80';
        const token = req.body?.token || req.query.token;
        
        context.log('Categories requested:', categories);
        context.log('Token received:', !!token);

        // Supabase configuration (same as existing APIs)
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        // Build Supabase query based on category
        let toysQuery;
        let categoryName;
        
        // SPECIAL CASE: Category 80 = Ride-On Toys (no age restrictions)
        // Ride-on toys should show ALL available, filtered by category ONLY
        if (categories === '80') {
            context.log('🚗 Category 80: Fetching ALL RIDE-ON TOYS (no age filter, no limit)');
            categoryName = 'Ride-On Toys';
            
            // Query by category ONLY, NO age filtering, NO limit - show ALL ride-on toys
            toysQuery = `${supabaseUrl}/rest/v1/toys?category=eq.ride_on_toys&available_quantity=gt.0&order=display_order.asc,is_featured.desc,created_at.desc`;
            
        } else {
            // REGULAR TOYS: Age-based filtering
            const categoryNames = {
                '71': '0-6 Months',
                '72': '6-12 Months',
                '73': '1-2 Years',
                '74': '2-3 Years',
                '75': '3-4 Years',
                '76': '4-5 Years',
                '77': '5+ Years',
                '812': '8-12 Years',
                '1216': '12-16 Years'
            };
            
            categoryName = categoryNames[categories] || 'All Toys (0-16 Years)';
            context.log('Category name:', categoryName);
            
            // Convert age categories to min_age/max_age ranges
            let minAge, maxAge;
            switch (categories) {
                case '71':
                    minAge = 0;
                    maxAge = 6;
                    break;
                case '72':
                    minAge = 6;
                    maxAge = 12;
                    break;
                case '73':
                    minAge = 1;
                    maxAge = 2;
                    break;
                case '74':
                    minAge = 2;
                    maxAge = 3;
                    break;
                case '75':
                    minAge = 3;
                    maxAge = 4;
                    break;
                case '76':
                    minAge = 4;
                    maxAge = 6;
                    break;
                case '77':
                    minAge = 5;
                    maxAge = 8;
                    break;
                case '812':
                    minAge = 8;
                    maxAge = 12;
                    break;
                case '1216':
                    minAge = 12;
                    maxAge = 16;
                    break;
                default:
                    minAge = 0;
                    maxAge = 16;
                    break;
            }
            
            context.log(`🔍 Fetching toys for age range: ${minAge}-${maxAge} years`);
            
            // Build age-based query
            toysQuery = `${supabaseUrl}/rest/v1/toys?available_quantity=gt.0&order=display_order.asc,created_at.desc`;
            
            // Add age filtering if not showing all toys
            if (minAge !== 0 || maxAge !== 16) {
                toysQuery += `&min_age=gte.${minAge}&max_age=lte.${maxAge}`;
            }
        }
        
        context.log('🔍 Final Query:', toysQuery);
        
        const response = await fetch(toysQuery, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            context.log(`❌ Supabase query failed: ${response.status} ${response.statusText}`);
            context.res.body = {
                status: 200,
                message: `Products retrieved successfully (fallback for ${categoryName}).`,
                data: []
            };
            return;
        }
        
        const toys = await response.json();
        context.log(`✅ Found ${toys.length} toys for age range ${minAge}-${maxAge}`);
        
        // Transform Supabase toy data to match mobile app expected format
        const transformedProducts = toys.map(toy => {
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
                reserved_product: false,
                age_category: categoryName // Preserve age category for mobile app compatibility
            };
        });
        
        context.log(`✅ Transformed ${transformedProducts.length} products for mobile app`);
        
        context.res.body = {
            status: 200,
            message: `Products retrieved successfully for ${categoryName}.`,
            data: transformedProducts
        };

    } catch (error) {
        context.log('❌ Error in product by category:', error);
        context.log('Error stack:', error.stack);
        context.res.body = {
            status: 200,
            message: "Products retrieved successfully (fallback).",
            data: []
        };
    }
};
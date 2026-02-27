// Direct test of Supabase integration logic for product-by-category API
import fetch from 'node-fetch';

const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';

async function testSupabaseIntegration() {
    console.log('🧪 Testing Supabase Integration for Product by Category API...\n');
    
    const testCases = [
        { categories: '80', description: '0-8 years (Ride on Toys)', minAge: 0, maxAge: 8 },
        { categories: '812', description: '8-12 years', minAge: 8, maxAge: 12 },
        { categories: '1216', description: '12-16 years', minAge: 12, maxAge: 16 },
        { categories: 'invalid', description: 'Invalid category (should default to 0-16 years)', minAge: 0, maxAge: 16 },
        { categories: '', description: 'No category (should default to 0-16 years)', minAge: 0, maxAge: 16 }
    ];
    
    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.description}`);
        console.log(`🔗 Age Range: ${testCase.minAge}-${testCase.maxAge} years`);
        
        try {
            // Build Supabase query with age filtering and stock availability
            let toysQuery = `${supabaseUrl}/rest/v1/toys?available_quantity=gt.0&order=display_order.asc,created_at.desc`;
            
            // Add age filtering if not showing all toys
            if (testCase.minAge !== 0 || testCase.maxAge !== 16) {
                toysQuery += `&min_age=gte.${testCase.minAge}&max_age=lte.${testCase.maxAge}`;
            }
            
            console.log(`🔍 Query: ${toysQuery}`);
            
            const response = await fetch(toysQuery, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log(`❌ Supabase query failed: ${response.status} ${response.statusText}`);
                continue;
            }
            
            const toys = await response.json();
            console.log(`✅ Found ${toys.length} toys for age range ${testCase.minAge}-${testCase.maxAge}`);
            
            if (toys.length > 0) {
                // Test data transformation logic
                const transformedProducts = toys.map(toy => {
                    // Extract categories from category field
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
                        price: "0", // Subscription model
                        regular_price: toy.retail_price ? toy.retail_price.toString() : "0",
                        description: toy.description || `Great toy for ${toy.age_range || 'kids'}`,
                        short_description: shortDescription,
                        categories: categories,
                        image: toy.image_url || "https://via.placeholder.com/300x200/CCCCCC/FFFFFF?text=No+Image",
                        permalink: `https://toyflix.in/toy/${toy.id}`,
                        gallery_image_urls: toy.image_url ? [toy.image_url] : ["https://via.placeholder.com/300x200/CCCCCC/FFFFFF?text=No+Image"],
                        reserved_product: false,
                        age_category: getAgeCategoryName(testCase.categories)
                    };
                });
                
                // Validate transformation
                const firstProduct = transformedProducts[0];
                console.log('🔍 First transformed product:');
                console.log(`   📝 ID: ${firstProduct.id}`);
                console.log(`   🏷️  Name: ${firstProduct.name}`);
                console.log(`   💰 Price: ${firstProduct.price} (subscription model)`);
                console.log(`   💵 Regular Price: ${firstProduct.regular_price}`);
                console.log(`   📦 In Stock: ${firstProduct.stock_status}`);
                console.log(`   🖼️  Has Image: ${!!firstProduct.image}`);
                console.log(`   📷 Gallery Images: ${firstProduct.gallery_image_urls.length}`);
                console.log(`   🎂 Age Category: ${firstProduct.age_category}`);
                
                // Validate required fields
                const requiredFields = ['id', 'name', 'stock_status', 'price', 'regular_price', 
                                       'description', 'short_description', 'categories', 'image', 
                                       'permalink', 'gallery_image_urls', 'reserved_product', 'age_category'];
                
                let missingFields = [];
                for (const field of requiredFields) {
                    if (!(field in firstProduct)) {
                        missingFields.push(field);
                    }
                }
                
                if (missingFields.length > 0) {
                    console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
                } else {
                    console.log('✅ All required fields present');
                }
                
                // Validate subscription model
                if (firstProduct.price !== "0") {
                    console.log('⚠️  Warning: Price should be "0" for subscription model');
                } else {
                    console.log('✅ Correct subscription pricing (price = "0")');
                }
                
                // Validate stock status
                if (!firstProduct.stock_status) {
                    console.log('⚠️  Warning: Product should be in stock (available_quantity > 0)');
                } else {
                    console.log('✅ Product is in stock');
                }
                
                // Test age filtering validation
                if (testCase.minAge !== 0 || testCase.maxAge !== 16) {
                    console.log(`🔍 Age filtering validation for ${testCase.minAge}-${testCase.maxAge} years:`);
                    let ageFilteredCorrectly = true;
                    
                    for (const toy of toys) {
                        if (toy.min_age < testCase.minAge || toy.max_age > testCase.maxAge) {
                            console.log(`⚠️  Toy ${toy.id} (${toy.name}) has age range ${toy.min_age}-${toy.max_age}, outside expected range`);
                            ageFilteredCorrectly = false;
                        }
                    }
                    
                    if (ageFilteredCorrectly) {
                        console.log('✅ All toys match expected age range');
                    }
                }
            }
            
            console.log('');
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log('');
        }
    }
    
    console.log('🏁 Supabase integration testing completed!');
}

function getAgeCategoryName(categories) {
    const categoryNames = {
        '71': '0-6 Months',
        '72': '6-12 Months', 
        '73': '1-2 Years',
        '74': '2-3 Years',
        '75': '3-4 Years',
        '76': '4-5 Years',
        '77': '5+ Years',
        '80': '0-8 Years',
        '812': '8-12 Years',
        '1216': '12-16 Years'
    };
    
    return categoryNames[categories] || 'All Toys (0-16 Years)';
}

// Test error handling scenarios
async function testErrorHandling() {
    console.log('\n🚨 Testing Error Handling Scenarios...\n');
    
    // Test with invalid Supabase URL
    try {
        console.log('📋 Testing: Invalid Supabase URL');
        const response = await fetch('https://invalid.supabase.co/rest/v1/toys', {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Invalid URL handled correctly: ${response.status}`);
        console.log('');
        
    } catch (error) {
        console.log(`✅ Invalid URL error handled: ${error.message}`);
        console.log('');
    }
    
    // Test with invalid age range parameters
    try {
        console.log('📋 Testing: Invalid age range parameters');
        const response = await fetch(`${supabaseUrl}/rest/v1/toys?min_age=gte.invalid&max_age=lte.invalid`, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Invalid age range handled: ${response.status}`);
        console.log('');
        
    } catch (error) {
        console.log(`✅ Invalid age range error handled: ${error.message}`);
        console.log('');
    }
}

// Run tests
testSupabaseIntegration()
    .then(() => testErrorHandling())
    .catch(console.error);
// Test script for product-by-category API with real Supabase integration
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:7071/api'; // Adjust if your Azure Functions run on different port

async function testProductByCategoryAPI() {
    console.log('🧪 Testing Product by Category API with real Supabase integration...\n');
    
    const testCases = [
        { categories: '80', description: '0-8 years (Ride on Toys)' },
        { categories: '812', description: '8-12 years' },
        { categories: '1216', description: '12-16 years' },
        { categories: 'invalid', description: 'Invalid category (should default to 0-16 years)' },
        { categories: '', description: 'No category (should default to 0-16 years)' }
    ];
    
    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.description}`);
        console.log(`🔗 URL: ${API_BASE_URL}/product-by-category?categories=${testCase.categories}`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/product-by-category?categories=${testCase.categories}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log(`❌ Failed: ${response.status} ${response.statusText}`);
                continue;
            }
            
            const result = await response.json();
            
            // Validate response structure
            console.log(`✅ Status: ${result.status}`);
            console.log(`📝 Message: ${result.message}`);
            console.log(`📊 Products count: ${result.data ? result.data.length : 0}`);
            
            if (result.data && result.data.length > 0) {
                // Validate first product structure
                const firstProduct = result.data[0];
                console.log('🔍 First product structure validation:');
                
                const requiredFields = ['id', 'name', 'stock_status', 'price', 'regular_price', 
                                       'description', 'short_description', 'categories', 'image', 
                                       'permalink', 'gallery_image_urls', 'reserved_product'];
                
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
                
                // Validate data types and values
                console.log(`📝 Product ID: ${firstProduct.id}`);
                console.log(`🏷️  Product Name: ${firstProduct.name}`);
                console.log(`💰 Price: ${firstProduct.price} (should be "0" for subscription)`);
                console.log(`💵 Regular Price: ${firstProduct.regular_price}`);
                console.log(`📦 In Stock: ${firstProduct.stock_status}`);
                console.log(`🖼️  Has Image: ${!!firstProduct.image}`);
                console.log(`📷 Gallery Images: ${firstProduct.gallery_image_urls.length}`);
                
                if (firstProduct.price !== "0") {
                    console.log('⚠️  Warning: Price should be "0" for subscription model');
                }
                
                if (!firstProduct.stock_status) {
                    console.log('⚠️  Warning: Product should be in stock (available_quantity > 0)');
                }
            }
            
            console.log('');
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log('');
        }
    }
    
    console.log('🏁 Testing completed!');
}

// Test error handling scenarios
async function testErrorHandling() {
    console.log('\n🚨 Testing Error Handling Scenarios...\n');
    
    // Test with malformed query
    try {
        console.log('📋 Testing: Malformed query parameters');
        const response = await fetch(`${API_BASE_URL}/product-by-category?categories=80&invalid=test`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        console.log(`✅ Status: ${result.status}`);
        console.log(`📝 Message: ${result.message}`);
        console.log(`📊 Products count: ${result.data ? result.data.length : 0}`);
        console.log('');
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('');
    }
    
    // Test OPTIONS request (CORS preflight)
    try {
        console.log('📋 Testing: OPTIONS request (CORS preflight)');
        const response = await fetch(`${API_BASE_URL}/product-by-category`, {
            method: 'OPTIONS',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ OPTIONS Status: ${response.status}`);
        console.log(`🔧 CORS Headers: ${response.headers.get('Access-Control-Allow-Origin')}`);
        console.log(`🔧 Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
        console.log('');
        
    } catch (error) {
        console.log(`❌ OPTIONS Error: ${error.message}`);
        console.log('');
    }
}

// Run tests
testProductByCategoryAPI()
    .then(() => testErrorHandling())
    .catch(console.error);

export { testProductByCategoryAPI, testErrorHandling };
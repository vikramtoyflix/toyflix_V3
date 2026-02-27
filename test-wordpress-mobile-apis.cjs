#!/usr/bin/env node

/**
 * Test Script for Migrated WordPress Mobile APIs
 * Tests all the key endpoints that the mobile app uses
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://toyflix.in';
const TEST_PHONE = '9999999999';

// Test endpoints that mobile app uses (now migrated to Azure Functions)
const TEST_ENDPOINTS = [
    {
        name: 'Check Phone Exists',
        method: 'POST',
        path: '/wp-json/api/v1/check-phone-exists',
        body: { phone: TEST_PHONE }
    },
    {
        name: 'Generate Token (Authentication)',
        method: 'POST',
        path: '/wp-json/api/v1/generate-token',
        body: { phone_number: TEST_PHONE, fcm_token: 'test-fcm-token' }
    },
    {
        name: 'User Profile',
        method: 'GET',
        path: '/wp-json/api/v1/user-profile?token=test-token'
    },
    {
        name: 'Featured Products',
        method: 'GET',
        path: '/wp-json/api/v1/featured-products'
    },
    {
        name: 'Product by Category (Ride-on Toys)',
        method: 'POST',
        path: '/wp-json/api/v1/product-by-category?categories=80'
    },
    {
        name: 'Product by Category (Age-based)',
        method: 'POST', 
        path: '/wp-json/api/v1/product-by-category?categories=71&parent_id=72&plan_id=123'
    },
    {
        name: 'Get Mapped Category Data',
        method: 'GET',
        path: '/wp-json/custom-api/v1/get-mapped-category-data?term_id=71&token=test-token'
    },
    {
        name: 'Send OTP',
        method: 'POST',
        path: '/api/sendOtp.php',
        body: { phoneNumber: TEST_PHONE }
    },
    {
        name: 'Verify OTP',
        method: 'POST',
        path: '/api/verifyOtp.php',
        body: { phoneNumber: TEST_PHONE, otp: '123456' }
    },
    {
        name: 'Add to Cart',
        method: 'POST',
        path: '/wp-json/api/v1/add-to-cart',
        body: { 
            token: 'test-token', 
            products: [
                { product_id: 'test-product-id', quantity: 1 }
            ]
        }
    },
    {
        name: 'Get Orders',
        method: 'GET',
        path: '/wp-json/api/v1/get-order?token=test-token'
    },
    {
        name: 'Save Reserved Product',
        method: 'POST',
        path: '/wp-json/api/v1/save-reserved-product',
        body: { 
            token: 'test-token', 
            product_ids: 'test-product-id' 
        }
    }
];

async function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(BASE_URL + endpoint.path);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ToyFlix-Mobile-Test/1.0'
            }
        };

        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({
                        success: true,
                        status: res.statusCode,
                        headers: res.headers,
                        body: jsonBody
                    });
                } catch (e) {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        headers: res.headers,
                        body: body,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        if (endpoint.body) {
            req.write(JSON.stringify(endpoint.body));
        }
        
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Migrated WordPress Mobile APIs');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Phone: ${TEST_PHONE}`);
    console.log('');

    let passedTests = 0;
    let totalTests = TEST_ENDPOINTS.length;
    let detailedResults = [];

    for (const endpoint of TEST_ENDPOINTS) {
        process.stdout.write(`Testing ${endpoint.name}... `);
        
        const result = await makeRequest(endpoint);
        
        let status = '❌ FAIL';
        let details = '';
        
        if (result.success) {
            if (result.status >= 200 && result.status < 400) {
                status = `✅ PASS (${result.status})`;
                passedTests++;
                
                // Log interesting response data
                if (result.body && typeof result.body === 'object') {
                    if (result.body.status !== undefined) {
                        details = `Status: ${result.body.status}`;
                        if (result.body.message) {
                            details += `, Message: ${result.body.message.substring(0, 50)}...`;
                        }
                    }
                }
            } else if (result.status === 404) {
                status = `⚠️  WARN (${result.status}) - Endpoint might not be deployed yet`;
                details = result.body?.message || 'Not Found';
            } else {
                status = `⚠️  WARN (${result.status})`;
                details = result.body?.message || JSON.stringify(result.body).substring(0, 100);
            }
        } else {
            status = '❌ FAIL';
            details = result.error;
        }
        
        console.log(status);
        if (details) {
            console.log(`   ${details}`);
        }
        
        detailedResults.push({
            name: endpoint.name,
            status: status,
            details: details,
            passed: result.success && result.status >= 200 && result.status < 400
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('=' .repeat(60));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! WordPress mobile API migration is working correctly.');
    } else if (passedTests > totalTests / 2) {
        console.log('⚠️  Most tests passed. Some endpoints may need additional setup.');
        console.log('');
        console.log('Failed tests:');
        detailedResults.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.details}`);
        });
    } else {
        console.log('❌ Many tests failed. Check your Azure Function deployment and configuration.');
        console.log('');
        console.log('Failed tests:');
        detailedResults.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.details}`);
        });
    }
    
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Deploy these Azure Functions to your Static Web App');
    console.log('2. Configure your Supabase database with proper data');
    console.log('3. Test with your actual mobile app');
    console.log('4. Monitor Azure Function logs for any issues');
    console.log('');
    console.log('🔗 Deployment guide: WORDPRESS_API_MIGRATION_COMPLETE.md');
}

// Run the tests
runTests().catch(console.error);

#!/usr/bin/env node

/**
 * Test Script for Mobile API Proxy
 * Tests all the key endpoints that the mobile app uses
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://toyflix.in';
const TEST_PHONE = '9999999999';

// Test endpoints that mobile app uses
const TEST_ENDPOINTS = [
    {
        name: 'Generate Token (Authentication)',
        method: 'POST',
        path: '/wp-json/api/v1/generate-token',
        body: { phone_number: TEST_PHONE }
    },
    {
        name: 'Check Phone Exists',
        method: 'POST', 
        path: '/wp-json/api/v1/check-phone-exists',
        body: { phone_number: TEST_PHONE }
    },
    {
        name: 'User Profile',
        method: 'GET',
        path: '/wp-json/api/v1/user-profile?token=test-token'
    },
    {
        name: 'Send OTP',
        method: 'POST',
        path: '/api/sendOtp.php',
        body: { phone: TEST_PHONE }
    },
    {
        name: 'Verify OTP',
        method: 'POST',
        path: '/api/verifyOtp.php',
        body: { phone: TEST_PHONE, otp: '123456' }
    },
    {
        name: 'Featured Products',
        method: 'GET',
        path: '/wp-json/api/v1/featured-products'
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
    console.log('🧪 Testing Mobile API Proxy Endpoints');
    console.log('=' .repeat(50));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Phone: ${TEST_PHONE}`);
    console.log('');

    let passedTests = 0;
    let totalTests = TEST_ENDPOINTS.length;

    for (const endpoint of TEST_ENDPOINTS) {
        process.stdout.write(`Testing ${endpoint.name}... `);
        
        const result = await makeRequest(endpoint);
        
        if (result.success) {
            if (result.status >= 200 && result.status < 400) {
                console.log(`✅ PASS (${result.status})`);
                passedTests++;
                
                // Log interesting response data
                if (result.body && typeof result.body === 'object') {
                    if (result.body.data || result.body.message || result.body.success !== undefined) {
                        console.log(`   Response: ${JSON.stringify(result.body).substring(0, 100)}...`);
                    }
                }
            } else {
                console.log(`⚠️  WARN (${result.status})`);
                console.log(`   Response: ${JSON.stringify(result.body).substring(0, 200)}...`);
            }
        } else {
            console.log(`❌ FAIL`);
            console.log(`   Error: ${result.error}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('=' .repeat(50));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Mobile API proxy is working correctly.');
    } else if (passedTests > 0) {
        console.log('⚠️  Some tests passed. Check the failing endpoints.');
    } else {
        console.log('❌ All tests failed. Check your proxy configuration and VM status.');
    }
    
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy these changes to your Azure Static Web App');
    console.log('2. Test with your mobile app');
    console.log('3. Monitor Azure Function logs for any issues');
}

// Run the tests
runTests().catch(console.error);

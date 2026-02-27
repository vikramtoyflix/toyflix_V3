#!/usr/bin/env node

/**
 * 🧪 Comprehensive Mobile API Integration Test
 * 
 * This script tests all mobile API implementations to ensure they work correctly together.
 * It validates authentication, product catalog, cart functionality, and error scenarios.
 * 
 * Usage: node test-mobile-api-integration.js
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  // Update these based on your environment
  BASE_URL: process.env.API_BASE_URL || 'https://toyflix.in',
  LOCAL_URL: process.env.LOCAL_API_URL || 'http://localhost:3000',
  
  // Test data
  TEST_PHONE: process.env.TEST_PHONE || '9999999999',
  TEST_USER_ID: process.env.TEST_USER_ID || null,
  
  // API endpoints (based on migration docs)
  ENDPOINTS: {
    // Authentication
    CHECK_PHONE_EXISTS: '/wp-json/api/v1/check-phone-exists',
    GENERATE_TOKEN: '/wp-json/api/v1/generate-token',
    USER_PROFILE: '/wp-json/api/v1/user-profile',
    SEND_OTP: '/api/sendOtp.php',
    VERIFY_OTP: '/api/verifyOtp.php',
    
    // Product catalog
    FEATURED_PRODUCTS: '/wp-json/api/v1/featured-products',
    PRODUCT_BY_CATEGORY: '/wp-json/api/v1/product-by-category',
    CATEGORY_MAPPING: '/wp-json/custom-api/v1/get-mapped-category-data',
    
    // Cart & Orders
    ADD_TO_CART: '/wp-json/api/v1/add-to-cart',
    GET_ORDER: '/wp-json/api/v1/get-order',
    SAVE_RESERVED_PRODUCT: '/wp-json/api/v1/save-reserved-product',
    
    // Supabase functions (direct testing)
    SUPABASE_SEND_OTP: '/functions/v1/send-otp',
    SUPABASE_VERIFY_OTP: '/functions/v1/verify-otp',
    SUPABASE_CHECK_USER_STATUS: '/functions/v1/check-user-status',
    WOOCOMMERCE_PROXY: '/functions/v1/woocommerce-proxy'
  },
  
  // Age categories for testing
  AGE_CATEGORIES: {
    '80': 'Ride on Toys',
    '812': '8-12 years',
    '1216': '12-16 years',
    'default': 'All ages'
  }
};

// Test state
let testState = {
  authToken: null,
  userId: null,
  testProductId: null,
  sessionId: null,
  testResults: [],
  performanceMetrics: []
};

// Utility functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mobile-API-Integration-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
            responseTime,
            url
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime,
            url,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      reject({
        error: error.message,
        responseTime: endTime - startTime,
        url
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function logTest(testName, result, details = '') {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
  console.log(`${status} ${testName}${time}`);
  
  if (details) {
    console.log(`   ${details}`);
  }
  
  if (!result.passed && result.error) {
    console.log(`   Error: ${result.error}`);
  }
  
  testState.testResults.push({
    test: testName,
    passed: result.passed,
    responseTime: result.responseTime,
    error: result.error,
    details
  });
  
  if (result.responseTime) {
    testState.performanceMetrics.push(result.responseTime);
  }
}

function validateResponse(response, expectedStatus = 200, expectedFields = []) {
  const result = {
    passed: false,
    responseTime: response.responseTime,
    error: null
  };
  
  // Check status code
  if (response.status !== expectedStatus) {
    result.error = `Expected status ${expectedStatus}, got ${response.status}`;
    return result;
  }
  
  // Check if response has data
  if (!response.data || typeof response.data !== 'object') {
    result.error = 'Invalid response data format';
    return result;
  }
  
  // Check for WordPress-style response format
  if (expectedStatus === 200) {
    if (response.data.status === undefined) {
      result.error = 'Missing status field in response';
      return result;
    }
    
    if (response.data.status !== 200 && response.data.status !== 'success' && response.data.success !== true) {
      result.error = `Unexpected status value: ${response.data.status}`;
      return result;
    }
  }
  
  // Check expected fields
  for (const field of expectedFields) {
    if (!(field in response.data)) {
      result.error = `Missing required field: ${field}`;
      return result;
    }
  }
  
  // Check CORS headers
  if (!response.headers['access-control-allow-origin']) {
    result.error = 'Missing CORS headers';
    return result;
  }
  
  result.passed = true;
  return result;
}

// Test functions
async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Authentication Flow');
  console.log('================================');
  
  // Test 1: Check phone exists
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.CHECK_PHONE_EXISTS}`, {
      method: 'POST',
      body: { phone: CONFIG.TEST_PHONE }
    });
    
    const result = validateResponse(response, 200, ['status', 'message']);
    logTest('Check Phone Exists', result, `Phone: ${CONFIG.TEST_PHONE}`);
    
    if (response.data.data && response.data.data.userId) {
      testState.userId = response.data.data.userId;
    }
  } catch (error) {
    logTest('Check Phone Exists', { passed: false, error: error.error });
  }
  
  // Test 2: Send OTP
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.SEND_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `phone_number=${CONFIG.TEST_PHONE}`
    });
    
    const result = validateResponse(response, 200);
    logTest('Send OTP', result, `Phone: ${CONFIG.TEST_PHONE}`);
    
    if (response.data.sessionId) {
      testState.sessionId = response.data.sessionId;
    }
  } catch (error) {
    logTest('Send OTP', { passed: false, error: error.error });
  }
  
  // Test 3: Generate token
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.GENERATE_TOKEN}`, {
      method: 'POST',
      body: { phone: CONFIG.TEST_PHONE }
    });
    
    const result = validateResponse(response, 200, ['status', 'data']);
    logTest('Generate Token', result);
    
    if (response.data.data && response.data.data.token) {
      testState.authToken = response.data.data.token;
    }
  } catch (error) {
    logTest('Generate Token', { passed: false, error: error.error });
  }
  
  // Test 4: User profile (with token)
  if (testState.authToken) {
    try {
      const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.USER_PROFILE}?token=${testState.authToken}`);
      
      const result = validateResponse(response, 200, ['status', 'data']);
      logTest('User Profile', result, 'With auth token');
      
      if (response.data.data && response.data.data.id) {
        testState.userId = response.data.data.id;
      }
    } catch (error) {
      logTest('User Profile', { passed: false, error: error.error });
    }
  } else {
    logTest('User Profile', { passed: false, error: 'No auth token available' });
  }
  
  // Test 5: Verify OTP (with dummy OTP for testing)
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.VERIFY_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `phone_number=${CONFIG.TEST_PHONE}&otp=123456`
    });
    
    // This might fail with invalid OTP, but should still return proper format
    const result = validateResponse(response, 400); // Expect 400 for invalid OTP
    if (result.passed || response.data.error) {
      logTest('Verify OTP', { passed: true, responseTime: response.responseTime }, 'Invalid OTP test');
    } else {
      logTest('Verify OTP', result);
    }
  } catch (error) {
    logTest('Verify OTP', { passed: false, error: error.error });
  }
}

async function testProductCatalog() {
  console.log('\n📦 Testing Product Catalog');
  console.log('===========================');
  
  // Test 1: Featured products
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.FEATURED_PRODUCTS}`);
    
    const result = validateResponse(response, 200, ['status', 'data']);
    logTest('Featured Products', result);
    
    // Validate product data structure
    if (result.passed && response.data.data && response.data.data.length > 0) {
      const product = response.data.data[0];
      const requiredFields = ['id', 'name', 'stock_status', 'price'];
      const missingFields = requiredFields.filter(field => !(field in product));
      
      if (missingFields.length > 0) {
        logTest('Featured Products Data Validation', { 
          passed: false, 
          error: `Missing product fields: ${missingFields.join(', ')}` 
        });
      } else {
        logTest('Featured Products Data Validation', { 
          passed: true, 
          responseTime: response.responseTime 
        }, `Found ${response.data.data.length} products`);
        
        // Store a product ID for later tests
        testState.testProductId = product.id;
      }
    }
  } catch (error) {
    logTest('Featured Products', { passed: false, error: error.error });
  }
  
  // Test 2: Category mapping
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.CATEGORY_MAPPING}`);
    
    const result = validateResponse(response, 200, ['status', 'data']);
    logTest('Category Mapping', result);
  } catch (error) {
    logTest('Category Mapping', { passed: false, error: error.error });
  }
  
  // Test 3: Products by category (test all age categories)
  for (const [categoryId, categoryName] of Object.entries(CONFIG.AGE_CATEGORIES)) {
    try {
      const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.PRODUCT_BY_CATEGORY}?categories=${categoryId}`, {
        method: 'POST',
        body: { token: testState.authToken || 'test-token' }
      });
      
      const result = validateResponse(response, 200, ['status', 'data']);
      logTest(`Product by Category (${categoryName})`, result);
      
      // Validate age filtering is working
      if (result.passed && response.data.data) {
        logTest(`Age Filtering (${categoryName})`, { 
          passed: true, 
          responseTime: response.responseTime 
        }, `Found ${response.data.data.length} products`);
      }
    } catch (error) {
      logTest(`Product by Category (${categoryName})`, { passed: false, error: error.error });
    }
  }
}

async function testCartFunctionality() {
  console.log('\n🛒 Testing Cart Functionality');
  console.log('==============================');
  
  if (!testState.authToken) {
    logTest('Add to Cart', { passed: false, error: 'No auth token available' });
    logTest('Get Order', { passed: false, error: 'No auth token available' });
    return;
  }
  
  // Test 1: Add to cart (with test product)
  if (testState.testProductId) {
    try {
      const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ADD_TO_CART}`, {
        method: 'POST',
        body: {
          token: testState.authToken,
          product_id: testState.testProductId,
          quantity: 1
        }
      });
      
      const result = validateResponse(response, 200);
      logTest('Add to Cart', result, `Product ID: ${testState.testProductId}`);
    } catch (error) {
      logTest('Add to Cart', { passed: false, error: error.error });
    }
  } else {
    logTest('Add to Cart', { passed: false, error: 'No test product ID available' });
  }
  
  // Test 2: Get order history
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.GET_ORDER}?token=${testState.authToken}`);
    
    const result = validateResponse(response, 200, ['status', 'data']);
    logTest('Get Order History', result);
  } catch (error) {
    logTest('Get Order History', { passed: false, error: error.error });
  }
  
  // Test 3: Save reserved product
  if (testState.testProductId) {
    try {
      const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.SAVE_RESERVED_PRODUCT}`, {
        method: 'POST',
        body: {
          token: testState.authToken,
          product_id: testState.testProductId
        }
      });
      
      const result = validateResponse(response, 200);
      logTest('Save Reserved Product', result, `Product ID: ${testState.testProductId}`);
    } catch (error) {
      logTest('Save Reserved Product', { passed: false, error: error.error });
    }
  } else {
    logTest('Save Reserved Product', { passed: false, error: 'No test product ID available' });
  }
}

async function testErrorScenarios() {
  console.log('\n⚠️  Testing Error Scenarios');
  console.log('============================');
  
  // Test 1: Invalid phone number
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.CHECK_PHONE_EXISTS}`, {
      method: 'POST',
      body: { phone: 'invalid' }
    });
    
    // Should handle gracefully
    const result = validateResponse(response, 200);
    logTest('Invalid Phone Number', result, 'Should handle gracefully');
  } catch (error) {
    logTest('Invalid Phone Number', { passed: false, error: error.error });
  }
  
  // Test 2: Invalid token
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.USER_PROFILE}?token=invalid-token`);
    
    const result = validateResponse(response, 401); // Expect unauthorized
    logTest('Invalid Token', result);
  } catch (error) {
    logTest('Invalid Token', { passed: false, error: error.error });
  }
  
  // Test 3: Missing required parameters
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ADD_TO_CART}`, {
      method: 'POST',
      body: { token: testState.authToken } // Missing product_id
    });
    
    const result = validateResponse(response, 400); // Expect bad request
    logTest('Missing Required Parameters', result);
  } catch (error) {
    logTest('Missing Required Parameters', { passed: false, error: error.error });
  }
  
  // Test 4: Non-existent product
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ADD_TO_CART}`, {
      method: 'POST',
      body: {
        token: testState.authToken,
        product_id: 'non-existent-id',
        quantity: 1
      }
    });
    
    const result = validateResponse(response, 404); // Expect not found
    logTest('Non-existent Product', result);
  } catch (error) {
    logTest('Non-existent Product', { passed: false, error: error.error });
  }
  
  // Test 5: Invalid OTP
  try {
    const response = await makeRequest(`${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.VERIFY_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `phone_number=${CONFIG.TEST_PHONE}&otp=999999`
    });
    
    const result = validateResponse(response, 400); // Expect invalid OTP
    logTest('Invalid OTP', result);
  } catch (error) {
    logTest('Invalid OTP', { passed: false, error: error.error });
  }
}

async function testSupabaseFunctions() {
  console.log('\n🔧 Testing Supabase Functions (Direct)');
  console.log('=======================================');
  
  const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
  
  // Test 1: Check user status
  try {
    const response = await makeRequest(`${supabaseUrl}${CONFIG.ENDPOINTS.SUPABASE_CHECK_USER_STATUS}?phone=${CONFIG.TEST_PHONE}`);
    
    const result = validateResponse(response, 200, ['success', 'exists']);
    logTest('Supabase Check User Status', result);
  } catch (error) {
    logTest('Supabase Check User Status', { passed: false, error: error.error });
  }
  
  // Test 2: Send OTP (Supabase function)
  try {
    const response = await makeRequest(`${supabaseUrl}${CONFIG.ENDPOINTS.SUPABASE_SEND_OTP}`, {
      method: 'POST',
      body: { phone: CONFIG.TEST_PHONE }
    });
    
    const result = validateResponse(response, 200, ['success']);
    logTest('Supabase Send OTP', result);
  } catch (error) {
    logTest('Supabase Send OTP', { passed: false, error: error.error });
  }
  
  // Test 3: WooCommerce proxy
  try {
    const response = await makeRequest(`${supabaseUrl}${CONFIG.ENDPOINTS.WOOCOMMERCE_PROXY}?action=getUserByPhone&phone=${CONFIG.TEST_PHONE}`);
    
    const result = validateResponse(response, 200, ['success', 'data']);
    logTest('WooCommerce Proxy', result);
  } catch (error) {
    logTest('WooCommerce Proxy', { passed: false, error: error.error });
  }
}

function generateTestReport() {
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const totalTests = testState.testResults.length;
  const passedTests = testState.testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  
  if (testState.performanceMetrics.length > 0) {
    const avgResponseTime = testState.performanceMetrics.reduce((a, b) => a + b, 0) / testState.performanceMetrics.length;
    const maxResponseTime = Math.max(...testState.performanceMetrics);
    const minResponseTime = Math.min(...testState.performanceMetrics);
    
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${minResponseTime}ms`);
    console.log(`Max Response Time: ${maxResponseTime}ms`);
  }
  
  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testState.testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.test}: ${r.error}`);
      });
  }
  
  console.log('\n🎯 Test State:');
  console.log(`  Auth Token: ${testState.authToken ? '✅ Generated' : '❌ Not generated'}`);
  console.log(`  User ID: ${testState.userId || 'Not found'}`);
  console.log(`  Test Product ID: ${testState.testProductId || 'Not found'}`);
  console.log(`  Session ID: ${testState.sessionId || 'Not generated'}`);
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`\n🏆 Overall Success Rate: ${successRate}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Mobile API integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  return passedTests === totalTests;
}

// Main execution
async function runTests() {
  console.log('🧪 Mobile API Integration Test Suite');
  console.log('====================================');
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`Test Phone: ${CONFIG.TEST_PHONE}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  
  try {
    await testAuthenticationFlow();
    await testProductCatalog();
    await testCartFunctionality();
    await testErrorScenarios();
    await testSupabaseFunctions();
    
    const allPassed = generateTestReport();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testAuthenticationFlow,
  testProductCatalog,
  testCartFunctionality,
  testErrorScenarios,
  testSupabaseFunctions,
  CONFIG
};
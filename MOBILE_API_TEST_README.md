# 🧪 Mobile API Integration Test Suite

## 📱 Overview

This comprehensive test suite validates all mobile API implementations to ensure they work correctly together. It tests the complete mobile app integration flow from authentication to order placement, ensuring production readiness.

## 🎯 What Gets Tested

### 🔐 Authentication Flow
- **Phone Number Validation**: Tests multiple phone formats (+91, 91, plain)
- **OTP Generation**: Validates OTP creation and SMS sending
- **OTP Verification**: Tests OTP validation and phone verification
- **Token Generation**: Validates JWT token creation and management
- **User Profile**: Tests user data retrieval with subscription details

### 📦 Product Catalog
- **Featured Products**: Validates real toy data retrieval
- **Category Mapping**: Tests WordPress category ID mapping
- **Age Filtering**: Tests all age categories (80, 812, 1216, default)
- **Product Data Validation**: Ensures real Supabase data vs mock data
- **Image Gallery**: Validates product image URLs and gallery support

### 🛒 Cart Functionality
- **Add to Cart**: Tests product addition with validation
- **Stock Checking**: Validates real-time inventory checking
- **Order History**: Tests order retrieval with pagination
- **Product Reservation**: Tests wishlist/reservation system
- **Business Logic**: Validates subscription limits and rules

### ⚠️ Error Scenarios
- **Invalid Tokens**: Tests authentication error handling
- **Missing Parameters**: Validates required field validation
- **Non-existent Products**: Tests 404 error handling
- **Invalid OTP**: Tests OTP validation errors
- **Network Errors**: Tests graceful failure handling

### 🔧 Direct Supabase Functions
- **User Status Check**: Tests direct Supabase function calls
- **OTP Services**: Tests Supabase OTP functions
- **WooCommerce Proxy**: Tests database proxy functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Access to mobile API endpoints
- Test phone number (for OTP testing)

### Environment Variables (Optional)
```bash
# API Configuration
API_BASE_URL=https://toyflix.in          # Production API
LOCAL_API_URL=http://localhost:3000      # Local development
SUPABASE_URL=https://your-project.supabase.co

# Test Data
TEST_PHONE=9999999999                    # Test phone number
TEST_USER_ID=your-test-user-id           # Optional: existing user ID
```

### Running Tests

#### 1. Using npm script (recommended)
```bash
# Run all mobile API tests
npm run test:mobile-api

# Or run directly
node test-mobile-api-integration.js
```

#### 2. With custom configuration
```bash
# Test against local development
API_BASE_URL=http://localhost:3000 node test-mobile-api-integration.js

# Test with specific phone number
TEST_PHONE=9876543210 node test-mobile-api-integration.js

# Test against different environment
API_BASE_URL=https://staging.toyflix.in node test-mobile-api-integration.js
```

## 📊 Test Results

### Expected Output
```
🧪 Mobile API Integration Test Suite
====================================
Base URL: https://toyflix.in
Test Phone: 9999999999
Started at: 2025-01-17T10:30:00.000Z

🔐 Testing Authentication Flow
================================
✅ PASS Check Phone Exists (245ms)
✅ PASS Send OTP (1234ms)
✅ PASS Generate Token (189ms)
✅ PASS User Profile (267ms)
✅ PASS Verify OTP (156ms)

📦 Testing Product Catalog
==========================
✅ PASS Featured Products (345ms)
✅ PASS Featured Products Data Validation (345ms) Found 15 products
✅ PASS Category Mapping (123ms)
✅ PASS Product by Category (Ride on Toys) (298ms) Found 8 products
✅ PASS Product by Category (8-12 years) (267ms) Found 12 products
✅ PASS Product by Category (12-16 years) (234ms) Found 6 products
✅ PASS Product by Category (All ages) (312ms) Found 25 products

🛒 Testing Cart Functionality
==============================
✅ PASS Add to Cart (456ms)
✅ PASS Get Order History (234ms)
✅ PASS Save Reserved Product (198ms)

⚠️  Testing Error Scenarios
============================
✅ PASS Invalid Phone Number (145ms) Should handle gracefully
✅ PASS Invalid Token (123ms)
✅ PASS Missing Required Parameters (134ms)
✅ PASS Non-existent Product (167ms)
✅ PASS Invalid OTP (189ms)

🔧 Testing Supabase Functions (Direct)
======================================
✅ PASS Supabase Check User Status (234ms)
✅ PASS Supabase Send OTP (567ms)
✅ PASS WooCommerce Proxy (345ms)

📊 Test Results Summary
========================
Total Tests: 20
Passed: 20 ✅
Failed: 0 ❌

⏱️  Performance Metrics:
Average Response Time: 267.45ms
Min Response Time: 123ms
Max Response Time: 567ms

🎯 Test State:
  Auth Token: ✅ Generated
  User ID: 12345
  Test Product ID: abc-123-toy-id
  Session ID: sess_456789

🏆 Overall Success Rate: 100.0%

🎉 All tests passed! Mobile API integration is working correctly.
```

## 🔍 Test Validation

### Response Format Validation
All responses are validated to ensure they match the mobile app expectations:

```javascript
// Expected WordPress-compatible format
{
  "status": 200,
  "message": "Success message",
  "data": {
    // Actual response data
  }
}
```

### CORS Header Validation
Tests verify that all responses include proper CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE`
- `Access-Control-Allow-Headers: Content-Type, Authorization, x-client-info, apikey`

### Data Validation
- **Real Data Verification**: Ensures responses contain actual Supabase data, not mock data
- **Field Validation**: Validates required fields are present in responses
- **Type Validation**: Ensures data types match mobile app expectations
- **Business Logic**: Validates stock checking, subscription limits, etc.

## 🐛 Troubleshooting

### Common Issues

#### 1. "Missing CORS headers"
**Problem**: APIs not returning CORS headers
**Solution**: Check API gateway configuration and ensure CORS middleware is enabled

#### 2. "Invalid response data format"
**Problem**: Response format doesn't match WordPress format
**Solution**: Verify API response formatting matches mobile app expectations

#### 3. "Authentication failed"
**Problem**: Token generation or validation failing
**Solution**: Check Supabase JWT configuration and user data

#### 4. "No products found"
**Problem**: Product catalog returning empty results
**Solution**: Verify toy data exists in Supabase and category mapping is correct

#### 5. "OTP verification failed"
**Problem**: OTP generation or verification not working
**Solution**: Check 2Factor API configuration and OTP storage

### Debug Mode

Enable detailed logging by setting the DEBUG environment variable:

```bash
DEBUG=1 node test-mobile-api-integration.js
```

This will show:
- Full request/response details
- Database query information
- Stack traces for errors

## 📈 Performance Monitoring

### Response Time Metrics
The test suite tracks and reports:
- Average response time across all endpoints
- Min/max response times
- Per-endpoint performance data

### Performance Benchmarks
- **Excellent**: < 200ms average response time
- **Good**: 200-500ms average response time  
- **Needs Improvement**: > 500ms average response time

## 🔧 Configuration

### Test Data Setup

For comprehensive testing, ensure your test environment has:

1. **Test User Account**: A user account with known phone number
2. **Test Products**: Several products across different age categories
3. **Subscription Data**: Test subscription records for user profile testing
4. **Order History**: Sample orders for order history testing

### Environment-Specific Configuration

#### Local Development
```bash
API_BASE_URL=http://localhost:3000
SUPABASE_URL=http://localhost:54321
```

#### Staging Environment
```bash
API_BASE_URL=https://staging.toyflix.in
SUPABASE_URL=https://staging-project.supabase.co
```

#### Production Environment
```bash
API_BASE_URL=https://toyflix.in
SUPABASE_URL=https://production-project.supabase.co
```

## 🔄 Continuous Integration

### GitHub Actions Integration

Add to your `.github/workflows/ci.yml`:

```yaml
name: Mobile API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-mobile-api:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Run Mobile API Tests
      env:
        API_BASE_URL: ${{ secrets.API_BASE_URL }}
        TEST_PHONE: ${{ secrets.TEST_PHONE }}
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      run: npm run test:mobile-api
```

### Slack Notifications

Configure Slack notifications for test failures:

```javascript
// Add to test script
if (!allPassed) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Mobile API tests failed! ${failedTests}/${totalTests} tests failed.`
      })
    });
  }
}
```

## 📝 Test Coverage

### API Endpoints Covered

| Endpoint | Method | Test Coverage |
|----------|--------|---------------|
| `/wp-json/api/v1/check-phone-exists` | POST | ✅ Full |
| `/wp-json/api/v1/generate-token` | POST | ✅ Full |
| `/wp-json/api/v1/user-profile` | GET | ✅ Full |
| `/api/sendOtp.php` | POST | ✅ Full |
| `/api/verifyOtp.php` | POST | ✅ Full |
| `/wp-json/api/v1/featured-products` | GET | ✅ Full |
| `/wp-json/api/v1/product-by-category` | POST | ✅ Full |
| `/wp-json/custom-api/v1/get-mapped-category-data` | GET | ✅ Full |
| `/wp-json/api/v1/add-to-cart` | POST | ✅ Full |
| `/wp-json/api/v1/get-order` | GET | ✅ Full |
| `/wp-json/api/v1/save-reserved-product` | POST | ✅ Full |

### Test Scenarios Covered

- ✅ Happy path flows
- ✅ Error handling scenarios
- ✅ Data validation
- ✅ Authentication flows
- ✅ Business logic validation
- ✅ Performance monitoring
- ✅ CORS header validation
- ✅ Response format validation

## 🎯 Best Practices

### Before Running Tests
1. **Environment Setup**: Ensure all environment variables are configured
2. **Test Data**: Verify test data exists in the target environment
3. **API Health**: Check that all API endpoints are accessible
4. **Database Connection**: Verify Supabase connectivity

### After Running Tests
1. **Review Results**: Check for any failed tests and investigate
2. **Performance Analysis**: Monitor response times and identify bottlenecks
3. **Error Logs**: Review any error messages for potential issues
4. **Documentation**: Update test documentation if needed

### Regular Maintenance
1. **Update Test Data**: Keep test data current with production
2. **Add New Tests**: Add tests for new API endpoints
3. **Review Configuration**: Update configuration as APIs evolve
4. **Monitor Performance**: Track performance trends over time

## 🆘 Support

If you encounter issues with the test suite:

1. **Check Logs**: Review detailed error messages
2. **Verify Configuration**: Ensure all environment variables are set
3. **Test Manually**: Try calling endpoints manually to isolate issues
4. **Check Documentation**: Refer to API documentation for expected formats
5. **Contact Team**: Reach out to the development team for assistance

---

## 📄 License

This test suite is part of the ToyFlix project and follows the same licensing terms.

---

**Last Updated**: January 17, 2025  
**Version**: 1.0.0  
**Maintainer**: ToyFlix Development Team
/**
 * Test script for 2Factor SMS integration
 * 
 * This script tests both sendOtp and verifyOtp APIs with 2Factor integration
 * 
 * Usage:
 * 1. Set the TWOFACTOR_API_KEY environment variable
 * 2. Update the testPhoneNumber with a real phone number
 * 3. Run: node test-2factor-integration.js
 */

const https = require('https');
const querystring = require('querystring');

// Configuration
const config = {
  // Update this with your Azure Functions URL or local server URL
  baseUrl: 'http://localhost:7071', // Default Azure Functions local URL
  
  // Update this with a real phone number for testing
  testPhoneNumber: '9876543210', // Replace with actual phone number
  
  // Test OTP (will be received from SMS)
  testOtp: null // This will be set after receiving SMS
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Test sendOtp API
async function testSendOtp() {
  console.log('\n=== Testing sendOtp API ===');
  
  try {
    const postData = querystring.stringify({
      phoneNumber: config.testPhoneNumber
    });

    const options = {
      hostname: new URL(config.baseUrl).hostname,
      port: new URL(config.baseUrl).port || (new URL(config.baseUrl).protocol === 'https:' ? 443 : 80),
      path: '/api/sendOtp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`Sending OTP to: ${config.testPhoneNumber}`);
    const response = await makeRequest(options, postData);
    
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));

    if (response.body && response.body.success) {
      console.log('\n✅ OTP sent successfully!');
      console.log('Session ID:', response.body.data.session_id);
      console.log('Provider:', response.body.data.provider);
      console.log('Expires in:', response.body.data.expires_in, 'seconds');
      
      // Note: In a real test, you would need to check your phone for the OTP
      console.log('\n⚠️  Please check your phone for the OTP and update config.testOtp');
      
      return response.body.data;
    } else {
      console.log('\n❌ Failed to send OTP');
      console.log('Error:', response.body?.data?.error);
      console.log('Details:', response.body?.data?.details);
      return null;
    }
  } catch (error) {
    console.error('\n❌ Error testing sendOtp:', error.message);
    return null;
  }
}

// Test verifyOtp API
async function testVerifyOtp(sessionData, otp) {
  console.log('\n=== Testing verifyOtp API ===');
  
  if (!otp) {
    console.log('\n⚠️  No OTP provided. Skipping verification test.');
    console.log('Please update config.testOtp with the received OTP and run again.');
    return;
  }

  try {
    const postData = querystring.stringify({
      phoneNumber: config.testPhoneNumber,
      otp: otp
    });

    const options = {
      hostname: new URL(config.baseUrl).hostname,
      port: new URL(config.baseUrl).port || (new URL(config.baseUrl).protocol === 'https:' ? 443 : 80),
      path: '/api/verifyOtp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`Verifying OTP for: ${config.testPhoneNumber}`);
    console.log(`OTP: ${otp}`);
    
    const response = await makeRequest(options, postData);
    
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));

    if (response.body && response.body.success) {
      console.log('\n✅ OTP verified successfully!');
      console.log('User Token:', response.body.data.user_token);
      console.log('Provider:', response.body.data.provider);
      console.log('Verified:', response.body.data.verified);
    } else {
      console.log('\n❌ Failed to verify OTP');
      console.log('Error:', response.body?.data?.error);
      console.log('Details:', response.body?.data?.details);
    }
  } catch (error) {
    console.error('\n❌ Error testing verifyOtp:', error.message);
  }
}

// Test error scenarios
async function testErrorScenarios() {
  console.log('\n=== Testing Error Scenarios ===');
  
  // Test 1: Missing phone number
  console.log('\n--- Test 1: Missing phone number ---');
  try {
    const postData = querystring.stringify({});
    const options = {
      hostname: new URL(config.baseUrl).hostname,
      port: new URL(config.baseUrl).port || (new URL(config.baseUrl).protocol === 'https:' ? 443 : 80),
      path: '/api/sendOtp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));
    
    if (!response.body.success && response.body.data.error === 'missing_phone') {
      console.log('✅ Correctly handled missing phone number');
    } else {
      console.log('❌ Did not handle missing phone number correctly');
    }
  } catch (error) {
    console.error('Error in test 1:', error.message);
  }

  // Test 2: Invalid OTP format
  console.log('\n--- Test 2: Invalid OTP format ---');
  try {
    const postData = querystring.stringify({
      phoneNumber: config.testPhoneNumber,
      otp: 'abc'
    });
    
    const options = {
      hostname: new URL(config.baseUrl).hostname,
      port: new URL(config.baseUrl).port || (new URL(config.baseUrl).protocol === 'https:' ? 443 : 80),
      path: '/api/verifyOtp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    console.log('Response Status:', response.statusCode);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));
    
    if (!response.body.success) {
      console.log('✅ Correctly handled invalid OTP format');
    } else {
      console.log('❌ Did not handle invalid OTP format correctly');
    }
  } catch (error) {
    console.error('Error in test 2:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting 2Factor Integration Tests');
  console.log('=====================================');
  
  // Check if environment variables are set
  if (!process.env.TWOFACTOR_API_KEY) {
    console.log('\n⚠️  WARNING: TWOFACTOR_API_KEY environment variable not set');
    console.log('The tests will fail without a valid API key');
    console.log('Please set the environment variable and restart the server\n');
  }

  // Test error scenarios first
  await testErrorScenarios();
  
  // Test send OTP
  const sessionData = await testSendOtp();
  
  // If OTP was sent successfully, test verification
  if (sessionData) {
    // For automated testing, you might need to wait for user input
    console.log('\n⏳ Waiting for OTP to be received...');
    console.log('Press Ctrl+C to exit if you want to test manually');
    
    // In a real scenario, you would get the OTP from SMS
    // For this test, we'll use a placeholder
    const testOtp = config.testOtp || '123456'; // Replace with actual OTP
    
    // Wait a bit before testing verification
    setTimeout(async () => {
      await testVerifyOtp(sessionData, testOtp);
      console.log('\n🏁 Tests completed!');
    }, 5000);
  } else {
    console.log('\n🏁 Tests completed (with errors)');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSendOtp,
  testVerifyOtp,
  testErrorScenarios,
  runTests
};
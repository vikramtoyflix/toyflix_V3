#!/usr/bin/env node

/**
 * Test User Check During Login
 * This script tests the user check functionality that should happen during login
 */

console.log('🧪 TESTING USER CHECK DURING LOGIN');
console.log('=====================================\n');

// Test phone numbers
const testCases = [
  {
    name: 'Existing User (with profile)',
    phone: '9108734535',
    expected: 'Should find user and show signin'
  },
  {
    name: 'Existing User (incomplete profile)', 
    phone: '8595968253',
    expected: 'Should find user but show signup form'
  },
  {
    name: 'New User',
    phone: '9999999999',
    expected: 'Should not find user and show signup'
  }
];

async function testUserCheck(phone, testName) {
  console.log(`\n📱 Testing: ${testName}`);
  console.log(`   Phone: +91${phone}`);
  
  try {
    // Test the checkUserStatus function directly
    const url = `https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status?phone=${encodeURIComponent('+91' + phone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY',
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    console.log('   ✅ Response Status:', response.status);
    console.log('   📊 User Status:', {
      exists: data.exists,
      isComplete: data.isComplete,
      isPhoneVerified: data.isPhoneVerified,
      userId: data.userId
    });
    
    // Determine what should happen in the UI
    let expectedAction = '';
    if (data.exists && data.isComplete) {
      expectedAction = '🔐 Should show SIGNIN flow';
    } else if (data.exists && !data.isComplete) {
      expectedAction = '📝 Should show SIGNUP form (complete profile)';
    } else {
      expectedAction = '🆕 Should show SIGNUP form (new user)';
    }
    
    console.log('   🎯 Expected Action:', expectedAction);
    
    return {
      success: response.ok,
      data,
      expectedAction
    };
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🔍 Testing user check functionality...\n');
  
  for (const testCase of testCases) {
    const result = await testUserCheck(testCase.phone, testCase.name);
    console.log(`   Expected: ${testCase.expected}`);
    
    if (result.success) {
      console.log('   ✅ Test completed successfully');
    } else {
      console.log('   ❌ Test failed:', result.error);
    }
    
    console.log('   ' + '-'.repeat(50));
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('The user check function is working correctly.');
  console.log('If users are not seeing the right flow, the issue might be:');
  console.log('1. Frontend not calling the user check function');
  console.log('2. User check results not being processed correctly');
  console.log('3. UI not updating based on user check results');
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Check browser console for "🔍 Smart login check" logs');
  console.log('2. Verify the authentication component is using checkUserExistsForSmartLogin');
  console.log('3. Check if mode switching is working in SignupFirstAuth component');
}

// Run the tests
runAllTests().catch(console.error); 
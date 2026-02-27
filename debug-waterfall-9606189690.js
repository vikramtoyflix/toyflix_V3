#!/usr/bin/env node

// Debug script for phone number 9606189690 waterfall issue

console.log('🔍 Debugging Waterfall for 9606189690');
console.log('=====================================');

const phoneVariations = [
  '9606189690',
  '+919606189690', 
  '919606189690',
  '09606189690'
];

console.log('📱 Testing phone number variations:');
phoneVariations.forEach((phone, i) => {
  console.log(`${i + 1}. "${phone}"`);
});

const fetch = require('node-fetch');

async function testPhoneVariations() {
  console.log('\n🧪 Testing each variation against VM API...');
  
  for (const phone of phoneVariations) {
    try {
      console.log(`\n📞 Testing: "${phone}"`);
      
      const url = `http://4.213.183.90:3001/api/woocommerce?action=getUserByPhone&phone=${encodeURIComponent(phone)}`;
      console.log(`🔗 URL: ${url}`);
      
      const response = await fetch(url, { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`✅ FOUND USER:`, {
          phone: phone,
          user_id: data.data.ID,
          name: data.data.display_name,
          email: data.data.user_email,
          billing_phone: data.data.billing_phone
        });
      } else {
        console.log(`❌ No user found for: "${phone}"`);
      }
      
    } catch (error) {
      console.log(`💥 Error testing "${phone}":`, error.message);
    }
  }
}

async function testStaticWebAppServiceLogic() {
  console.log('\n🔧 Testing StaticWebAppWooCommerceService logic...');
  
  const testPhone = '+919606189690';  // This is likely what's in custom_auth
  console.log(`📱 Input phone: "${testPhone}"`);
  
  // Simulate the normalization logic
  const normalizedPhone = testPhone.replace(/^\+91/, '');
  console.log(`🧹 Normalized phone: "${normalizedPhone}"`);
  
  try {
    const url = `http://4.213.183.90:3001/api/woocommerce?action=getUserByPhone&phone=${encodeURIComponent(normalizedPhone)}`;
    console.log(`🔗 Final URL: ${url}`);
    
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();
    
    console.log('📊 Service Response:', {
      success: data.success,
      hasData: !!data.data,
      userId: data.data?.ID,
      userName: data.data?.display_name
    });
    
    if (data.success && data.data) {
      console.log('✅ This should return hasWooCommerceData: true');
      console.log('✅ userType should be: "woocommerce"');
    } else {
      console.log('❌ This explains why WC: NO is showing');
    }
    
  } catch (error) {
    console.log('💥 Service call failed:', error.message);
    console.log('❌ This explains why WC: NO is showing');
  }
}

// Run all tests
async function runDebug() {
  await testPhoneVariations();
  await testStaticWebAppServiceLogic();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check browser console for actual phone number format');
  console.log('2. Clear React Query cache (F12 → Application → Storage → Clear All)');
  console.log('3. Check network tab for failed API calls');
  console.log('4. Look for CORS or timeout errors');
}

runDebug().catch(console.error); 
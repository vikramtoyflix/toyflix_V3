const { WooCommerceClient } = require('./migrate-woocommerce-to-supabase.js');

class PhoneNumberFetcher {
  constructor() {
    this.wcClient = new WooCommerceClient();
  }

  // Test known phone numbers to find more users
  async findMorePhoneNumbers() {
    console.log('🔍 Finding more phone numbers from WooCommerce...\n');

    // Common Indian phone number patterns to test
    const phonePatterns = [
      // Bangalore area codes
      '9980111432', '7760108610', '9573832932',
      
      // Common patterns (you can expand this based on your data)
      '9876543210', '8123456789', '7890123456',
      '9123456789', '8765432109', '7654321098',
      
      // Add more patterns based on your customer base
      '9591488772', '8951234567', '7845123456'
    ];

    const validUsers = [];
    const invalidNumbers = [];

    for (const phone of phonePatterns) {
      try {
        console.log(`Testing phone: ${phone}`);
        
        const userResponse = await this.wcClient.getUserByPhone(phone);
        
        if (userResponse.success && userResponse.data) {
          const user = userResponse.data;
          validUsers.push({
            phone: phone,
            name: user.display_name || `${user.billing_first_name} ${user.billing_last_name}`,
            email: user.user_email,
            userId: user.ID,
            registered: user.user_registered
          });
          
          console.log(`✅ Found user: ${user.display_name} (${phone})`);
        } else {
          invalidNumbers.push(phone);
          console.log(`❌ No user found for: ${phone}`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`⚠️ Error checking ${phone}: ${error.message}`);
        invalidNumbers.push(phone);
      }
    }

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📊 PHONE NUMBER DISCOVERY RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Valid users found: ${validUsers.length}`);
    console.log(`❌ Invalid numbers: ${invalidNumbers.length}`);

    if (validUsers.length > 0) {
      console.log('\n👥 VALID USERS:');
      validUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} - ${user.phone} (${user.email})`);
      });

      console.log('\n📝 PHONE NUMBERS FOR MIGRATION:');
      const phoneList = validUsers.map(user => `'${user.phone}'`).join(',\n      ');
      console.log(`[\n      ${phoneList}\n    ]`);
    }

    return validUsers;
  }

  // Get detailed info for a specific user
  async getUserDetails(phone) {
    try {
      console.log(`\n🔍 Getting detailed info for: ${phone}`);
      
      const userResponse = await this.wcClient.getUserByPhone(phone);
      if (!userResponse.success) {
        console.log(`❌ User not found: ${phone}`);
        return null;
      }

      const user = userResponse.data;
      console.log(`\n👤 User: ${user.display_name}`);
      console.log(`📧 Email: ${user.user_email}`);
      console.log(`📱 Phone: ${user.billing_phone}`);
      console.log(`📍 Address: ${user.billing_address_1}, ${user.billing_city}`);

      // Get subscription info
      const subscriptionResponse = await this.wcClient.getCompleteUserSubscriptionInfo(user.ID);
      
      if (subscriptionResponse.success && subscriptionResponse.data) {
        const data = subscriptionResponse.data;
        
        console.log(`\n🔄 Subscription Info:`);
        if (data.subscriptionCycle) {
          console.log(`  Plan: ${data.subscriptionCycle.subscription_name}`);
          console.log(`  Status: ${data.subscriptionCycle.subscription_status}`);
          console.log(`  Start: ${data.subscriptionCycle.first_purchase_date}`);
        }
        
        console.log(`\n📦 Orders: ${data.totalOrders || 0}`);
        console.log(`🧸 Current Toys: ${data.currentToys?.length || 0}`);
        
        if (data.currentToys && data.currentToys.length > 0) {
          console.log(`\n🧸 Current Toys:`);
          data.currentToys.forEach((toy, index) => {
            console.log(`  ${index + 1}. ${toy.toy_name || toy.product_title}`);
          });
        }
      }

      return user;

    } catch (error) {
      console.log(`❌ Error getting user details: ${error.message}`);
      return null;
    }
  }
}

// Test specific phone numbers
async function testPhoneNumbers() {
  const fetcher = new PhoneNumberFetcher();
  
  // Find more users
  const users = await fetcher.findMorePhoneNumbers();
  
  // Get detailed info for first valid user
  if (users.length > 0) {
    await fetcher.getUserDetails(users[0].phone);
  }
}

// Export for use in other scripts
module.exports = { PhoneNumberFetcher };

// Run if this file is executed directly
if (require.main === module) {
  testPhoneNumbers().catch(console.error);
} 
/**
 * Quick test for WhatsApp service
 * Run this in browser console to test the service
 */

// Test the WhatsApp service
const testWhatsAppService = () => {
  console.log('🧪 Testing WhatsApp Service...');
  
  // Test data
  const testUser = {
    phone: '+91 9876543210',
    first_name: 'John',
    last_name: 'Doe'
  };
  
  const testSelectionStatus = 'Selection window closed after order placement';
  
  // Import and test the service
  import('./src/services/whatsappService.js').then(({ WhatsAppService }) => {
    console.log('✅ WhatsApp Service imported successfully');
    
    // Test selection window support
    console.log('📱 Testing Selection Window Support...');
    WhatsAppService.openSelectionWindowSupport({
      userPhone: testUser.phone,
      userName: `${testUser.first_name} ${testUser.last_name}`,
      selectionStatus: testSelectionStatus
    });
    
    console.log('✅ WhatsApp service test completed!');
    console.log('📋 Check if WhatsApp opened with the correct message');
  }).catch(error => {
    console.error('❌ Error testing WhatsApp service:', error);
  });
};

// Instructions
console.log(`
🧪 WhatsApp Service Test Instructions:
1. Open browser console
2. Run: testWhatsAppService()
3. Check if WhatsApp opens with pre-filled message
4. Verify the message contains user details and status

📱 Expected WhatsApp URL format:
https://wa.me/919876543210?text=Hi%20ToyJoyBox%20Support%20Team!%20%F0%9F%91%8B...

🔧 To update phone number:
Edit src/config/whatsapp.ts and change SUPPORT_PHONE_NUMBER
`);

// Export for browser console use
window.testWhatsAppService = testWhatsAppService;

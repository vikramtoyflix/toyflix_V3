import { getUserSubscriptionPlan, getUserQueuePricing, calculateQueuePricing } from './subscriptionUtils';

export async function testSubscriptionUtils() {
  console.log('🧪 Testing subscription utility functions...');
  
  // Test with dummy user ID
  const testUserId = 'test-user-123';
  
  try {
    // Test getUserSubscriptionPlan
    console.log('1. Testing getUserSubscriptionPlan...');
    const plan = await getUserSubscriptionPlan(testUserId);
    console.log('Plan result:', plan);
    
    // Test getUserQueuePricing
    console.log('2. Testing getUserQueuePricing...');
    const pricing = await getUserQueuePricing(testUserId, 199);
    console.log('Pricing result:', pricing);
    
    // Test calculateQueuePricing with different scenarios
    console.log('3. Testing calculateQueuePricing scenarios...');
    
    // No subscription
    const noSubPricing = calculateQueuePricing(null, 199);
    console.log('No subscription pricing:', noSubPricing);
    
    // Silver pack
    const silverPricing = calculateQueuePricing({
      planId: 'silver-pack',
      planName: 'Silver Pack',
      planType: 'silver',
      isActive: true,
      isFreeQueueUpdates: true
    }, 199);
    console.log('Silver pack pricing:', silverPricing);
    
    // Discovery delight
    const discoveryPricing = calculateQueuePricing({
      planId: 'discovery-delight',
      planName: 'Discovery Delight',
      planType: 'discovery',
      isActive: true,
      isFreeQueueUpdates: false
    }, 199);
    console.log('Discovery delight pricing:', discoveryPricing);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console
(window as any).testSubscriptionUtils = testSubscriptionUtils; 
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

// Test scenarios for migration override
const TEST_SCENARIOS = [
  {
    name: "Early Cycle - Should Show Migration Access",
    phone: "9999000001",
    email: "test.early@example.com",
    firstName: "Early",
    lastName: "Cycle",
    cycleDay: 5, // Day 5 of 30 - should trigger migration override
    description: "User in early cycle (day 5) - should see orange migration access"
  },
  {
    name: "Normal Selection Window - Should Show Yellow",
    phone: "9999000002", 
    email: "test.normal@example.com",
    firstName: "Normal",
    lastName: "Window",
    cycleDay: 25, // Day 25 of 30 - normal selection window
    description: "User in normal selection window (day 25) - should see yellow normal access"
  },
  {
    name: "Late Cycle - Should Show Migration Access",
    phone: "9999000003",
    email: "test.late@example.com", 
    firstName: "Late",
    lastName: "Cycle",
    cycleDay: 28, // Day 28 of 30 - within 10 days of cycle end
    description: "User near cycle end (day 28) - should see orange migration access"
  },
  {
    name: "Mid Cycle - Should Show Migration Access",
    phone: "9999000004",
    email: "test.mid@example.com",
    firstName: "Mid", 
    lastName: "Cycle",
    cycleDay: 15, // Day 15 of 30 - within 10 days of day 20
    description: "User approaching selection window (day 15) - should see orange migration access"
  },
  {
    name: "Very Early - Should Show Migration Access",
    phone: "9999000005",
    email: "test.veryearly@example.com",
    firstName: "VeryEarly",
    lastName: "Test",
    cycleDay: 2, // Day 2 of 30 - very early but within migration window
    description: "User very early in cycle (day 2) - should see orange migration access"
  },
  {
    name: "Already Queued - Should Show Edit Option", 
    phone: "9999000006",
    email: "test.queued@example.com",
    firstName: "Already",
    lastName: "Queued", 
    cycleDay: 22, // Day 22 of 30 - in selection window with toys already queued
    description: "User with toys already queued (day 22) - should see green edit queue option",
    hasQueuedToys: true
  }
];

// Sample toy data for testing
const SAMPLE_TOYS = [
  {
    toy_id: '11111111-1111-1111-1111-111111111111',
    name: 'Educational Learning Tablet',
    category: 'Educational',
    image_url: '/placeholder.svg',
    unit_price: 299.99,
    total_price: 299.99,
    quantity: 1,
    returned: false
  },
  {
    toy_id: '22222222-2222-2222-2222-222222222222', 
    name: 'Building Blocks Set',
    category: 'Construction',
    image_url: '/placeholder.svg',
    unit_price: 149.99,
    total_price: 149.99,
    quantity: 1,
    returned: false
  },
  {
    toy_id: '33333333-3333-3333-3333-333333333333',
    name: 'Remote Control Car',
    category: 'Vehicles', 
    image_url: '/placeholder.svg',
    unit_price: 199.99,
    total_price: 199.99,
    quantity: 1,
    returned: false
  }
];

// Sample queued toys for users with existing queue
const QUEUED_TOYS = [
  {
    toy_id: '44444444-4444-4444-4444-444444444444',
    name: 'Science Experiment Kit',
    category: 'Educational',
    image_url: '/placeholder.svg',
    unit_price: 129.99,
    total_price: 129.99,
    quantity: 1,
    returned: false,
    queued_for_next_cycle: true
  },
  {
    toy_id: '55555555-5555-5555-5555-555555555555',
    name: 'Musical Keyboard',
    category: 'Musical',
    image_url: '/placeholder.svg', 
    unit_price: 179.99,
    total_price: 179.99,
    quantity: 1,
    returned: false,
    queued_for_next_cycle: true
  }
];

async function createTestUser(scenario) {
  console.log(`\n🧪 Creating test user: ${scenario.name}`);
  
  try {
    // Step 1: Create user in custom_users
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .insert({
        phone: scenario.phone,
        email: scenario.email,
        first_name: scenario.firstName,
        last_name: scenario.lastName,
        subscription_active: true,
        subscription_plan: 'basic',
        phone_verified: true,
        is_active: true,
        role: 'user'
      })
      .select()
      .single();

    if (userError) {
      console.error(`❌ Failed to create user: ${userError.message}`);
      return null;
    }

    console.log(`✅ Created user: ${user.id}`);

    // Step 2: Calculate cycle dates based on scenario
    const today = new Date();
    const cycleStartDate = new Date(today);
    cycleStartDate.setDate(today.getDate() - scenario.cycleDay);
    
    const cycleEndDate = new Date(cycleStartDate);
    cycleEndDate.setDate(cycleStartDate.getDate() + 30);

    // Step 3: Create rental order for current cycle
    const toysData = scenario.hasQueuedToys 
      ? [...SAMPLE_TOYS, ...QUEUED_TOYS]
      : SAMPLE_TOYS;

    const { data: order, error: orderError } = await supabase
      .from('rental_orders')
      .insert({
        order_number: `TEST-${scenario.phone}-${Date.now()}`,
        user_id: user.id,
        user_phone: scenario.phone,
        status: 'active',
        rental_start_date: cycleStartDate.toISOString().split('T')[0],
        rental_end_date: cycleEndDate.toISOString().split('T')[0],
        cycle_number: 1,
        subscription_plan: 'basic',
        total_amount: 1299.00,
        toys_data: toysData,
        toys_delivered_count: SAMPLE_TOYS.length,
        toys_returned_count: 0,
        next_cycle_toys_selected: scenario.hasQueuedToys || false,
        next_cycle_prepared: false,
        shipping_address: {
          name: `${scenario.firstName} ${scenario.lastName}`,
          phone: scenario.phone,
          address_1: 'Test Address 123',
          city: 'Test City',
          state: 'Test State',
          postcode: '560001',
          country: 'India'
        },
        delivery_instructions: 'Test delivery instructions',
        payment_status: 'paid'
      })
      .select()
      .single();

    if (orderError) {
      console.error(`❌ Failed to create order: ${orderError.message}`);
      // Clean up user if order creation failed
      await supabase.from('custom_users').delete().eq('id', user.id);
      return null;
    }

    console.log(`✅ Created order: ${order.id}`);
    console.log(`📅 Cycle: Day ${scenario.cycleDay} of 30`);
    console.log(`📅 Start: ${cycleStartDate.toISOString().split('T')[0]}`);
    console.log(`📅 End: ${cycleEndDate.toISOString().split('T')[0]}`);
    console.log(`🎯 Expected behavior: ${scenario.description}`);

    return {
      user,
      order,
      scenario
    };

  } catch (error) {
    console.error(`💥 Unexpected error creating test user: ${error.message}`);
    return null;
  }
}

async function cleanupTestUsers() {
  console.log('\n🧹 Cleaning up existing test users...');
  
  try {
    // Get all test users (by phone pattern)
    const { data: existingUsers } = await supabase
      .from('custom_users')
      .select('id, phone')
      .like('phone', '9999000%');

    if (existingUsers && existingUsers.length > 0) {
      console.log(`Found ${existingUsers.length} existing test users to clean up`);
      
      // Delete orders first (due to foreign key constraints)
      for (const user of existingUsers) {
        await supabase
          .from('rental_orders')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Delete users
      await supabase
        .from('custom_users')
        .delete()
        .like('phone', '9999000%');
        
      console.log('✅ Cleanup completed');
    } else {
      console.log('No existing test users found');
    }
  } catch (error) {
    console.warn(`⚠️ Cleanup warning: ${error.message}`);
  }
}

async function generateLoginCredentials(testUsers) {
  console.log('\n🔑 TEST USER LOGIN CREDENTIALS');
  console.log('=====================================');
  console.log('Use these phone numbers to test the migration override feature:');
  console.log('');
  
  testUsers.forEach((result, index) => {
    if (result) {
      const { user, scenario } = result;
      console.log(`${index + 1}. ${scenario.name}`);
      console.log(`   📱 Phone: ${user.phone}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🎯 Expected: ${scenario.description}`);
      console.log('');
    }
  });

  console.log('🚀 HOW TO TEST:');
  console.log('1. Go to your app login page');
  console.log('2. Enter one of the phone numbers above');
  console.log('3. Use OTP: 123456 (development mode)');
  console.log('4. Check the dashboard for migration override UI');
  console.log('');
  console.log('🎨 EXPECTED UI COLORS:');
  console.log('🟠 Orange = Migration Access (TEMP_MIGRATION_OVERRIDE)');
  console.log('🟡 Yellow = Normal Selection Window');
  console.log('🟢 Green = Toys Already Queued');
  console.log('⚫ Gray = Selection Closed');
}

async function main() {
  console.log('🧪 MIGRATION OVERRIDE TEST USER GENERATOR');
  console.log('==========================================');
  console.log('This script creates safe test users to verify the migration override feature.');
  console.log('These users will NOT interfere with production data.');
  console.log('');

  // Cleanup existing test users first
  await cleanupTestUsers();

  // Create test users for each scenario
  console.log('\n🏗️  Creating test users...');
  const testUsers = [];
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await createTestUser(scenario);
    testUsers.push(result);
    
    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate login credentials
  await generateLoginCredentials(testUsers);

  // Summary
  const successCount = testUsers.filter(u => u !== null).length;
  console.log(`\n📊 SUMMARY: ${successCount}/${TEST_SCENARIOS.length} test users created successfully`);
  
  if (successCount === TEST_SCENARIOS.length) {
    console.log('✅ All test users created! Ready for migration override testing.');
  } else {
    console.log('⚠️  Some test users failed to create. Check logs above.');
  }
  
  console.log('\n🔒 SAFETY NOTES:');
  console.log('- All test users have phone numbers starting with 9999000xxx');
  console.log('- Test data can be safely deleted anytime');
  console.log('- No production user data is affected');
  console.log('- To cleanup: Re-run this script (auto-cleanup on start)');
}

// Handle cleanup on script termination
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Script interrupted. Running cleanup...');
  await cleanupTestUsers();
  process.exit(0);
});

// Run the script
main().catch(console.error);

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function checkMigrationLogic(userId, phone, expectedResult) {
  console.log(`\n🔍 Testing migration logic for ${phone}...`);
  
  try {
    // Get current cycle
    const { data: currentCycle, error: cycleError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['delivered', 'active', 'confirmed'])
      .gte('rental_end_date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cycleError || !currentCycle) {
      console.log(`❌ No current cycle found: ${cycleError?.message}`);
      return false;
    }

    // Calculate cycle progress
    const cycleStart = new Date(currentCycle.rental_start_date);
    const cycleEnd = new Date(currentCycle.rental_end_date);
    const now = new Date();
    
    const totalCycleDays = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentCycleDays = Math.ceil((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilNextCycle = Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Migration override logic (matching the backend implementation)
    const TEMP_MIGRATION_OVERRIDE = true;
    const MIGRATION_WINDOW_DAYS = 10;
    
    const normalCanQueue = currentCycleDays >= 20 && daysUntilNextCycle > 0;
    const migrationCanQueue = TEMP_MIGRATION_OVERRIDE && (
      Math.abs(daysUntilNextCycle) <= MIGRATION_WINDOW_DAYS || 
      Math.abs(daysUntilNextCycle - 30) <= MIGRATION_WINDOW_DAYS ||
      Math.abs(currentCycleDays - 20) <= MIGRATION_WINDOW_DAYS
    );
    
    const canQueueToys = normalCanQueue || migrationCanQueue;
    const hasExistingQueue = currentCycle.next_cycle_toys_selected || false;

    console.log(`📊 Cycle Analysis:`);
    console.log(`   Current Day: ${currentCycleDays} of ${totalCycleDays}`);
    console.log(`   Days Until Next: ${daysUntilNextCycle}`);
    console.log(`   Normal Can Queue: ${normalCanQueue}`);
    console.log(`   Migration Can Queue: ${migrationCanQueue}`);
    console.log(`   Final Can Queue: ${canQueueToys && !hasExistingQueue}`);
    console.log(`   Has Existing Queue: ${hasExistingQueue}`);
    
    // Determine expected UI
    let expectedUI = 'gray';
    if (hasExistingQueue) {
      expectedUI = 'green';
    } else if (canQueueToys) {
      expectedUI = migrationCanQueue && !normalCanQueue ? 'orange' : 'yellow';
    }
    
    console.log(`🎨 Expected UI: ${expectedUI}`);
    console.log(`✅ Test Result: ${expectedUI === expectedResult ? 'PASS' : 'FAIL'}`);
    
    return expectedUI === expectedResult;

  } catch (error) {
    console.error(`❌ Error testing ${phone}: ${error.message}`);
    return false;
  }
}

async function verifyTestSetup() {
  console.log('🔍 MIGRATION OVERRIDE TEST VERIFICATION');
  console.log('======================================');
  console.log('Verifying that test users will trigger the correct migration override behavior...\n');

  try {
    // Get all test users
    const { data: testUsers, error: usersError } = await supabase
      .from('custom_users')
      .select('id, phone, first_name, last_name')
      .like('phone', '9999000%')
      .order('phone');

    if (usersError) {
      console.error(`❌ Error fetching test users: ${usersError.message}`);
      return;
    }

    if (!testUsers || testUsers.length === 0) {
      console.log('❌ No test users found! Run create-migration-test-users.js first.');
      return;
    }

    console.log(`Found ${testUsers.length} test users to verify:\n`);

    // Expected results for each test user
    const expectedResults = {
      '9999000001': 'orange', // Early cycle (day 5) - migration access
      '9999000002': 'yellow', // Normal window (day 25) - normal access
      '9999000003': 'orange', // Late cycle (day 28) - migration access
      '9999000004': 'orange', // Mid cycle (day 15) - migration access
      '9999000005': 'orange', // Very early (day 2) - migration access
      '9999000006': 'green',  // Already queued (day 22) - edit option
    };

    let passCount = 0;
    let totalCount = 0;

    // Test each user
    for (const user of testUsers) {
      const expectedResult = expectedResults[user.phone];
      if (expectedResult) {
        totalCount++;
        const passed = await checkMigrationLogic(user.id, user.phone, expectedResult);
        if (passed) passCount++;
      }
    }

    console.log(`\n📊 VERIFICATION SUMMARY:`);
    console.log(`✅ Tests Passed: ${passCount}/${totalCount}`);
    
    if (passCount === totalCount) {
      console.log('🎉 All test users are configured correctly!');
      console.log('\n🚀 Ready to test migration override feature:');
      console.log('1. Login with any of the test phone numbers (9999000001-9999000006)');
      console.log('2. Use OTP: 123456 (development mode)');
      console.log('3. Check dashboard for expected UI colors');
    } else {
      console.log('⚠️  Some test users may not behave as expected.');
      console.log('Check the individual test results above.');
    }

  } catch (error) {
    console.error(`💥 Verification error: ${error.message}`);
  }
}

verifyTestSetup();

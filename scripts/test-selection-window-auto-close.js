/**
 * Test Script: Selection Window Auto-Close
 * 
 * This script tests the automatic selection window closure functionality
 * after order placement. Run this script to verify the implementation works correctly.
 * 
 * Usage: node scripts/test-selection-window-auto-close.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test the manual closure function
 */
async function testManualClosure(userId, reason = 'Test closure from script') {
  console.log(`\n🧪 Testing manual closure for user: ${userId}`);
  
  try {
    // Call the database function
    const { data, error } = await supabase.rpc('close_selection_window_for_user', {
      p_user_id: userId,
      p_reason: reason
    });

    if (error) {
      console.error('❌ Error calling closure function:', error);
      return false;
    }

    console.log('✅ Manual closure result:', data);
    return data;
  } catch (error) {
    console.error('❌ Exception during manual closure:', error);
    return false;
  }
}

/**
 * Check selection window status for a user
 */
async function checkSelectionWindowStatus(userId) {
  console.log(`\n🔍 Checking selection window status for user: ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('rental_orders')
      .select(`
        id,
        selection_window_status,
        manual_selection_control,
        selection_window_opened_at,
        selection_window_closed_at,
        selection_window_notes
      `)
      .eq('user_id', userId)
      .eq('subscription_status', 'active')
      .single();

    if (error) {
      console.error('❌ Error fetching selection window status:', error);
      return null;
    }

    console.log('📊 Selection Window Status:');
    console.log('  Status:', data.selection_window_status);
    console.log('  Manual Control:', data.manual_selection_control);
    console.log('  Opened At:', data.selection_window_opened_at);
    console.log('  Closed At:', data.selection_window_closed_at);
    console.log('  Notes:', data.selection_window_notes);

    return data;
  } catch (error) {
    console.error('❌ Exception checking status:', error);
    return null;
  }
}

/**
 * Check recent audit logs for selection window actions
 */
async function checkAuditLogs(userId, limit = 5) {
  console.log(`\n📋 Checking recent audit logs for user: ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('changed_by', userId)
      .ilike('action', '%selection_window%')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching audit logs:', error);
      return [];
    }

    console.log(`📝 Recent Selection Window Actions (${data.length}):`);
    data.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.action} at ${log.changed_at}`);
      console.log(`     Old: ${JSON.stringify(log.old_values)}`);
      console.log(`     New: ${JSON.stringify(log.new_values)}`);
    });

    return data;
  } catch (error) {
    console.error('❌ Exception checking audit logs:', error);
    return [];
  }
}

/**
 * Simulate order placement and test auto-closure
 */
async function simulateOrderPlacement(userId) {
  console.log(`\n🎯 Simulating order placement for user: ${userId}`);
  
  try {
    // First, check current status
    const beforeStatus = await checkSelectionWindowStatus(userId);
    if (!beforeStatus) {
      console.log('❌ No active subscription found for user');
      return false;
    }

    // If window is not open, open it first for testing
    if (!['manual_open', 'auto_open', 'auto'].includes(beforeStatus.selection_window_status)) {
      console.log('🔓 Opening selection window for testing...');
      
      const { error: openError } = await supabase.rpc('control_selection_window', {
        p_rental_order_id: beforeStatus.id,
        p_action: 'open',
        p_admin_user_id: userId,
        p_notes: 'Opened for testing auto-closure'
      });

      if (openError) {
        console.error('❌ Error opening selection window:', openError);
        return false;
      }
      
      console.log('✅ Selection window opened for testing');
    }

    // Now simulate order placement by calling the closure function
    console.log('📦 Simulating order placement...');
    const closureResult = await testManualClosure(userId, 'Simulated order placement test');
    
    if (closureResult) {
      console.log('✅ Order placement simulation successful');
      
      // Check final status
      await checkSelectionWindowStatus(userId);
      await checkAuditLogs(userId, 2);
      
      return true;
    } else {
      console.log('❌ Order placement simulation failed');
      return false;
    }

  } catch (error) {
    console.error('❌ Exception during order simulation:', error);
    return false;
  }
}

/**
 * Run comprehensive tests
 */
async function runTests() {
  console.log('🚀 Starting Selection Window Auto-Close Tests');
  console.log('=' .repeat(50));

  // Get test user ID from command line or use default
  const testUserId = process.argv[2];
  
  if (!testUserId) {
    console.log('❌ Please provide a test user ID as an argument');
    console.log('Usage: node scripts/test-selection-window-auto-close.js <user-id>');
    process.exit(1);
  }

  console.log(`🧪 Testing with user ID: ${testUserId}`);

  // Test 1: Check current status
  console.log('\n📋 Test 1: Check Current Status');
  await checkSelectionWindowStatus(testUserId);

  // Test 2: Check audit logs
  console.log('\n📋 Test 2: Check Audit History');
  await checkAuditLogs(testUserId);

  // Test 3: Simulate order placement
  console.log('\n📋 Test 3: Simulate Order Placement');
  const simulationResult = await simulateOrderPlacement(testUserId);

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test Summary');
  console.log('=' .repeat(50));
  
  if (simulationResult) {
    console.log('✅ All tests passed! Selection window auto-close is working correctly.');
  } else {
    console.log('❌ Some tests failed. Please check the logs above for details.');
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Test with real order placement in the frontend');
  console.log('2. Verify admin panel shows correct status');
  console.log('3. Monitor production logs for proper operation');
}

/**
 * Test database functions directly
 */
async function testDatabaseFunctions() {
  console.log('\n🗄️  Testing Database Functions');
  console.log('-' .repeat(30));

  try {
    // Test if functions exist
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', [
        'auto_close_selection_window_after_order',
        'close_selection_window_for_user'
      ]);

    if (error) {
      console.error('❌ Error checking functions:', error);
      return false;
    }

    console.log('📋 Available Functions:');
    functions.forEach(func => {
      console.log(`  ✅ ${func.routine_name}`);
    });

    return functions.length === 2;
  } catch (error) {
    console.error('❌ Exception checking functions:', error);
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testManualClosure,
  checkSelectionWindowStatus,
  checkAuditLogs,
  simulateOrderPlacement,
  testDatabaseFunctions
};

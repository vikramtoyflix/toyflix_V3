/**
 * Test Script: Bulk Close Selection Windows
 * 
 * This script tests the bulk close selection windows functionality
 * in the admin panel. Run this script to verify the implementation works correctly.
 * 
 * Usage: node scripts/test-bulk-close-selection-windows.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test getting count of manual selection windows
 */
async function testGetManualWindowsCount() {
  console.log('\n🔍 Testing manual selection windows count...');
  
  try {
    const { data, error } = await supabase.rpc('get_manual_selection_windows_count');

    if (error) {
      console.error('❌ Error getting manual windows count:', error);
      return null;
    }

    const result = data?.[0] || { total_manual_open: 0, user_details: [] };
    
    console.log('📊 Manual Selection Windows Count:');
    console.log(`  Total: ${result.total_manual_open}`);
    
    if (result.user_details && result.user_details.length > 0) {
      console.log('  Details:');
      result.user_details.forEach((window, index) => {
        console.log(`    ${index + 1}. ${window.user_name} (${window.user_phone})`);
        console.log(`       Order: ${window.order_number} | Plan: ${window.subscription_plan}`);
        console.log(`       Cycle Day: ${window.cycle_day} | Opened: ${window.opened_at}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Exception getting manual windows count:', error);
    return null;
  }
}

/**
 * Test opening a selection window for testing
 */
async function testOpenSelectionWindow(rentalOrderId, adminUserId) {
  console.log(`\n🔓 Opening selection window for testing: ${rentalOrderId}`);
  
  try {
    const { data, error } = await supabase.rpc('control_selection_window', {
      p_rental_order_id: rentalOrderId,
      p_action: 'open',
      p_admin_user_id: adminUserId,
      p_notes: 'Opened for bulk close testing'
    });

    if (error) {
      console.error('❌ Error opening selection window:', error);
      return false;
    }

    console.log('✅ Selection window opened successfully');
    return true;
  } catch (error) {
    console.error('❌ Exception opening selection window:', error);
    return false;
  }
}

/**
 * Test bulk closing all manual selection windows
 */
async function testBulkCloseWindows(adminUserId, reason = 'Test bulk closure') {
  console.log('\n🔒 Testing bulk close of all manual selection windows...');
  
  try {
    const { data, error } = await supabase.rpc('close_all_manual_selection_windows', {
      p_admin_user_id: adminUserId,
      p_reason: reason
    });

    if (error) {
      console.error('❌ Error during bulk close:', error);
      return null;
    }

    const result = data?.[0] || { closed_count: 0, affected_users: [], details: [] };
    
    console.log('📊 Bulk Close Results:');
    console.log(`  Closed Count: ${result.closed_count}`);
    console.log(`  Affected Users: ${result.affected_users?.length || 0}`);
    
    if (result.details && result.details.length > 0) {
      console.log('  Details:');
      result.details.forEach((detail, index) => {
        console.log(`    ${index + 1}. Order: ${detail.order_number}`);
        console.log(`       User: ${detail.user_id}`);
        console.log(`       Closed At: ${detail.closed_at}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Exception during bulk close:', error);
    return null;
  }
}

/**
 * Test closing specific rental order selection window
 */
async function testCloseSpecificWindow(rentalOrderId, adminUserId, reason = 'Test specific closure') {
  console.log(`\n🔒 Testing specific window closure: ${rentalOrderId}`);
  
  try {
    const { data, error } = await supabase.rpc('close_selection_window_by_rental_order', {
      p_rental_order_id: rentalOrderId,
      p_admin_user_id: adminUserId,
      p_reason: reason
    });

    if (error) {
      console.error('❌ Error closing specific window:', error);
      return false;
    }

    console.log('✅ Specific window closed successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Exception closing specific window:', error);
    return false;
  }
}

/**
 * Get a sample rental order for testing
 */
async function getSampleRentalOrder() {
  console.log('\n🔍 Finding sample rental order for testing...');
  
  try {
    const { data, error } = await supabase
      .from('rental_orders')
      .select('id, user_id, order_number, selection_window_status, manual_selection_control')
      .eq('subscription_status', 'active')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error finding sample rental order:', error);
      return null;
    }

    console.log('📋 Sample Rental Order:');
    console.log(`  ID: ${data.id}`);
    console.log(`  User ID: ${data.user_id}`);
    console.log(`  Order Number: ${data.order_number}`);
    console.log(`  Window Status: ${data.selection_window_status}`);
    console.log(`  Manual Control: ${data.manual_selection_control}`);

    return data;
  } catch (error) {
    console.error('❌ Exception finding sample rental order:', error);
    return null;
  }
}

/**
 * Check audit logs for bulk close actions
 */
async function checkBulkCloseAuditLogs(limit = 5) {
  console.log('\n📋 Checking recent bulk close audit logs...');
  
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .in('action', ['selection_window_bulk_close', 'selection_window_manual_close'])
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching audit logs:', error);
      return [];
    }

    console.log(`📝 Recent Bulk Close Actions (${data.length}):`);
    data.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.action} at ${log.changed_at}`);
      console.log(`     Record: ${log.record_id}`);
      console.log(`     Changed By: ${log.changed_by}`);
      if (log.new_values?.reason) {
        console.log(`     Reason: ${log.new_values.reason}`);
      }
    });

    return data;
  } catch (error) {
    console.error('❌ Exception checking audit logs:', error);
    return [];
  }
}

/**
 * Run comprehensive tests
 */
async function runTests() {
  console.log('🚀 Starting Bulk Close Selection Windows Tests');
  console.log('=' .repeat(60));

  // Get test admin user ID from command line or use default
  const testAdminUserId = process.argv[2];
  
  if (!testAdminUserId) {
    console.log('❌ Please provide a test admin user ID as an argument');
    console.log('Usage: node scripts/test-bulk-close-selection-windows.js <admin-user-id>');
    process.exit(1);
  }

  console.log(`🧪 Testing with admin user ID: ${testAdminUserId}`);

  // Test 1: Check current manual windows count
  console.log('\n📋 Test 1: Check Current Manual Windows Count');
  const initialCount = await testGetManualWindowsCount();

  // Test 2: Get sample rental order
  console.log('\n📋 Test 2: Get Sample Rental Order');
  const sampleOrder = await getSampleRentalOrder();
  
  if (!sampleOrder) {
    console.log('❌ No rental orders found for testing');
    return;
  }

  // Test 3: Open a selection window for testing (if not already open)
  console.log('\n📋 Test 3: Open Selection Window for Testing');
  if (sampleOrder.selection_window_status !== 'manual_open') {
    await testOpenSelectionWindow(sampleOrder.id, testAdminUserId);
  } else {
    console.log('✅ Selection window already manually open');
  }

  // Test 4: Check count after opening
  console.log('\n📋 Test 4: Check Count After Opening');
  const afterOpenCount = await testGetManualWindowsCount();

  // Test 5: Test specific window closure
  console.log('\n📋 Test 5: Test Specific Window Closure');
  const specificCloseResult = await testCloseSpecificWindow(
    sampleOrder.id, 
    testAdminUserId, 
    'Test specific closure from script'
  );

  // Test 6: Open window again for bulk test
  console.log('\n📋 Test 6: Open Window Again for Bulk Test');
  await testOpenSelectionWindow(sampleOrder.id, testAdminUserId);

  // Test 7: Test bulk closure
  console.log('\n📋 Test 7: Test Bulk Closure');
  const bulkCloseResult = await testBulkCloseWindows(
    testAdminUserId, 
    'Test bulk closure from script'
  );

  // Test 8: Check final count
  console.log('\n📋 Test 8: Check Final Count');
  const finalCount = await testGetManualWindowsCount();

  // Test 9: Check audit logs
  console.log('\n📋 Test 9: Check Audit Logs');
  await checkBulkCloseAuditLogs(10);

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test Summary');
  console.log('=' .repeat(60));
  
  console.log(`📊 Initial Manual Windows: ${initialCount?.total_manual_open || 0}`);
  console.log(`📊 After Opening: ${afterOpenCount?.total_manual_open || 0}`);
  console.log(`📊 Final Count: ${finalCount?.total_manual_open || 0}`);
  
  if (bulkCloseResult) {
    console.log(`✅ Bulk Close Success: ${bulkCloseResult.closed_count} windows closed`);
  }
  
  if (specificCloseResult) {
    console.log('✅ Specific Close Success');
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Test the admin panel UI components');
  console.log('2. Verify bulk close button functionality');
  console.log('3. Test individual quick close buttons');
  console.log('4. Monitor production logs for proper operation');
}

/**
 * Test database functions directly
 */
async function testDatabaseFunctions() {
  console.log('\n🗄️  Testing Database Functions');
  console.log('-' .repeat(40));

  try {
    // Test if functions exist
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', [
        'close_all_manual_selection_windows',
        'get_manual_selection_windows_count',
        'close_selection_window_by_rental_order'
      ]);

    if (error) {
      console.error('❌ Error checking functions:', error);
      return false;
    }

    console.log('📋 Available Functions:');
    functions.forEach(func => {
      console.log(`  ✅ ${func.routine_name}`);
    });

    return functions.length === 3;
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
  testGetManualWindowsCount,
  testBulkCloseWindows,
  testCloseSpecificWindow,
  testOpenSelectionWindow,
  checkBulkCloseAuditLogs,
  testDatabaseFunctions
};

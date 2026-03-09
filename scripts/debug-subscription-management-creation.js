#!/usr/bin/env node

/**
 * Debug Subscription Management Creation
 *
 * This script debugs why subscription_management entries are not being created
 * during order creation by tracing the execution flow
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugSubscriptionManagementCreation() {
  console.log('🔍 Debugging Subscription Management Creation...\n');

  try {
    // Step 1: Check if subscription_management table exists and is accessible
    console.log('📊 Step 1: Checking subscription_management table accessibility...\n');

    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('subscription_management')
        .select('count', { count: 'exact', head: true });

      if (tableError) {
        console.error('❌ subscription_management table access error:', tableError);
        console.log('   This could be a permissions issue or table doesn\'t exist');
        return;
      } else {
        console.log('✅ subscription_management table is accessible');
        console.log(`   Current record count: ${tableCheck}`);
      }
    } catch (accessError) {
      console.error('❌ Cannot access subscription_management table:', accessError);
      return;
    }

    // Step 2: Test subscription_management insertion with sample data
    console.log('\n📊 Step 2: Testing subscription_management insertion...\n');

    // Get a sample rental_order to use as reference
    const { data: sampleOrder, error: sampleError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('order_type', 'subscription')
      .limit(1)
      .single();

    if (sampleError || !sampleOrder) {
      console.error('❌ No sample subscription order found for testing');
      return;
    }

    console.log('📋 Using sample order for testing:');
    console.log(`   Order ID: ${sampleOrder.id}`);
    console.log(`   Order Number: ${sampleOrder.order_number}`);
    console.log(`   User ID: ${sampleOrder.user_id}`);
    console.log(`   Created: ${sampleOrder.created_at}`);
    console.log('');

    // Create test subscription_management data (similar to what createNewSubscription does)
    const testSubscriptionManagementData = {
      user_id: sampleOrder.user_id,
      order_id: sampleOrder.id,
      subscription_id: sampleOrder.id,
      cycle_number: 1,
      cycle_status: 'active',
      cycle_start_date: sampleOrder.rental_start_date || new Date().toISOString().split('T')[0],
      cycle_end_date: sampleOrder.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selection_window_start: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selection_window_end: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selection_window_status: 'upcoming',
      selected_toys: [],
      toys_selected_at: null,
      toys_count: 0,
      total_toy_value: 0.00,
      delivery_status: 'pending',
      plan_id: sampleOrder.subscription_plan,
      plan_name: sampleOrder.subscription_plan,
      plan_details: {
        age_group: sampleOrder.age_group,
        subscription_category: 'standard',
        total_amount: sampleOrder.total_amount
      },
      manual_override: false,
      created_by: sampleOrder.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔧 Attempting to insert test subscription_management entry...');
    console.log('   Data to insert:', JSON.stringify(testSubscriptionManagementData, null, 2));

    const { data: insertResult, error: insertError } = await supabase
      .from('subscription_management')
      .insert(testSubscriptionManagementData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Test insertion failed:', insertError);
      console.log('\n🔍 Analyzing the error:');

      // Analyze specific error types
      if (insertError.message.includes('permission denied')) {
        console.log('   🎯 PERMISSION ISSUE: RLS policy blocking insertion');
        console.log('   Solution: Check RLS policies on subscription_management table');
      } else if (insertError.message.includes('violates not-null constraint')) {
        console.log('   🎯 NULL CONSTRAINT VIOLATION: Required field is null');
        console.log('   Solution: Check which field is required but missing');
      } else if (insertError.message.includes('violates foreign key constraint')) {
        console.log('   🎯 FOREIGN KEY VIOLATION: Referenced record doesn\'t exist');
        console.log('   Solution: Check foreign key relationships');
      } else if (insertError.message.includes('duplicate key value')) {
        console.log('   🎯 DUPLICATE KEY: Record already exists');
        console.log('   Solution: Check for existing records');
      } else {
        console.log('   🎯 UNKNOWN ERROR: Check database logs for more details');
      }

      // Try to identify which field might be causing issues
      console.log('\n🔍 Checking individual fields:');

      // Test with minimal required fields only
      const minimalData = {
        user_id: sampleOrder.user_id,
        order_id: sampleOrder.id,
        cycle_number: 1,
        cycle_status: 'active'
      };

      console.log('   Testing with minimal fields:', JSON.stringify(minimalData, null, 2));

      const { error: minimalError } = await supabase
        .from('subscription_management')
        .insert(minimalData);

      if (minimalError) {
        console.error('   ❌ Even minimal insertion failed:', minimalError);
      } else {
        console.log('   ✅ Minimal insertion succeeded - issue is with optional fields');
      }

    } else {
      console.log('✅ Test insertion succeeded!');
      console.log('   Inserted record:', JSON.stringify(insertResult, null, 2));

      // Clean up the test record
      const { error: deleteError } = await supabase
        .from('subscription_management')
        .delete()
        .eq('id', insertResult.id);

      if (deleteError) {
        console.warn('⚠️ Could not clean up test record:', deleteError);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }

    // Step 3: Check RLS policies
    console.log('\n📊 Step 3: Checking RLS policies...\n');

    // Try to get RLS policy information (this might not work with anon key)
    console.log('🔍 RLS Policy Analysis:');
    console.log('   - subscription_management table likely has RLS enabled');
    console.log('   - Insert operations may be restricted by policy');
    console.log('   - Check if the service role key is being used in production');
    console.log('   - Verify user authentication context during insertion');

    // Step 4: Check for existing records that might conflict
    console.log('\n📊 Step 4: Checking for existing records...\n');

    const { data: existingRecords, error: existingError } = await supabase
      .from('subscription_management')
      .select('*')
      .eq('order_id', sampleOrder.id);

    if (existingError) {
      console.error('❌ Error checking existing records:', existingError);
    } else {
      console.log(`   Found ${existingRecords?.length || 0} existing records for order ${sampleOrder.id}`);
      if (existingRecords && existingRecords.length > 0) {
        console.log('   Existing records:');
        existingRecords.forEach(record => {
          console.log(`     - ID: ${record.id}, Cycle: ${record.cycle_number}, Status: ${record.cycle_status}`);
        });
      }
    }

    // Step 5: Check table schema
    console.log('\n📊 Step 5: Checking table schema...\n');

    // This query might not work with anon key, but let's try
    try {
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('get_table_schema', { table_name: 'subscription_management' });

      if (schemaError) {
        console.log('⚠️ Could not get schema info (expected with anon key)');
        console.log('   Manual schema check needed in database');
      } else {
        console.log('✅ Schema info retrieved');
        console.log(schemaInfo);
      }
    } catch (schemaError) {
      console.log('⚠️ Schema check failed (expected with anon key)');
    }

    // Step 6: Recommendations
    console.log('\n💡 RECOMMENDATIONS:\n');

    console.log('🔧 IMMEDIATE DEBUGGING STEPS:');
    console.log('1. Check application logs for subscription_management insertion errors');
    console.log('2. Verify if service role key is being used instead of anon key');
    console.log('3. Check RLS policies on subscription_management table');
    console.log('4. Add detailed error logging to createNewSubscription method');
    console.log('');

    console.log('🔍 DATABASE INVESTIGATION:');
    console.log('1. Check PostgreSQL logs for insertion errors');
    console.log('2. Verify foreign key constraints are satisfied');
    console.log('3. Check if all NOT NULL fields are being provided');
    console.log('4. Test insertion with database admin privileges');
    console.log('');

    console.log('🛠️ CODE FIXES:');
    console.log('1. Add try-catch around subscription_management insertion');
    console.log('2. Log detailed error information for debugging');
    console.log('3. Add validation before insertion');
    console.log('4. Consider using service role for this operation');

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug
debugSubscriptionManagementCreation().then(() => {
  console.log('\n✅ Subscription Management Creation Debug completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Debug Subscription Management Foreign Key Issue
 *
 * This script debugs the foreign key constraint issue between
 * subscription_management and subscriptions tables
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugSubscriptionManagementForeignKey() {
  console.log('🔍 Debugging Subscription Management Foreign Key Issue...\n');

  try {
    // Step 1: Check if subscriptions table exists and has data
    console.log('📊 Step 1: Checking subscriptions table...\n');

    try {
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_id, status')
        .limit(5);

      if (subscriptionsError) {
        console.error('❌ subscriptions table access error:', subscriptionsError);
        console.log('   This could mean the table doesn\'t exist or has permission issues');
        return;
      } else {
        console.log('✅ subscriptions table is accessible');
        console.log(`   Found ${subscriptionsData?.length || 0} subscription records`);
        if (subscriptionsData && subscriptionsData.length > 0) {
          console.log('   Sample subscriptions:');
          subscriptionsData.forEach(sub => {
            console.log(`     - ID: ${sub.id}, User: ${sub.user_id}, Plan: ${sub.plan_id}, Status: ${sub.status}`);
          });
        }
        console.log('');
      }
    } catch (accessError) {
      console.error('❌ Cannot access subscriptions table:', accessError);
      return;
    }

    // Step 2: Get a sample rental_order to test with
    console.log('📊 Step 2: Getting sample rental order...\n');

    const { data: sampleOrder, error: sampleError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('order_type', 'subscription')
      .limit(1)
      .single();

    if (sampleError || !sampleOrder) {
      console.error('❌ No sample subscription order found');
      return;
    }

    console.log('📋 Sample order for testing:');
    console.log(`   Order ID: ${sampleOrder.id}`);
    console.log(`   Order Number: ${sampleOrder.order_number}`);
    console.log(`   User ID: ${sampleOrder.user_id}`);
    console.log(`   Subscription ID: ${sampleOrder.subscription_id || 'NULL'}`);
    console.log('');

    // Step 3: Check if there's a corresponding subscription record
    console.log('📊 Step 3: Checking for corresponding subscription record...\n');

    if (sampleOrder.subscription_id) {
      const { data: subscriptionRecord, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', sampleOrder.subscription_id)
        .single();

      if (subError || !subscriptionRecord) {
        console.error('❌ No subscription record found for subscription_id:', sampleOrder.subscription_id);
        console.log('   This is the foreign key constraint violation!');
      } else {
        console.log('✅ Found corresponding subscription record:');
        console.log(`   Subscription ID: ${subscriptionRecord.id}`);
        console.log(`   User ID: ${subscriptionRecord.user_id}`);
        console.log(`   Plan ID: ${subscriptionRecord.plan_id}`);
        console.log(`   Status: ${subscriptionRecord.status}`);
      }
    } else {
      console.log('⚠️  Order has no subscription_id (NULL)');
      console.log('   This means the order was created without a proper subscription record');
    }
    console.log('');

    // Step 4: Test the problematic insertion (what unifiedOrderService does)
    console.log('📊 Step 4: Testing the problematic insertion...\n');

    // This is what unifiedOrderService.createNewSubscription() tries to do:
    const problematicData = {
      user_id: sampleOrder.user_id,
      order_id: sampleOrder.id,
      subscription_id: sampleOrder.id, // ❌ PROBLEM: Using order_id as subscription_id
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

    console.log('🔧 Attempting problematic insertion (using order_id as subscription_id):');
    console.log('   subscription_id:', problematicData.subscription_id);
    console.log('   order_id:', problematicData.order_id);

    const { data: problematicResult, error: problematicError } = await supabase
      .from('subscription_management')
      .insert(problematicData)
      .select()
      .single();

    if (problematicError) {
      console.error('❌ Problematic insertion failed (as expected):', problematicError.message);

      // Analyze the specific error
      if (problematicError.message.includes('violates foreign key constraint')) {
        console.log('\n🎯 CONFIRMED: Foreign key constraint violation!');
        console.log('   The subscription_id does not exist in the subscriptions table');
        console.log('   This is exactly why subscription_management entries are not being created');
      } else if (problematicError.message.includes('permission denied')) {
        console.log('\n🎯 PERMISSION ISSUE: Not a foreign key problem');
        console.log('   Check RLS policies or use service role key');
      } else {
        console.log('\n🎯 OTHER ERROR:', problematicError.message);
      }
    } else {
      console.log('✅ Problematic insertion succeeded (unexpected!)');
      console.log('   This means the foreign key constraint might not be enforced');

      // Clean up the test record
      const { error: deleteError } = await supabase
        .from('subscription_management')
        .delete()
        .eq('id', problematicResult.id);

      if (deleteError) {
        console.warn('⚠️ Could not clean up test record:', deleteError);
      }
    }

    // Step 5: Test the correct approach
    console.log('\n📊 Step 5: Testing the correct approach...\n');

    // First, we need to create a proper subscription record
    console.log('🔧 Step 5.1: Creating a proper subscription record...');

    const subscriptionData = {
      user_id: sampleOrder.user_id,
      plan_id: sampleOrder.subscription_plan,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      pause_balance: 0,
      auto_renew: true
    };

    const { data: newSubscription, error: newSubError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (newSubError) {
      console.error('❌ Could not create subscription record:', newSubError);
      console.log('   This suggests the subscriptions table has issues too');
      return;
    }

    console.log('✅ Created subscription record with ID:', newSubscription.id);

    // Now test the correct subscription_management insertion
    console.log('\n🔧 Step 5.2: Testing correct subscription_management insertion...');

    const correctData = {
      ...problematicData,
      subscription_id: newSubscription.id, // ✅ CORRECT: Use actual subscription ID
    };

    const { data: correctResult, error: correctError } = await supabase
      .from('subscription_management')
      .insert(correctData)
      .select()
      .single();

    if (correctError) {
      console.error('❌ Correct insertion also failed:', correctError);
      console.log('   This suggests other issues beyond the foreign key');
    } else {
      console.log('✅ Correct insertion succeeded!');
      console.log('   subscription_management entry created with ID:', correctResult.id);

      // Clean up test records
      await supabase.from('subscription_management').delete().eq('id', correctResult.id);
      await supabase.from('subscriptions').delete().eq('id', newSubscription.id);

      console.log('✅ Test records cleaned up');
    }

    // Step 6: Provide the solution
    console.log('\n💡 SOLUTION SUMMARY:\n');

    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    console.log('   unifiedOrderService.createNewSubscription() is trying to use order_id');
    console.log('   as subscription_id, but order_id doesn\'t exist in subscriptions table');
    console.log('');

    console.log('🔧 REQUIRED FIXES:');
    console.log('1. Create proper subscription records in subscriptions table first');
    console.log('2. Use the actual subscription_id (not order_id) in subscription_management');
    console.log('3. Update unifiedOrderService.createNewSubscription() method');
    console.log('4. Handle cases where subscription creation fails');
    console.log('');

    console.log('📋 IMPLEMENTATION APPROACH:');
    console.log('1. Modify createNewSubscription() to create subscription record first');
    console.log('2. Use the returned subscription.id as subscription_id in subscription_management');
    console.log('3. Add proper error handling and rollback on failure');
    console.log('4. Update existing orders to have proper subscription relationships');

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run the debug
debugSubscriptionManagementForeignKey().then(() => {
  console.log('\n✅ Subscription Management Foreign Key Debug completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
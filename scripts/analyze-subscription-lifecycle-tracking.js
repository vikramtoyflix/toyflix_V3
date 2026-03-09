#!/usr/bin/env node

/**
 * Analyze Subscription Lifecycle Tracking
 *
 * This script analyzes how subscription lifecycle and customer history
 * is tracked across different tables and services
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Wnd1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeSubscriptionLifecycleTracking() {
  console.log('🔍 Analyzing Subscription Lifecycle Tracking...\n');

  try {
    // Step 1: Analyze subscription_management creation points
    console.log('📊 Step 1: Analyzing subscription_management creation points...\n');

    // Check unifiedOrderService.ts creation
    console.log('🔍 1.1 unifiedOrderService.ts - createNewSubscription:');
    console.log('   - Creates subscription_management entries for new subscriptions');
    console.log('   - Called when: determineOrderContext returns "new_subscription"');
    console.log('   - Fields created: cycle_number=1, cycle_status=active, selection windows');
    console.log('   - Timing: During order creation\n');

    // Check orderService.ts creation
    console.log('🔍 1.2 orderService.ts - createOrder:');
    console.log('   - Creates subscription_management entries for subscription orders');
    console.log('   - Called when: orderType === "subscription"');
    console.log('   - Fields created: cycle tracking, plan details, toy selection');
    console.log('   - Timing: After order insertion\n');

    // Check queueOrderService.ts creation
    console.log('🔍 1.3 queueOrderService.ts - createQueueOrder:');
    console.log('   - Creates next cycle subscription_management entries');
    console.log('   - Called when: Admin creates queue orders for existing subscribers');
    console.log('   - Fields created: cycle_number + 1, next cycle dates');
    console.log('   - Timing: During queue order creation\n');

    // Step 2: Analyze subscription_management update points
    console.log('📊 Step 2: Analyzing subscription_management update points...\n');

    console.log('🔄 2.1 intelligentExchangeService.ts updates:');
    console.log('   - syncExchangeStatusToSubscriptionManagement(): Exchange completion');
    console.log('   - syncExchangeSchedulingToSubscriptionManagement(): Exchange scheduling');
    console.log('   - Updates: delivery_status, toys_count, cycle_status, selection_window_status');
    console.log('   - Timing: Real-time during exchange operations\n');

    console.log('🔄 2.2 cycleIntegrationService.ts updates:');
    console.log('   - updateCycleToys(): Toy selection updates');
    console.log('   - Updates: selected_toys, toys_count, toys_selected_at');
    console.log('   - Timing: When users select toys\n');

    console.log('🔄 2.3 queueOrderService.ts updates:');
    console.log('   - Updates existing subscription_management for next cycle');
    console.log('   - Updates: next cycle data, queue_order_id linkage');
    console.log('   - Timing: During queue order creation\n');

    console.log('🔄 2.4 SQL Automation (cycle_automation.sql):');
    console.log('   - Automated status updates based on dates');
    console.log('   - Updates: cycle_status, selection_window_status');
    console.log('   - Timing: Scheduled/batch operations\n');

    // Step 3: Analyze data flow and relationships
    console.log('📊 Step 3: Analyzing data flow and relationships...\n');

    console.log('🔗 3.1 Primary Tables and Relationships:');
    console.log('   rental_orders (Source of Truth):');
    console.log('   ├── subscription_plan, cycle_number, toys_data');
    console.log('   ├── order_number, created_at, status');
    console.log('   └── Links to: subscription_management(order_id)');
    console.log('');
    console.log('   subscription_management (Cycle Tracking):');
    console.log('   ├── cycle_status, selection_window_status');
    console.log('   ├── selected_toys, toys_count, delivery_status');
    console.log('   ├── cycle_start_date, cycle_end_date');
    console.log('   └── Links to: rental_orders(order_id), toy_exchanges');
    console.log('');
    console.log('   queue_orders (Next Cycle Modifications):');
    console.log('   ├── selectedToys, totalAmount, ageGroup');
    console.log('   ├── queueOrderType, cycleNumber');
    console.log('   └── Links to: subscription_management(queue_order_id)');
    console.log('');
    console.log('   toy_exchanges (Delivery Operations):');
    console.log('   ├── exchange_type, exchange_status');
    console.log('   ├── scheduled_date, actual_exchange_date');
    console.log('   └── Syncs to: subscription_management(delivery_status)');

    // Step 4: Analyze subscription lifecycle stages
    console.log('\n📊 Step 4: Analyzing subscription lifecycle stages...\n');

    console.log('🎯 4.1 Subscription Creation Flow:');
    console.log('   1. User places subscription order');
    console.log('   2. rental_orders entry created');
    console.log('   3. subscription_management entry created (cycle 1)');
    console.log('   4. Selection window opens (days 24-34)');
    console.log('   5. User selects toys → subscription_management updated');
    console.log('   6. Exchange scheduled → toy_exchanges created');
    console.log('   7. Exchange completed → subscription_management synced');
    console.log('');

    console.log('🎯 4.2 Ongoing Subscription Flow:');
    console.log('   1. Cycle ends → cycle_status = completed');
    console.log('   2. Next cycle created in subscription_management');
    console.log('   3. Queue orders can modify next cycle');
    console.log('   4. Selection window opens for next cycle');
    console.log('   5. Process repeats...');
    console.log('');

    console.log('🎯 4.3 Pause/Resume Flow:');
    console.log('   1. User pauses → is_pause_order = true');
    console.log('   2. Exchange created (PICKUP_ONLY)');
    console.log('   3. Toys collected → cycle_status = completed');
    console.log('   4. User resumes → is_resume_order = true');
    console.log('   5. Exchange created (DISPATCH_ONLY)');
    console.log('   6. Toys delivered → cycle_status = active');

    // Step 5: Check current data consistency
    console.log('\n📊 Step 5: Checking current data consistency...\n');

    // Get sample data to analyze
    const { data: sampleOrders, error: sampleError } = await supabase
      .from('rental_orders')
      .select('id, user_id, order_number, subscription_plan, cycle_number, created_at')
      .eq('order_type', 'subscription')
      .limit(5);

    if (sampleError) {
      console.error('❌ Error fetching sample orders:', sampleError);
    } else {
      console.log('📋 Sample Subscription Orders:');
      for (const order of sampleOrders || []) {
        console.log(`   ${order.order_number}: Cycle ${order.cycle_number}, Plan: ${order.subscription_plan}`);

        // Check if subscription_management exists
        const { data: subMgmt, error: subError } = await supabase
          .from('subscription_management')
          .select('id, cycle_status, delivery_status')
          .eq('order_id', order.id)
          .eq('cycle_number', order.cycle_number)
          .single();

        if (subError || !subMgmt) {
          console.log(`      ❌ No subscription_management entry`);
        } else {
          console.log(`      ✅ subscription_management: ${subMgmt.cycle_status}/${subMgmt.delivery_status}`);
        }
      }
    }

    // Step 6: Analyze missing subscription_management entries
    console.log('\n📊 Step 6: Analyzing missing subscription_management entries...\n');

    const { data: ordersWithoutMgmt, error: missingError } = await supabase
      .rpc('get_orders_without_subscription_management');

    if (missingError) {
      console.log('⚠️  RPC function not available, using manual query...');

      // Manual check for orders without subscription_management
      const { data: allOrders, error: allError } = await supabase
        .from('rental_orders')
        .select('id, order_number, created_at')
        .eq('order_type', 'subscription')
        .limit(10);

      if (!allError && allOrders) {
        console.log(`📋 Checking ${allOrders.length} subscription orders for subscription_management entries...`);

        let missingCount = 0;
        for (const order of allOrders) {
          const { data: subMgmt } = await supabase
            .from('subscription_management')
            .select('id')
            .eq('order_id', order.id)
            .limit(1);

          if (!subMgmt || subMgmt.length === 0) {
            missingCount++;
            console.log(`   ❌ ${order.order_number} (${order.created_at.split('T')[0]}) - Missing subscription_management`);
          }
        }

        if (missingCount > 0) {
          console.log(`\n⚠️  Found ${missingCount} orders without subscription_management entries`);
        } else {
          console.log('\n✅ All checked orders have subscription_management entries');
        }
      }
    } else {
      console.log('✅ Found orders without subscription_management:', ordersWithoutMgmt?.length || 0);
    }

    // Step 7: Provide recommendations
    console.log('\n💡 RECOMMENDATIONS FOR SUBSCRIPTION LIFECYCLE TRACKING:\n');

    console.log('🔧 IMMEDIATE FIXES NEEDED:');
    console.log('1. Create missing subscription_management entries for existing orders');
    console.log('2. Ensure all new subscription orders create subscription_management entries');
    console.log('3. Fix synchronization between exchange operations and subscription_management');
    console.log('');

    console.log('🏗️ SYSTEM IMPROVEMENTS:');
    console.log('1. Add database constraints to prevent orders without subscription_management');
    console.log('2. Implement comprehensive audit logging for lifecycle changes');
    console.log('3. Create dashboard for monitoring subscription lifecycle health');
    console.log('4. Add automated cleanup for orphaned subscription_management entries');
    console.log('');

    console.log('📊 MONITORING & ALERTS:');
    console.log('1. Track subscription_management creation success rate');
    console.log('2. Monitor synchronization delays between tables');
    console.log('3. Alert on data inconsistencies');
    console.log('4. Regular health checks for subscription lifecycle data');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeSubscriptionLifecycleTracking().then(() => {
  console.log('\n✅ Subscription Lifecycle Analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
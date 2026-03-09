#!/usr/bin/env node

/**
 * Analyze Order Creation Flow
 *
 * This script analyzes what happens during order creation and identifies
 * which parts of the subscription lifecycle are working vs not working
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeOrderCreationFlow() {
  console.log('🔍 Analyzing Order Creation Flow...\n');

  try {
    // Step 1: Analyze the expected order creation flow
    console.log('📊 Step 1: Expected Order Creation Flow\n');

    console.log('🎯 SUBSCRIPTION ORDER CREATION FLOW:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 1. User/Admin initiates subscription order                  │');
    console.log('│ 2. unifiedOrderService.determineOrderContext()             │');
    console.log('│    ├── Returns: "new_subscription"                          │');
    console.log('│ 3. unifiedOrderService.createOrUpdateOrder()               │');
    console.log('│    ├── Calls: createNewSubscription()                       │');
    console.log('│ 4. rental_orders table entry created                        │');
    console.log('│    ├── order_number: SUB_[timestamp]_[random]               │');
    console.log('│    ├── order_type: "subscription"                           │');
    console.log('│    ├── subscription_status: "active"                        │');
    console.log('│ 5. subscription_management table entry created              │');
    console.log('│    ├── cycle_number: 1                                       │');
    console.log('│    ├── cycle_status: "active"                                │');
    console.log('│    ├── selection_window_status: "upcoming"                   │');
    console.log('│ 6. Selection window scheduled (days 24-34)                  │');
    console.log('│ 7. Order creation complete                                   │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    console.log('🎯 QUEUE ORDER CREATION FLOW (for existing subscribers):');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 1. Admin creates queue order for existing subscriber        │');
    console.log('│ 2. unifiedOrderService.determineOrderContext()             │');
    console.log('│    ├── Returns: "next_cycle"                                │');
    console.log('│ 3. unifiedOrderService.createOrUpdateOrder()               │');
    console.log('│    ├── Calls: createQueueOrder()                            │');
    console.log('│ 4. queue_orders table entry created                         │');
    console.log('│ 5. subscription_management updated for next cycle           │');
    console.log('│    ├── cycle_number: current + 1                            │');
    console.log('│    ├── Links to queue order                                  │');
    console.log('│ 6. Queue order creation complete                             │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // Step 2: Check what actually happens with recent orders
    console.log('📊 Step 2: Analyzing What Actually Happens\n');

    // Get recent orders to analyze
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split('T')[0];

    console.log(`📅 Analyzing orders created since: ${dateString}\n`);

    // Check rental_orders creation
    console.log('🔍 2.1 Checking rental_orders creation:');
    const { data: recentOrders, error: ordersError } = await supabase
      .from('rental_orders')
      .select('*')
      .gte('created_at', dateString)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching recent orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${recentOrders?.length || 0} recent orders`);
    console.log('   Order types breakdown:');

    const orderTypes = {};
    const subscriptionOrders = [];
    const queueOrders = [];

    for (const order of recentOrders || []) {
      orderTypes[order.order_type] = (orderTypes[order.order_type] || 0) + 1;

      if (order.order_type === 'subscription') {
        subscriptionOrders.push(order);
      } else if (order.order_type === 'queue') {
        queueOrders.push(order);
      }
    }

    Object.entries(orderTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} orders`);
    });
    console.log('');

    // Step 3: Analyze subscription orders specifically
    console.log('🔍 2.2 Analyzing subscription orders:');
    console.log(`   Found ${subscriptionOrders.length} subscription orders\n`);

    const workingSteps = [];
    const brokenSteps = [];

    for (const order of subscriptionOrders.slice(0, 3)) { // Analyze first 3
      console.log(`📋 Analyzing order: ${order.order_number}`);
      console.log(`   Created: ${order.created_at}`);
      console.log(`   Type: ${order.order_type}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Subscription Status: ${order.subscription_status}`);

      // Check Step 4: rental_orders entry
      if (order.id && order.order_number) {
        workingSteps.push(`✅ rental_orders entry created for ${order.order_number}`);
      } else {
        brokenSteps.push(`❌ rental_orders entry incomplete for ${order.order_number}`);
      }

      // Check Step 5: subscription_management entry
      const { data: subMgmt, error: subError } = await supabase
        .from('subscription_management')
        .select('*')
        .eq('order_id', order.id)
        .single();

      if (subError || !subMgmt) {
        brokenSteps.push(`❌ subscription_management entry missing for ${order.order_number}`);
        console.log(`   ❌ subscription_management: MISSING`);
      } else {
        workingSteps.push(`✅ subscription_management entry created for ${order.order_number}`);
        console.log(`   ✅ subscription_management: EXISTS (cycle ${subMgmt.cycle_number}, status: ${subMgmt.cycle_status})`);
      }

      // Check if exchange exists
      if (order.exchange_id) {
        workingSteps.push(`✅ Exchange operation created for ${order.order_number}`);
        console.log(`   ✅ Exchange: EXISTS (${order.exchange_type})`);
      } else {
        console.log(`   ⚠️  Exchange: NOT YET CREATED`);
      }

      console.log('');
    }

    // Step 4: Analyze queue orders
    console.log('🔍 2.3 Analyzing queue orders:');
    console.log(`   Found ${queueOrders.length} queue orders\n`);

    for (const order of queueOrders.slice(0, 2)) { // Analyze first 2
      console.log(`📋 Analyzing queue order: ${order.order_number || 'No order number'}`);
      console.log(`   Created: ${order.created_at}`);
      console.log(`   Type: ${order.order_type}`);

      // Check queue_orders table entry
      const { data: queueEntry, error: queueError } = await supabase
        .from('queue_orders')
        .select('*')
        .eq('rental_order_id', order.id)
        .single();

      if (queueError || !queueEntry) {
        brokenSteps.push(`❌ queue_orders entry missing for rental_order ${order.id}`);
        console.log(`   ❌ queue_orders entry: MISSING`);
      } else {
        workingSteps.push(`✅ queue_orders entry created for ${order.order_number || order.id}`);
        console.log(`   ✅ queue_orders entry: EXISTS`);
      }

      console.log('');
    }

    // Step 5: Summary of working vs broken steps
    console.log('📊 Step 3: WORKING vs BROKEN ANALYSIS\n');

    console.log('✅ WORKING STEPS:');
    workingSteps.forEach(step => console.log(`   ${step}`));
    console.log('');

    console.log('❌ BROKEN STEPS:');
    if (brokenSteps.length === 0) {
      console.log('   🎉 No broken steps found!');
    } else {
      brokenSteps.forEach(step => console.log(`   ${step}`));
    }
    console.log('');

    // Step 6: Root cause analysis
    console.log('🔍 Step 4: ROOT CAUSE ANALYSIS\n');

    if (brokenSteps.some(step => step.includes('subscription_management'))) {
      console.log('🎯 PRIMARY ISSUE IDENTIFIED:');
      console.log('   subscription_management entries are not being created');
      console.log('   This breaks the entire synchronization system');
      console.log('');

      console.log('📋 IMPACT:');
      console.log('   - Exchange operations cannot sync to subscription_management');
      console.log('   - Cycle tracking is incomplete');
      console.log('   - Selection windows cannot be managed properly');
      console.log('   - Customer dashboards show incorrect information');
      console.log('');

      console.log('🔧 ROOT CAUSES:');
      console.log('   1. unifiedOrderService.createNewSubscription() not creating subscription_management');
      console.log('   2. orderService.createOrder() subscription_management creation failing');
      console.log('   3. Database errors during subscription_management insertion');
      console.log('   4. Race conditions in order creation flow');
    }

    if (brokenSteps.some(step => step.includes('queue_orders'))) {
      console.log('🎯 QUEUE ORDER ISSUE:');
      console.log('   queue_orders entries are not being created for queue orders');
      console.log('   This affects admin-created modifications for existing subscribers');
    }

    // Step 7: Recommendations
    console.log('\n💡 RECOMMENDATIONS:\n');

    console.log('🔧 IMMEDIATE FIXES:');
    console.log('1. Fix subscription_management creation in order flow');
    console.log('2. Add error handling and logging to creation process');
    console.log('3. Create missing subscription_management entries for existing orders');
    console.log('4. Fix queue_orders creation for admin queue orders');
    console.log('');

    console.log('📊 MONITORING:');
    console.log('1. Add alerts for failed subscription_management creation');
    console.log('2. Monitor order creation success rates');
    console.log('3. Track synchronization health');
    console.log('');

    console.log('🏗️ PREVENTION:');
    console.log('1. Add database constraints to ensure data consistency');
    console.log('2. Implement comprehensive error handling');
    console.log('3. Add automated data integrity checks');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeOrderCreationFlow().then(() => {
  console.log('\n✅ Order Creation Flow Analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
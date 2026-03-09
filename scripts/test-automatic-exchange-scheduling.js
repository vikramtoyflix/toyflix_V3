#!/usr/bin/env node

/**
 * Test Script: Automatic Exchange Scheduling
 *
 * This script tests the automatic exchange scheduling functionality
 * that was added to the unifiedOrderService.
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAutomaticExchangeScheduling() {
  console.log('🧪 Testing Automatic Exchange Scheduling...\n');

  try {
    // Test 1: Check if recent orders have exchange operations
    console.log('📊 Test 1: Checking recent orders for automatic exchange scheduling...');

    const { data: recentOrders, error: ordersError } = await supabase
      .from('rental_orders')
      .select(`
        id,
        order_number,
        created_at,
        order_type,
        user_id,
        toys_data,
        exchange_id,
        exchange_type,
        exchange_status,
        exchange_scheduled_date
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching recent orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${recentOrders.length} recent orders to analyze`);

    // Analyze each order
    let ordersWithExchanges = 0;
    let ordersWithoutExchanges = 0;
    let ordersWithToys = 0;
    let ordersWithoutToys = 0;

    for (const order of recentOrders) {
      const hasExchange = !!order.exchange_id;
      const hasToys = Array.isArray(order.toys_data) && order.toys_data.length > 0;

      if (hasExchange) ordersWithExchanges++;
      else ordersWithoutExchanges++;

      if (hasToys) ordersWithToys++;
      else ordersWithoutToys++;

      console.log(`   Order ${order.order_number}: ${hasExchange ? '✅' : '❌'} Exchange, ${hasToys ? '✅' : '❌'} Toys`);
    }

    console.log('\n📈 Analysis Results:');
    console.log(`   - Orders with exchanges: ${ordersWithExchanges}/${recentOrders.length}`);
    console.log(`   - Orders without exchanges: ${ordersWithoutExchanges}/${recentOrders.length}`);
    console.log(`   - Orders with toys: ${ordersWithToys}/${recentOrders.length}`);
    console.log(`   - Orders without toys: ${ordersWithoutToys}/${recentOrders.length}`);

    // Test 2: Check exchange operations table
    console.log('\n📊 Test 2: Checking exchange operations table...');

    const { data: exchanges, error: exchangesError } = await supabase
      .from('toy_exchanges')
      .select(`
        id,
        rental_order_id,
        exchange_type,
        exchange_status,
        scheduled_date,
        scheduled_time_slot,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (exchangesError) {
      console.error('❌ Error fetching exchange operations:', exchangesError);
      return;
    }

    console.log(`✅ Found ${exchanges.length} recent exchange operations`);

    // Analyze exchange operations
    const exchangeTypes = {};
    const exchangeStatuses = {};

    for (const exchange of exchanges) {
      exchangeTypes[exchange.exchange_type] = (exchangeTypes[exchange.exchange_type] || 0) + 1;
      exchangeStatuses[exchange.exchange_status] = (exchangeStatuses[exchange.exchange_status] || 0) + 1;

      console.log(`   Exchange ${exchange.id}: ${exchange.exchange_type} - ${exchange.exchange_status} (${exchange.scheduled_date})`);
    }

    console.log('\n📈 Exchange Operations Summary:');
    console.log('   Exchange Types:', exchangeTypes);
    console.log('   Exchange Statuses:', exchangeStatuses);

    // Test 3: Check subscription_management synchronization
    console.log('\n📊 Test 3: Checking subscription_management synchronization...');

    const { data: subscriptionMgmt, error: mgmtError } = await supabase
      .from('subscription_management')
      .select(`
        id,
        order_id,
        delivery_status,
        delivery_scheduled_date,
        toys_selected_at,
        toys_count,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (mgmtError) {
      console.error('❌ Error fetching subscription management:', mgmtError);
      return;
    }

    console.log(`✅ Found ${subscriptionMgmt.length} recent subscription management entries`);

    let syncedEntries = 0;
    let unsyncedEntries = 0;

    for (const entry of subscriptionMgmt) {
      const hasDeliveryInfo = entry.delivery_status && entry.delivery_scheduled_date;
      const hasToyInfo = entry.toys_selected_at && entry.toys_count > 0;

      if (hasDeliveryInfo || hasToyInfo) syncedEntries++;
      else unsyncedEntries++;

      console.log(`   Entry ${entry.id}: ${hasDeliveryInfo ? '✅' : '❌'} Delivery, ${hasToyInfo ? '✅' : '❌'} Toys`);
    }

    console.log('\n📈 Subscription Management Sync Results:');
    console.log(`   - Synced entries: ${syncedEntries}/${subscriptionMgmt.length}`);
    console.log(`   - Unsynced entries: ${unsyncedEntries}/${subscriptionMgmt.length}`);

    // Overall Assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');

    const exchangeSuccessRate = ordersWithExchanges / recentOrders.length;
    const syncSuccessRate = syncedEntries / subscriptionMgmt.length;

    if (exchangeSuccessRate > 0.7 && syncSuccessRate > 0.7) {
      console.log('✅ EXCELLENT: Automatic exchange scheduling is working well!');
      console.log(`   - ${Math.round(exchangeSuccessRate * 100)}% of orders have exchanges`);
      console.log(`   - ${Math.round(syncSuccessRate * 100)}% of subscription management entries are synced`);
    } else if (exchangeSuccessRate > 0.5 || syncSuccessRate > 0.5) {
      console.log('⚠️ GOOD: Automatic exchange scheduling is partially working');
      console.log(`   - ${Math.round(exchangeSuccessRate * 100)}% of orders have exchanges`);
      console.log(`   - ${Math.round(syncSuccessRate * 100)}% of subscription management entries are synced`);
    } else {
      console.log('❌ NEEDS ATTENTION: Automatic exchange scheduling may not be working properly');
      console.log(`   - Only ${Math.round(exchangeSuccessRate * 100)}% of orders have exchanges`);
      console.log(`   - Only ${Math.round(syncSuccessRate * 100)}% of subscription management entries are synced`);
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');

    if (ordersWithoutExchanges > 0) {
      console.log('   - Review orders without exchanges to ensure they should have them');
      console.log('   - Check if the IntelligentExchangeService is being called correctly');
    }

    if (unsyncedEntries > 0) {
      console.log('   - Review subscription_management entries without sync data');
      console.log('   - Ensure exchange completion updates are working properly');
    }

    if (ordersWithoutToys > 0) {
      console.log('   - Review orders without toys - they may be incomplete');
      console.log('   - Check if toy selection is working properly in the order flow');
    }

    console.log('\n✅ Automatic Exchange Scheduling Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAutomaticExchangeScheduling().then(() => {
  console.log('\n✅ Test process completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test process failed:', error);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Test Script: Subscription Management Synchronization
 *
 * This script tests the synchronization between exchange operations and subscription_management table
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionManagementSync() {
  console.log('🧪 Testing Subscription Management Synchronization...\n');

  try {
    // Test 1: Check for synchronization mismatches
    console.log('📊 Test 1: Checking for synchronization mismatches...');

    const { data: mismatches, error: mismatchError } = await supabase
      .rpc('check_subscription_sync_mismatches');

    if (mismatchError) {
      console.log('⚠️  RPC function not available, using manual query...');

      // Manual query to check for mismatches
      const { data: manualMismatches, error: manualError } = await supabase
        .from('subscription_management')
        .select(`
          id,
          order_id,
          delivery_status,
          toys_count,
          cycle_status,
          selection_window_status,
          rental_orders!inner(
            id,
            exchange_status,
            toys_delivered_count,
            toys_returned_count,
            status
          )
        `)
        .neq('delivery_status', 'pending');

      if (manualError) {
        console.error('❌ Error checking mismatches:', manualError);
      } else {
        console.log(`✅ Found ${manualMismatches?.length || 0} subscription_management entries to analyze`);

        // Analyze potential mismatches
        const potentialMismatches = manualMismatches?.filter(entry => {
          const order = entry.rental_orders;
          return entry.delivery_status !== (order?.exchange_status || 'pending') ||
                 entry.toys_count !== (order?.toys_delivered_count || 0);
        }) || [];

        console.log(`⚠️  Found ${potentialMismatches.length} potential synchronization issues`);
      }
    } else {
      console.log('✅ Synchronization check completed:', mismatches);
    }

    // Test 2: Verify exchange completion updates subscription_management
    console.log('\n📊 Test 2: Testing exchange completion synchronization...');

    // Get a recent completed exchange
    const { data: recentExchanges, error: exchangeError } = await supabase
      .from('toy_exchanges')
      .select('*')
      .eq('exchange_status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (exchangeError) {
      console.error('❌ Error fetching recent exchanges:', exchangeError);
    } else {
      console.log(`✅ Found ${recentExchanges?.length || 0} recent completed exchanges`);

      for (const exchange of recentExchanges || []) {
        // Check if subscription_management was updated
        const { data: subscriptionMgmt, error: subError } = await supabase
          .from('subscription_management')
          .select('*')
          .eq('order_id', exchange.rental_order_id)
          .eq('cycle_number', exchange.cycle_number)
          .single();

        if (subError || !subscriptionMgmt) {
          console.log(`⚠️  No subscription_management entry for exchange ${exchange.id}`);
        } else {
          const isSynced = subscriptionMgmt.delivery_status === 'delivered' &&
                          subscriptionMgmt.delivery_actual_date === exchange.actual_exchange_date;

          console.log(`🔄 Exchange ${exchange.id}: ${isSynced ? '✅ SYNCED' : '❌ NOT SYNCED'}`);
          if (!isSynced) {
            console.log(`   - Exchange status: ${exchange.exchange_status}`);
            console.log(`   - Subscription delivery_status: ${subscriptionMgmt.delivery_status}`);
            console.log(`   - Exchange date: ${exchange.actual_exchange_date}`);
            console.log(`   - Subscription delivery date: ${subscriptionMgmt.delivery_actual_date}`);
          }
        }
      }
    }

    // Test 3: Check scheduled exchanges
    console.log('\n📊 Test 3: Testing exchange scheduling synchronization...');

    const { data: scheduledExchanges, error: scheduledError } = await supabase
      .from('toy_exchanges')
      .select('*')
      .eq('exchange_status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(3);

    if (scheduledError) {
      console.error('❌ Error fetching scheduled exchanges:', scheduledError);
    } else {
      console.log(`✅ Found ${scheduledExchanges?.length || 0} scheduled exchanges`);

      for (const exchange of scheduledExchanges || []) {
        const { data: subscriptionMgmt, error: subError } = await supabase
          .from('subscription_management')
          .select('*')
          .eq('order_id', exchange.rental_order_id)
          .single();

        if (subError || !subscriptionMgmt) {
          console.log(`⚠️  No subscription_management entry for scheduled exchange ${exchange.id}`);
        } else {
          const isScheduled = subscriptionMgmt.delivery_status === 'scheduled' &&
                             subscriptionMgmt.delivery_scheduled_date === exchange.scheduled_date;

          console.log(`📅 Exchange ${exchange.id}: ${isScheduled ? '✅ SCHEDULED' : '❌ NOT SCHEDULED'}`);
        }
      }
    }

    // Test 4: Performance check
    console.log('\n📊 Test 4: Performance check...');

    const startTime = Date.now();
    const { data: allEntries, error: perfError } = await supabase
      .from('subscription_management')
      .select('id, delivery_status, updated_at')
      .limit(100);

    const endTime = Date.now();
    const queryTime = endTime - startTime;

    if (perfError) {
      console.error('❌ Performance test failed:', perfError);
    } else {
      console.log(`✅ Query performance: ${queryTime}ms for ${allEntries?.length || 0} records`);
      console.log(`📈 Average: ${(queryTime / (allEntries?.length || 1)).toFixed(2)}ms per record`);
    }

    console.log('\n✅ Subscription Management Synchronization Test Completed!');
    console.log('\n💡 Recommendations:');
    console.log('   - Monitor the synchronization logs in production');
    console.log('   - Set up alerts for synchronization failures');
    console.log('   - Regularly audit data consistency between tables');

  } catch (error) {
    console.error('❌ Test script failed:', error);
  }
}

// Run the test
testSubscriptionManagementSync().then(() => {
  console.log('\n✅ Test process completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test process failed:', error);
  process.exit(1);
});
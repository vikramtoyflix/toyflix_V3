#!/usr/bin/env node

/**
 * Analyze Recent Orders Exchange Alignment
 *
 * This script checks recent customer orders and their exchange operations
 * to verify alignment with subscription_management data
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeRecentOrdersExchangeAlignment() {
  console.log('🔍 Analyzing Recent Orders Exchange Alignment...\n');

  try {
    // Get orders from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split('T')[0];

    console.log(`📅 Analyzing orders from ${dateString} onwards...\n`);

    // Step 1: Get recent orders with exchange information
    console.log('📊 Step 1: Fetching recent orders with exchange data...');

    // First get the orders
    const { data: recentOrders, error: ordersError } = await supabase
      .from('rental_orders')
      .select(`
        id,
        user_id,
        order_number,
        subscription_plan,
        cycle_number,
        toys_data,
        toys_delivered_count,
        toys_returned_count,
        exchange_status,
        exchange_scheduled_date,
        exchange_type,
        exchange_id,
        created_at,
        updated_at
      `)
      .gte('created_at', dateString)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching recent orders:', ordersError);
      return;
    }

    // Then get customer data separately
    let customerData = {};
    if (recentOrders && recentOrders.length > 0) {
      const userIds = [...new Set(recentOrders.map(order => order.user_id))];
      const { data: customers, error: customerError } = await supabase
        .from('custom_users')
        .select('id, phone, first_name, last_name')
        .in('id', userIds);

      if (!customerError && customers) {
        customerData = customers.reduce((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
      }
    }

    console.log(`✅ Found ${recentOrders?.length || 0} recent orders\n`);

    // Step 2: Analyze each order for exchange alignment
    console.log('📊 Step 2: Analyzing exchange alignment for each order...\n');

    const analysisResults = {
      totalOrders: recentOrders?.length || 0,
      ordersWithExchanges: 0,
      alignedExchanges: 0,
      misalignedExchanges: 0,
      ordersWithoutSubscriptionMgmt: 0,
      detailedAnalysis: []
    };

    for (const order of recentOrders || []) {
      const customer = customerData[order.user_id] || {};
      const orderAnalysis = {
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        customerPhone: customer.phone,
        subscriptionPlan: order.subscription_plan,
        cycleNumber: order.cycle_number,
        createdAt: order.created_at,
        hasExchange: !!order.exchange_id,
        exchangeStatus: order.exchange_status,
        toysDelivered: order.toys_delivered_count || 0,
        toysReturned: order.toys_returned_count || 0,
        subscriptionMgmtStatus: null,
        alignmentStatus: 'unknown',
        issues: []
      };

      // Check if order has exchange operations
      if (order.exchange_id) {
        analysisResults.ordersWithExchanges++;

        // Get exchange details
        const { data: exchange, error: exchangeError } = await supabase
          .from('toy_exchanges')
          .select('*')
          .eq('id', order.exchange_id)
          .single();

        if (exchangeError) {
          orderAnalysis.issues.push(`Exchange lookup failed: ${exchangeError.message}`);
        } else {
          orderAnalysis.exchangeDetails = {
            type: exchange.exchange_type,
            status: exchange.exchange_status,
            scheduledDate: exchange.scheduled_date,
            actualDate: exchange.actual_exchange_date,
            toysToPickup: exchange.toys_to_pickup?.length || 0,
            toysToDispatch: exchange.toys_to_dispatch?.length || 0
          };
        }

        // Check subscription_management alignment
        const { data: subscriptionMgmt, error: subError } = await supabase
          .from('subscription_management')
          .select('*')
          .eq('order_id', order.id)
          .eq('cycle_number', order.cycle_number)
          .single();

        if (subError || !subscriptionMgmt) {
          orderAnalysis.issues.push('No subscription_management entry found');
          analysisResults.ordersWithoutSubscriptionMgmt++;
          orderAnalysis.alignmentStatus = 'no_subscription_mgmt';
        } else {
          orderAnalysis.subscriptionMgmtStatus = {
            deliveryStatus: subscriptionMgmt.delivery_status,
            toysCount: subscriptionMgmt.toys_count,
            cycleStatus: subscriptionMgmt.cycle_status,
            selectionWindowStatus: subscriptionMgmt.selection_window_status,
            deliveryScheduledDate: subscriptionMgmt.delivery_scheduled_date,
            deliveryActualDate: subscriptionMgmt.delivery_actual_date
          };

          // Check alignment
          let isAligned = true;
          const alignmentIssues = [];

          // Check delivery status alignment
          if (exchange && subscriptionMgmt.delivery_status !== exchange.exchange_status &&
              !(exchange.exchange_status === 'completed' && subscriptionMgmt.delivery_status === 'delivered')) {
            isAligned = false;
            alignmentIssues.push(`Delivery status mismatch: Exchange(${exchange.exchange_status}) vs Subscription(${subscriptionMgmt.delivery_status})`);
          }

          // Check toy count alignment
          if (exchange && exchange.exchange_type === 'EXCHANGE') {
            const expectedToys = (exchange.toys_to_dispatch || []).length;
            if (subscriptionMgmt.toys_count !== expectedToys) {
              isAligned = false;
              alignmentIssues.push(`Toy count mismatch: Expected(${expectedToys}) vs Subscription(${subscriptionMgmt.toys_count})`);
            }
          }

          // Check delivery dates
          if (exchange && exchange.actual_exchange_date && subscriptionMgmt.delivery_actual_date !== exchange.actual_exchange_date) {
            isAligned = false;
            alignmentIssues.push(`Delivery date mismatch: Exchange(${exchange.actual_exchange_date}) vs Subscription(${subscriptionMgmt.delivery_actual_date})`);
          }

          orderAnalysis.alignmentStatus = isAligned ? 'aligned' : 'misaligned';
          orderAnalysis.issues = alignmentIssues;

          if (isAligned) {
            analysisResults.alignedExchanges++;
          } else {
            analysisResults.misalignedExchanges++;
          }
        }
      } else {
        orderAnalysis.alignmentStatus = 'no_exchange';
      }

      analysisResults.detailedAnalysis.push(orderAnalysis);
    }

    // Step 3: Generate summary report
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(50));
    console.log(`📅 Period: ${dateString} to present`);
    console.log(`📦 Total Orders: ${analysisResults.totalOrders}`);
    console.log(`🔄 Orders with Exchanges: ${analysisResults.ordersWithExchanges}`);
    console.log(`✅ Aligned Exchanges: ${analysisResults.alignedExchanges}`);
    console.log(`❌ Misaligned Exchanges: ${analysisResults.misalignedExchanges}`);
    console.log(`⚠️  Orders without Subscription Mgmt: ${analysisResults.ordersWithoutSubscriptionMgmt}`);
    console.log('');

    // Step 4: Show detailed issues
    const misalignedOrders = analysisResults.detailedAnalysis.filter(o => o.alignmentStatus === 'misaligned');
    const ordersWithoutSubMgmt = analysisResults.detailedAnalysis.filter(o => o.alignmentStatus === 'no_subscription_mgmt');

    if (misalignedOrders.length > 0) {
      console.log('❌ MISALIGNED EXCHANGES:');
      console.log('-'.repeat(30));
      misalignedOrders.slice(0, 5).forEach((order, index) => {
        console.log(`${index + 1}. ${order.orderNumber} (${order.customerName})`);
        console.log(`   Issues: ${order.issues.join(', ')}`);
        console.log('');
      });
      if (misalignedOrders.length > 5) {
        console.log(`   ... and ${misalignedOrders.length - 5} more`);
      }
    }

    if (ordersWithoutSubMgmt.length > 0) {
      console.log('⚠️  ORDERS WITHOUT SUBSCRIPTION MANAGEMENT:');
      console.log('-'.repeat(40));
      ordersWithoutSubMgmt.slice(0, 3).forEach((order, index) => {
        console.log(`${index + 1}. ${order.orderNumber} (${order.customerName}) - ${order.createdAt}`);
      });
      if (ordersWithoutSubMgmt.length > 3) {
        console.log(`   ... and ${ordersWithoutSubMgmt.length - 3} more`);
      }
    }

    // Step 5: Success rate calculation
    if (analysisResults.ordersWithExchanges > 0) {
      const successRate = (analysisResults.alignedExchanges / analysisResults.ordersWithExchanges * 100).toFixed(1);
      console.log(`\n🎯 SYNCHRONIZATION SUCCESS RATE: ${successRate}%`);
      console.log(`   (${analysisResults.alignedExchanges}/${analysisResults.ordersWithExchanges} exchanges properly synchronized)`);
    }

    // Step 6: Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(20));

    if (analysisResults.misalignedExchanges > 0) {
      console.log('❌ Address misaligned exchanges immediately');
      console.log('   - Check synchronization logs for errors');
      console.log('   - Verify exchange completion handlers are working');
    }

    if (analysisResults.ordersWithoutSubscriptionMgmt > 0) {
      console.log('⚠️  Create missing subscription_management entries');
      console.log('   - Run migration script for missing entries');
      console.log('   - Ensure all new orders create subscription_management records');
    }

    if (analysisResults.alignedExchanges === analysisResults.ordersWithExchanges) {
      console.log('✅ Synchronization is working perfectly!');
      console.log('   - All exchange operations are properly aligned');
      console.log('   - Continue monitoring for any future issues');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeRecentOrdersExchangeAlignment().then(() => {
  console.log('\n✅ Analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
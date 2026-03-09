#!/usr/bin/env node

/**
 * Create Missing Subscription Management Entries
 *
 * This script creates subscription_management entries for existing subscription orders
 * that are missing them due to the previous bug.
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createMissingSubscriptionManagement() {
  console.log('🔧 Creating Missing Subscription Management Entries...\n');

  try {
    // Step 1: Find all subscription orders missing subscription_management entries
    console.log('📊 Step 1: Finding subscription orders without subscription_management...\n');

    // Only process orders from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: ordersWithoutManagement, error: ordersError } = await supabase
      .from('rental_orders')
      .select(`
        id,
        user_id,
        order_number,
        subscription_plan,
        age_group,
        rental_start_date,
        rental_end_date,
        total_amount,
        subscription_category,
        created_at,
        subscription_id
      `)
      .eq('order_type', 'subscription')
      .is('subscription_id', null) // Orders without subscription_id
      .gte('created_at', threeMonthsAgo.toISOString()) // Only last 3 months
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`📋 Found ${ordersWithoutManagement?.length || 0} subscription orders without subscription_management`);

    if (!ordersWithoutManagement || ordersWithoutManagement.length === 0) {
      console.log('✅ No orders need subscription_management entries');
      return;
    }

    // Step 2: Create subscription and subscription_management entries for each order
    console.log('\n📝 Step 2: Creating missing entries...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const order of ordersWithoutManagement) {
      try {
        console.log(`🔄 Processing order: ${order.order_number} (${order.id})`);

        // Create subscription record first
        const subscriptionData = {
          user_id: order.user_id,
          plan_id: order.subscription_plan || 'silver-pack',
          status: 'active',
          start_date: order.rental_start_date || new Date().toISOString(),
          end_date: order.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: order.rental_start_date || new Date().toISOString(),
          current_period_end: order.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          pause_balance: 0,
          auto_renew: true,
          age_group: order.age_group
        };

        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .insert(subscriptionData)
          .select()
          .single();

        if (subError) {
          console.error(`❌ Failed to create subscription for order ${order.order_number}:`, subError);
          errorCount++;
          continue;
        }

        console.log(`  ✅ Created subscription: ${subscription.id}`);

        // Update the rental order with the subscription_id
        const { error: updateError } = await supabase
          .from('rental_orders')
          .update({ subscription_id: subscription.id })
          .eq('id', order.id);

        if (updateError) {
          console.warn(`⚠️ Failed to update rental order with subscription_id:`, updateError);
        }

        // Create subscription_management entry
        const cycleStartDate = new Date(order.rental_start_date || order.created_at);
        const cycleEndDate = new Date(order.rental_end_date || new Date(cycleStartDate.getTime() + 30 * 24 * 60 * 60 * 1000));
        const selectionWindowStart = new Date(cycleStartDate);
        const selectionWindowEnd = new Date(cycleEndDate);

        // Selection window: Days 24-30 of cycle
        selectionWindowStart.setDate(selectionWindowStart.getDate() + 23);
        selectionWindowEnd.setDate(selectionWindowEnd.getDate() - 1);

        const managementData = {
          user_id: order.user_id,
          order_id: order.id,
          subscription_id: subscription.id,
          cycle_number: 1,
          cycle_status: 'active',
          cycle_start_date: cycleStartDate.toISOString().split('T')[0],
          cycle_end_date: cycleEndDate.toISOString().split('T')[0],
          selection_window_start: selectionWindowStart.toISOString().split('T')[0],
          selection_window_end: selectionWindowEnd.toISOString().split('T')[0],
          selection_window_status: 'upcoming',
          selected_toys: [],
          toys_selected_at: null,
          toys_count: 0,
          total_toy_value: 0.00,
          delivery_status: 'pending',
          plan_id: order.subscription_plan,
          plan_name: order.subscription_plan || 'silver-pack',
          plan_details: {
            age_group: order.age_group,
            subscription_category: order.subscription_category,
            total_amount: order.total_amount
          },
          manual_override: false,
          created_by: order.user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: management, error: managementError } = await supabase
          .from('subscription_management')
          .insert(managementData)
          .select()
          .single();

        if (managementError) {
          console.error(`❌ Failed to create subscription_management for order ${order.order_number}:`, managementError);
          errorCount++;

          // Clean up the subscription we just created
          await supabase.from('subscriptions').delete().eq('id', subscription.id);
          continue;
        }

        console.log(`  ✅ Created subscription_management: ${management.id}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Unexpected error processing order ${order.order_number}:`, error);
        errorCount++;
      }
    }

    // Step 3: Summary
    console.log('\n📊 SUMMARY:\n');
    console.log(`✅ Successfully processed: ${successCount} orders`);
    console.log(`❌ Failed to process: ${errorCount} orders`);
    console.log(`📋 Total orders processed: ${ordersWithoutManagement.length}`);

    if (successCount > 0) {
      console.log('\n🎉 SUCCESS: Subscription lifecycle tracking has been restored!');
      console.log('   - Exchange operations can now synchronize properly');
      console.log('   - Cycle management is fully functional');
      console.log('   - Customer dashboards will show correct data');
    }

    if (errorCount > 0) {
      console.log('\n⚠️  WARNING: Some orders failed to process');
      console.log('   - Check the error messages above');
      console.log('   - Manual intervention may be required for failed orders');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
createMissingSubscriptionManagement().then(() => {
  console.log('\n✅ Create Missing Subscription Management script completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
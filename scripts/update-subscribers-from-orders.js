#!/usr/bin/env node

/**
 * Update Subscribers from Order Data
 * 
 * This script analyzes rental_orders and updates custom_users table
 * to mark users as active subscribers based on their order history.
 * 
 * Logic:
 * 1. Users with orders in last 60 days = Active subscribers
 * 2. Extract subscription_plan from most recent order
 * 3. Update custom_users.subscription_active and subscription_plan
 * 
 * Usage: node scripts/update-subscribers-from-orders.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeSubscriptionData() {
  console.log('📊 Analyzing subscription data from rental orders...\n');
  
  try {
    // Get all rental orders with subscription info
    const { data: orders, error: ordersError } = await supabase
      .from('rental_orders')
      .select(`
        user_id,
        subscription_plan,
        created_at,
        status,
        cycle_number,
        rental_start_date,
        rental_end_date
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`📋 Found ${orders.length} rental orders`);

    // Group orders by user_id
    const userOrders = {};
    orders.forEach(order => {
      if (!userOrders[order.user_id]) {
        userOrders[order.user_id] = [];
      }
      userOrders[order.user_id].push(order);
    });

    console.log(`👥 Orders from ${Object.keys(userOrders).length} unique users`);

    // Analyze each user's subscription status
    const subscriptionAnalysis = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60); // 60 days ago

    for (const [userId, userOrderList] of Object.entries(userOrders)) {
      const mostRecentOrder = userOrderList[0]; // Already sorted by created_at desc
      const hasRecentOrder = new Date(mostRecentOrder.created_at) > cutoffDate;
      
      // Check for active/delivered orders
      const activeOrders = userOrderList.filter(order => 
        ['delivered', 'active', 'confirmed', 'shipped'].includes(order.status)
      );

      // Check for orders with future end dates
      const currentDate = new Date().toISOString().split('T')[0];
      const futureOrders = userOrderList.filter(order => 
        order.rental_end_date && order.rental_end_date >= currentDate
      );

      // Determine subscription status
      const isActiveSubscriber = hasRecentOrder && (activeOrders.length > 0 || futureOrders.length > 0);
      
      // Extract subscription plan (prefer non-null values)
      const subscriptionPlan = userOrderList.find(order => order.subscription_plan)?.subscription_plan || 
                              mostRecentOrder.subscription_plan || 
                              'basic';

      subscriptionAnalysis.push({
        userId,
        isActiveSubscriber,
        subscriptionPlan,
        totalOrders: userOrderList.length,
        mostRecentOrderDate: mostRecentOrder.created_at,
        activeOrdersCount: activeOrders.length,
        futureOrdersCount: futureOrders.length,
        maxCycleNumber: Math.max(...userOrderList.map(o => o.cycle_number || 1))
      });
    }

    // Summary statistics
    const activeSubscribers = subscriptionAnalysis.filter(u => u.isActiveSubscriber);
    const planCounts = {};
    activeSubscribers.forEach(user => {
      planCounts[user.subscriptionPlan] = (planCounts[user.subscriptionPlan] || 0) + 1;
    });

    console.log('\n📈 Subscription Analysis Summary:');
    console.log(`Total Users with Orders: ${subscriptionAnalysis.length}`);
    console.log(`Active Subscribers: ${activeSubscribers.length}`);
    console.log(`Inactive Users: ${subscriptionAnalysis.length - activeSubscribers.length}`);
    console.log('\n📊 Plan Distribution:');
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`  ${plan || 'Unknown'}: ${count} users`);
    });

    return subscriptionAnalysis;

  } catch (error) {
    console.error('❌ Error analyzing subscription data:', error);
    return [];
  }
}

async function updateUserSubscriptionStatus(subscriptionAnalysis) {
  console.log('\n🔄 Updating user subscription status...\n');
  
  let updateCount = 0;
  let errorCount = 0;

  for (const user of subscriptionAnalysis) {
    try {
      const { error } = await supabase
        .from('custom_users')
        .update({
          subscription_active: user.isActiveSubscriber,
          subscription_plan: user.subscriptionPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.userId);

      if (error) {
        console.error(`❌ Error updating user ${user.userId}:`, error.message);
        errorCount++;
      } else {
        updateCount++;
        if (updateCount % 10 === 0) {
          console.log(`✅ Updated ${updateCount} users...`);
        }
      }
    } catch (error) {
      console.error(`❌ Error updating user ${user.userId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Update Complete!`);
  console.log(`   Successfully updated: ${updateCount} users`);
  console.log(`   Errors: ${errorCount} users`);
  
  return { updateCount, errorCount };
}

async function verifyUpdates() {
  console.log('\n🔍 Verifying updates...\n');
  
  try {
    // Get updated subscription statistics
    const { data: users, error } = await supabase
      .from('custom_users')
      .select('subscription_active, subscription_plan')
      .not('subscription_active', 'is', null);

    if (error) {
      console.error('❌ Error verifying updates:', error);
      return;
    }

    const activeCount = users.filter(u => u.subscription_active).length;
    const inactiveCount = users.filter(u => !u.subscription_active).length;
    
    const planStats = {};
    users.forEach(user => {
      if (user.subscription_active) {
        const plan = user.subscription_plan || 'Unknown';
        planStats[plan] = (planStats[plan] || 0) + 1;
      }
    });

    console.log('📊 Updated Subscription Status:');
    console.log(`   Active Subscribers: ${activeCount}`);
    console.log(`   Inactive Users: ${inactiveCount}`);
    console.log(`   Total Users Updated: ${users.length}`);
    
    console.log('\n📋 Active Subscriber Plans:');
    Object.entries(planStats).forEach(([plan, count]) => {
      console.log(`   ${plan}: ${count} users`);
    });

    // Sample some users
    const { data: sampleUsers, error: sampleError } = await supabase
      .from('custom_users')
      .select('first_name, phone, subscription_active, subscription_plan')
      .eq('subscription_active', true)
      .limit(5);

    if (!sampleError && sampleUsers.length > 0) {
      console.log('\n👥 Sample Active Subscribers:');
      sampleUsers.forEach(user => {
        console.log(`   ${user.first_name} (${user.phone}) - ${user.subscription_plan}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verifying updates:', error);
  }
}

async function runSubscriptionUpdate() {
  console.log('🚀 Starting Subscription Update from Order Data\n');
  console.log('This will analyze rental orders and update user subscription status.\n');
  
  try {
    // Step 1: Analyze subscription data
    const subscriptionAnalysis = await analyzeSubscriptionData();
    
    if (subscriptionAnalysis.length === 0) {
      console.log('❌ No subscription data to process');
      return;
    }

    // Step 2: Update user subscription status
    const { updateCount, errorCount } = await updateUserSubscriptionStatus(subscriptionAnalysis);
    
    if (updateCount === 0) {
      console.log('❌ No users were updated');
      return;
    }

    // Step 3: Verify updates
    await verifyUpdates();

    console.log('\n🎉 Subscription update completed successfully!');
    console.log('\nNext Steps:');
    console.log('1. Users with active subscriptions will now see the Next Cycle feature');
    console.log('2. Test the dashboard to see the new Next Cycle Management section');
    console.log('3. Try the toy queue functionality with an active subscriber account');

  } catch (error) {
    console.error('\n❌ Subscription update failed:', error);
  }
}

// Run the subscription update
runSubscriptionUpdate().catch(console.error); 
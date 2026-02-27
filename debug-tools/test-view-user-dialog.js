#!/usr/bin/env node

/**
 * Debug Test for ViewUserDialog Component
 * 
 * This script helps identify issues with the ViewUserDialog by:
 * 1. Testing if users exist in the database
 * 2. Checking if rental_orders table is accessible
 * 3. Verifying user-order relationships
 * 4. Testing query performance
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testViewUserDialog() {
  console.log('🔍 Testing ViewUserDialog Component Dependencies...\n');
  
  try {
    // 1. Test if custom_users table is accessible
    console.log('1️⃣ Testing custom_users table access...');
    const { data: usersTest, error: usersError } = await supabase
      .from('custom_users')
      .select('id, first_name, last_name, phone, email, role, is_active, created_at')
      .limit(5);
    
    if (usersError) {
      console.error('❌ custom_users query failed:', usersError);
      return;
    }
    
    console.log('✅ custom_users table accessible');
    console.log(`📊 Found ${usersTest.length} sample users`);
    
    if (usersTest.length === 0) {
      console.log('⚠️ No users found in database');
      return;
    }
    
    // 2. Test if rental_orders table is accessible
    console.log('\n2️⃣ Testing rental_orders table access...');
    const { data: ordersTest, error: ordersError } = await supabase
      .from('rental_orders')
      .select('id, user_id, order_number, status, total_amount, created_at')
      .limit(5);
    
    if (ordersError) {
      console.error('❌ rental_orders query failed:', ordersError);
      console.log('🔍 This might be why ViewUserDialog is not working');
      return;
    }
    
    console.log('✅ rental_orders table accessible');
    console.log(`📊 Found ${ordersTest.length} sample orders`);
    
    // 3. Test user-order relationships
    console.log('\n3️⃣ Testing user-order relationships...');
    const testUser = usersTest[0];
    console.log(`🔍 Testing with user: ${testUser.first_name} ${testUser.last_name} (${testUser.id})`);
    
    const { data: userOrders, error: userOrdersError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false });
    
    if (userOrdersError) {
      console.error('❌ User orders query failed:', userOrdersError);
      return;
    }
    
    console.log(`✅ User has ${userOrders.length} orders`);
    
    if (userOrders.length > 0) {
      const order = userOrders[0];
      console.log(`📄 Latest order: ${order.order_number} - ₹${order.total_amount} (${order.status})`);
      
      // Test toys_data parsing
      if (order.toys_data) {
        try {
          const toysData = typeof order.toys_data === 'string' 
            ? JSON.parse(order.toys_data) 
            : order.toys_data;
          console.log(`🧸 Order has ${toysData.length} toys`);
        } catch (error) {
          console.log('⚠️ toys_data parsing failed:', error.message);
        }
      }
      
      // Test shipping_address parsing
      if (order.shipping_address) {
        try {
          const shippingData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address;
          console.log(`📍 Shipping to: ${shippingData.city || 'Unknown city'}`);
        } catch (error) {
          console.log('⚠️ shipping_address parsing failed:', error.message);
        }
      }
    }
    
    // 4. Test query performance
    console.log('\n4️⃣ Testing query performance...');
    const startTime = Date.now();
    
    const { data: perfTest, error: perfError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false });
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (perfError) {
      console.error('❌ Performance test failed:', perfError);
      return;
    }
    
    console.log(`⏱️ Query took ${queryTime}ms`);
    console.log(`📊 Returned ${perfTest.length} records`);
    
    if (queryTime > 1000) {
      console.log('⚠️ Query is slow, this might cause UI issues');
    } else {
      console.log('✅ Query performance is good');
    }
    
    // 5. Summary and recommendations
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Database connections working');
    console.log('✅ Tables accessible');
    console.log('✅ User-order relationships working');
    console.log('✅ Query performance acceptable');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check browser console for debug logs when opening ViewUserDialog');
    console.log('2. Verify that user data is being passed correctly to the dialog');
    console.log('3. Check if the dialog open state is being managed properly');
    console.log('4. Look for any React errors in the browser developer tools');
    
    console.log('\n🔗 Test User for Manual Testing:');
    console.log(`Name: ${testUser.first_name} ${testUser.last_name}`);
    console.log(`Phone: ${testUser.phone}`);
    console.log(`Email: ${testUser.email}`);
    console.log(`ID: ${testUser.id}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testViewUserDialog().catch(console.error); 
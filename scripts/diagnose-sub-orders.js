#!/usr/bin/env node

/**
 * Diagnostic Script: SUB Orders with Zero Toys Data
 *
 * This script investigates orders with "SUB" prefix that have:
 * 1. Zero toys data (empty selected_toys/toys_data)
 * 2. Payment status = 'pending'
 *
 * It checks both rental_orders and queue_orders tables to identify the root cause.
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseSUBOrders() {
  console.log('🔍 Starting SUB Orders Diagnostic...\n');

  try {
    // Step 1: Check rental_orders for SUB orders
    console.log('📊 Step 1: Checking rental_orders for SUB orders...');
    const { data: rentalSUBOrders, error: rentalError } = await supabase
      .from('rental_orders')
      .select('*')
      .ilike('order_number', 'SUB%');

    if (rentalError) {
      console.error('❌ Error fetching rental SUB orders:', rentalError);
    } else {
      console.log(`✅ Found ${rentalSUBOrders?.length || 0} SUB orders in rental_orders`);
      
      if (rentalSUBOrders && rentalSUBOrders.length > 0) {
        console.log('\n📋 Rental SUB Orders Analysis:');
        rentalSUBOrders.forEach((order, index) => {
          const toysCount = Array.isArray(order.toys_data) ? order.toys_data.length : 0;
          console.log(`${index + 1}. Order: ${order.order_number}`);
          console.log(`   - Status: ${order.status}`);
          console.log(`   - Payment Status: ${order.payment_status}`);
          console.log(`   - Toys Count: ${toysCount}`);
          console.log(`   - Total Amount: ₹${order.total_amount}`);
          console.log(`   - Created: ${order.created_at}`);
          console.log(`   - User ID: ${order.user_id}`);
          console.log(`   - Toys Data: ${JSON.stringify(order.toys_data).substring(0, 100)}...`);
          console.log('');
        });
      }
    }

    // Step 2: Check queue_orders for SUB orders
    console.log('📊 Step 2: Checking queue_orders for SUB orders...');
    const { data: queueSUBOrders, error: queueError } = await supabase
      .from('queue_orders')
      .select('*')
      .ilike('order_number', 'SUB%');

    if (queueError) {
      console.error('❌ Error fetching queue SUB orders:', queueError);
    } else {
      console.log(`✅ Found ${queueSUBOrders?.length || 0} SUB orders in queue_orders`);
      
      if (queueSUBOrders && queueSUBOrders.length > 0) {
        console.log('\n📋 Queue SUB Orders Analysis:');
        queueSUBOrders.forEach((order, index) => {
          const toysCount = Array.isArray(order.selected_toys) ? order.selected_toys.length : 0;
          console.log(`${index + 1}. Order: ${order.order_number}`);
          console.log(`   - Status: ${order.status}`);
          console.log(`   - Payment Status: ${order.payment_status}`);
          console.log(`   - Selected Toys Count: ${toysCount}`);
          console.log(`   - Total Amount: ₹${order.total_amount}`);
          console.log(`   - Queue Type: ${order.queue_order_type}`);
          console.log(`   - Created: ${order.created_at}`);
          console.log(`   - User ID: ${order.user_id}`);
          console.log(`   - Selected Toys: ${JSON.stringify(order.selected_toys).substring(0, 100)}...`);
          console.log('');
        });
      }
    }

    // Step 3: Check for orders with zero toys and pending payment
    console.log('📊 Step 3: Checking for orders with zero toys and pending payment...');
    
    // Check rental_orders
    const { data: emptyRentalOrders, error: emptyRentalError } = await supabase
      .from('rental_orders')
      .select('*')
      .eq('payment_status', 'pending')
      .or('toys_data.is.null,toys_data.eq.[]');

    if (!emptyRentalError && emptyRentalOrders) {
      console.log(`✅ Found ${emptyRentalOrders.length} rental orders with zero toys and pending payment`);
      
      emptyRentalOrders.forEach((order, index) => {
        if (index < 5) { // Show first 5
          console.log(`${index + 1}. ${order.order_number} - Status: ${order.status}, Payment: ${order.payment_status}, Toys: ${Array.isArray(order.toys_data) ? order.toys_data.length : 'null'}`);
        }
      });
    }

    // Check queue_orders
    const { data: emptyQueueOrders, error: emptyQueueError } = await supabase
      .from('queue_orders')
      .select('*')
      .eq('payment_status', 'pending')
      .or('selected_toys.is.null,selected_toys.eq.[]');

    if (!emptyQueueError && emptyQueueOrders) {
      console.log(`✅ Found ${emptyQueueOrders.length} queue orders with zero toys and pending payment`);
      
      emptyQueueOrders.forEach((order, index) => {
        if (index < 5) { // Show first 5
          console.log(`${index + 1}. ${order.order_number} - Status: ${order.status}, Payment: ${order.payment_status}, Toys: ${Array.isArray(order.selected_toys) ? order.selected_toys.length : 'null'}`);
        }
      });
    }

    // Step 4: Check order number patterns
    console.log('\n📊 Step 4: Analyzing order number patterns...');
    
    const { data: allOrderNumbers, error: orderNumberError } = await supabase
      .from('rental_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!orderNumberError && allOrderNumbers) {
      const patterns = {};
      allOrderNumbers.forEach(order => {
        const prefix = order.order_number.split('-')[0];
        patterns[prefix] = (patterns[prefix] || 0) + 1;
      });
      
      console.log('📈 Order Number Patterns (last 100 rental orders):');
      Object.entries(patterns).forEach(([prefix, count]) => {
        console.log(`   - ${prefix}: ${count} orders`);
      });
    }

    const { data: allQueueOrderNumbers, error: queueOrderNumberError } = await supabase
      .from('queue_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!queueOrderNumberError && allQueueOrderNumbers) {
      const queuePatterns = {};
      allQueueOrderNumbers.forEach(order => {
        const prefix = order.order_number.split('-')[0];
        queuePatterns[prefix] = (queuePatterns[prefix] || 0) + 1;
      });
      
      console.log('📈 Queue Order Number Patterns (last 100 queue orders):');
      Object.entries(queuePatterns).forEach(([prefix, count]) => {
        console.log(`   - ${prefix}: ${count} orders`);
      });
    }

    // Step 5: Summary and Recommendations
    console.log('\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(50));
    
    const totalSUBOrders = (rentalSUBOrders?.length || 0) + (queueSUBOrders?.length || 0);
    const totalEmptyOrders = (emptyRentalOrders?.length || 0) + (emptyQueueOrders?.length || 0);
    
    console.log(`📊 Total SUB orders found: ${totalSUBOrders}`);
    console.log(`📊 Total orders with zero toys + pending payment: ${totalEmptyOrders}`);
    
    if (totalSUBOrders > 0) {
      console.log('\n🔍 FINDINGS:');
      console.log('1. SUB orders exist in the system (should be QU- for queue orders)');
      console.log('2. This indicates a bug in order number generation');
      console.log('3. Need to investigate order creation flow');
    }
    
    if (totalEmptyOrders > 0) {
      console.log('\n⚠️  ISSUES IDENTIFIED:');
      console.log('1. Orders exist with zero toys data');
      console.log('2. Payment status stuck at pending');
      console.log('3. Possible incomplete order creation process');
    }
    
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. Fix order number generation for queue orders');
    console.log('2. Add validation to prevent orders with zero toys');
    console.log('3. Implement proper error handling in order creation');
    console.log('4. Add logging to track order creation issues');

  } catch (error) {
    console.error('❌ Diagnostic script failed:', error);
  }
}

// Run the diagnostic
diagnoseSUBOrders().then(() => {
  console.log('\n✅ Diagnostic completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});
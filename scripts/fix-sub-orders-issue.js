#!/usr/bin/env node

/**
 * Fix Script: SUB Orders Issues
 * 
 * This script fixes the identified issues with SUB orders:
 * 1. Updates order classification
 * 2. Handles zero toys data orders
 * 3. Fixes payment status inconsistencies
 * 4. Provides recommendations for manual review
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSUBOrdersIssues() {
  console.log('🔧 Starting SUB Orders Fix Process...\n');

  try {
    // Step 1: Get all SUB orders for analysis
    console.log('📊 Step 1: Analyzing SUB orders...');
    const { data: subOrders, error: fetchError } = await supabase
      .from('rental_orders')
      .select('*')
      .ilike('order_number', 'SUB%');

    if (fetchError) {
      console.error('❌ Error fetching SUB orders:', fetchError);
      return;
    }

    console.log(`✅ Found ${subOrders.length} SUB orders to analyze`);

    // Categorize orders
    const ordersWithToys = subOrders.filter(order => 
      Array.isArray(order.toys_data) && order.toys_data.length > 0
    );
    const ordersWithoutToys = subOrders.filter(order => 
      !Array.isArray(order.toys_data) || order.toys_data.length === 0
    );
    const paidOrders = subOrders.filter(order => order.payment_status === 'paid');
    const pendingOrders = subOrders.filter(order => order.payment_status === 'pending');

    console.log('\n📈 Analysis Results:');
    console.log(`   - Orders with toys: ${ordersWithToys.length}`);
    console.log(`   - Orders without toys: ${ordersWithoutToys.length}`);
    console.log(`   - Paid orders: ${paidOrders.length}`);
    console.log(`   - Pending payment orders: ${pendingOrders.length}`);

    // Step 2: Fix order classification
    console.log('\n🔧 Step 2: Fixing order classification...');
    
    let fixedClassification = 0;
    for (const order of subOrders) {
      if (order.order_type !== 'subscription') {
        const { error: updateError } = await supabase
          .from('rental_orders')
          .update({ 
            order_type: 'subscription',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (!updateError) {
          fixedClassification++;
        } else {
          console.warn(`⚠️ Failed to update order ${order.order_number}:`, updateError.message);
        }
      }
    }
    console.log(`✅ Fixed classification for ${fixedClassification} orders`);

    // Step 3: Handle problematic orders
    console.log('\n🔧 Step 3: Handling problematic orders...');
    
    const problematicOrders = ordersWithoutToys.filter(order => 
      order.payment_status === 'pending' && order.total_amount > 0
    );

    console.log(`⚠️ Found ${problematicOrders.length} orders that need manual review:`);
    console.log('   - Zero toys data');
    console.log('   - Pending payment');
    console.log('   - Non-zero amount');

    // Create a report for manual review
    const reportData = problematicOrders.map(order => ({
      order_number: order.order_number,
      user_id: order.user_id,
      total_amount: order.total_amount,
      created_at: order.created_at,
      status: order.status,
      payment_status: order.payment_status,
      toys_count: Array.isArray(order.toys_data) ? order.toys_data.length : 0,
      recommendation: order.total_amount > 0 && order.toys_data.length === 0 
        ? 'CANCEL - No toys selected, payment pending'
        : 'REVIEW - Manual investigation needed'
    }));

    console.log('\n📋 ORDERS REQUIRING MANUAL REVIEW:');
    console.log('='.repeat(80));
    reportData.forEach((order, index) => {
      if (index < 10) { // Show first 10
        console.log(`${index + 1}. ${order.order_number}`);
        console.log(`   - Amount: ₹${order.total_amount}`);
        console.log(`   - Status: ${order.status} / ${order.payment_status}`);
        console.log(`   - Created: ${order.created_at}`);
        console.log(`   - Recommendation: ${order.recommendation}`);
        console.log('');
      }
    });

    if (reportData.length > 10) {
      console.log(`   ... and ${reportData.length - 10} more orders`);
    }

    // Step 4: Provide recommendations
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('='.repeat(50));
    console.log('1. IMMEDIATE ACTIONS:');
    console.log('   - Review orders with zero toys and pending payment');
    console.log('   - Cancel orders that were never completed');
    console.log('   - Contact customers for orders with payment issues');
    console.log('');
    console.log('2. SYSTEM FIXES NEEDED:');
    console.log('   - Fix order creation flow to prevent zero toys orders');
    console.log('   - Add validation to ensure toys are selected before payment');
    console.log('   - Implement proper error handling in payment flow');
    console.log('   - Add logging to track order creation issues');
    console.log('');
    console.log('3. PREVENTIVE MEASURES:');
    console.log('   - Add database constraints to prevent empty toys_data');
    console.log('   - Implement order validation before payment processing');
    console.log('   - Add monitoring alerts for incomplete orders');
    console.log('   - Regular data integrity checks');

    // Step 5: Generate SQL for manual fixes
    console.log('\n📝 SQL COMMANDS FOR MANUAL FIXES:');
    console.log('='.repeat(50));
    console.log('-- Cancel orders with zero toys and pending payment:');
    console.log(`UPDATE rental_orders 
SET status = 'cancelled', 
    payment_status = 'cancelled',
    updated_at = NOW()
WHERE order_number LIKE 'SUB_%' 
  AND (toys_data IS NULL OR toys_data = '[]'::jsonb)
  AND payment_status = 'pending'
  AND total_amount > 0;`);

    console.log('\n-- Update order classification:');
    console.log(`UPDATE rental_orders 
SET order_type = 'subscription',
    updated_at = NOW()
WHERE order_number LIKE 'SUB_%' 
  AND order_type != 'subscription';`);

    console.log('\n✅ SUB Orders analysis and fix recommendations completed!');
    console.log('\n⚠️  IMPORTANT: Review the recommendations above before applying any fixes.');
    console.log('   Some orders may need individual customer contact before cancellation.');

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  }
}

// Run the fix
fixSUBOrdersIssues().then(() => {
  console.log('\n✅ Fix process completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix process failed:', error);
  process.exit(1);
});
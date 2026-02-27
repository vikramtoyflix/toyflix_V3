#!/usr/bin/env node

/**
 * VERIFICATION SCRIPT: Check rental_orders Migration Status
 * 
 * This script verifies the migration from orders/order_items to rental_orders
 * and provides detailed statistics and data integrity checks.
 * 
 * Run: node verify-migration.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.Gp5Ui_5bHVDcMNKANfFIuGUhN-lKLIVnJH7xoKhqzek'
);

async function verifyMigration() {
  console.log('🔍 RENTAL_ORDERS MIGRATION VERIFICATION');
  console.log('========================================\n');

  try {
    // 1. Count records in each table
    console.log('📊 TABLE RECORD COUNTS:');
    console.log('========================');

    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { count: orderItemsCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true });

    const { count: rentalOrdersCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true });

    const { count: migratedOrdersCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .not('legacy_order_id', 'is', null);

    const { count: newOrdersCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .is('legacy_order_id', null);

    console.log(`📦 orders table: ${ordersCount || 0} records`);
    console.log(`📋 order_items table: ${orderItemsCount || 0} records`);
    console.log(`🏠 rental_orders table: ${rentalOrdersCount || 0} total records`);
    console.log(`🔄 Migrated orders: ${migratedOrdersCount || 0} records`);
    console.log(`🆕 New orders: ${newOrdersCount || 0} records`);

    // 2. Migration completeness
    console.log('\n✅ MIGRATION COMPLETENESS:');
    console.log('===========================');

    const migrationRate = ordersCount > 0 ? ((migratedOrdersCount / ordersCount) * 100).toFixed(1) : 0;
    console.log(`📈 Migration rate: ${migrationRate}%`);

    if (migratedOrdersCount === ordersCount) {
      console.log('🎉 PERFECT! All orders have been migrated.');
    } else if (migratedOrdersCount > 0) {
      console.log(`⚠️ PARTIAL: ${ordersCount - migratedOrdersCount} orders still need migration.`);
    } else {
      console.log('❌ NO MIGRATION: No orders have been migrated yet.');
    }

    // 3. Sample migrated order verification
    console.log('\n🔍 SAMPLE ORDER VERIFICATION:');
    console.log('==============================');

    const { data: sampleMigratedOrder } = await supabase
      .from('rental_orders')
      .select('*')
      .not('legacy_order_id', 'is', null)
      .limit(1)
      .single();

    if (sampleMigratedOrder) {
      console.log('✅ Sample migrated order found:');
      console.log(`   Order ID: ${sampleMigratedOrder.id}`);
      console.log(`   Legacy ID: ${sampleMigratedOrder.legacy_order_id}`);
      console.log(`   Status: ${sampleMigratedOrder.status}`);
      console.log(`   Total Amount: ₹${sampleMigratedOrder.total_amount}`);
      console.log(`   Toys Count: ${sampleMigratedOrder.toys_data?.length || 0}`);
      console.log(`   Has Shipping Address: ${!!sampleMigratedOrder.shipping_address?.address_line1}`);
      console.log(`   Payment Status: ${sampleMigratedOrder.payment_status}`);
    } else {
      console.log('❌ No migrated orders found for verification.');
    }

    // 4. Sample new order verification
    const { data: sampleNewOrder } = await supabase
      .from('rental_orders')
      .select('*')
      .is('legacy_order_id', null)
      .limit(1)
      .single();

    if (sampleNewOrder) {
      console.log('\n✅ Sample new order found:');
      console.log(`   Order ID: ${sampleNewOrder.id}`);
      console.log(`   Order Number: ${sampleNewOrder.order_number}`);
      console.log(`   Status: ${sampleNewOrder.status}`);
      console.log(`   Total Amount: ₹${sampleNewOrder.total_amount}`);
      console.log(`   Toys Count: ${sampleNewOrder.toys_data?.length || 0}`);
    }

    // 5. Data integrity checks
    console.log('\n🔐 DATA INTEGRITY CHECKS:');
    console.log('==========================');

    // Check for orders with missing user_id
    const { count: missingUserCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    // Check for orders with empty toys_data
    const { count: emptyToysCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .eq('toys_data', '[]');

    // Check for orders with missing shipping address
    const { count: missingAddressCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .eq('shipping_address', '{}');

    console.log(`👤 Orders with missing user_id: ${missingUserCount || 0}`);
    console.log(`🧸 Orders with empty toys_data: ${emptyToysCount || 0}`);
    console.log(`📍 Orders with missing shipping address: ${missingAddressCount || 0}`);

    // 6. Financial data verification
    console.log('\n💰 FINANCIAL DATA VERIFICATION:');
    console.log('================================');

    const { data: financialSummary } = await supabase
      .from('rental_orders')
      .select('total_amount, payment_amount, payment_status')
      .not('legacy_order_id', 'is', null);

    if (financialSummary && financialSummary.length > 0) {
      const totalOrderAmount = financialSummary.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const totalPaymentAmount = financialSummary.reduce((sum, order) => sum + (order.payment_amount || 0), 0);
      const paidOrders = financialSummary.filter(order => order.payment_status === 'paid').length;

      console.log(`💸 Total order amount: ₹${totalOrderAmount.toFixed(2)}`);
      console.log(`💳 Total payment amount: ₹${totalPaymentAmount.toFixed(2)}`);
      console.log(`✅ Paid orders: ${paidOrders}/${financialSummary.length}`);
      console.log(`📊 Payment rate: ${((paidOrders / financialSummary.length) * 100).toFixed(1)}%`);
    }

    // 7. Recent activity check
    console.log('\n⏰ RECENT ACTIVITY:');
    console.log('===================');

    const { data: recentOrders } = await supabase
      .from('rental_orders')
      .select('id, created_at, legacy_order_id, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentOrders && recentOrders.length > 0) {
      console.log('📅 Last 5 orders in rental_orders:');
      recentOrders.forEach((order, index) => {
        const isLegacy = order.legacy_order_id ? '(Migrated)' : '(New)';
        const date = new Date(order.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... - ${order.status} - ${date} ${isLegacy}`);
      });
    }

    // 8. Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');

    if (migratedOrdersCount === ordersCount && newOrdersCount > 0) {
      console.log('✅ EXCELLENT! Migration is complete and new orders are flowing to rental_orders.');
      console.log('✅ The unified system is working perfectly.');
      console.log('🔧 Next: Consider archiving old orders/order_items tables after backup.');
    } else if (migratedOrdersCount === ordersCount) {
      console.log('✅ Migration is complete, but no new orders detected yet.');
      console.log('🧪 Test: Create a new order to verify the unified flow.');
    } else if (migratedOrdersCount > 0) {
      console.log('⚠️ Migration is partial. Run the migration script again to complete.');
      console.log('🔧 Check: Review any error logs from the migration process.');
    } else {
      console.log('❌ No migration detected. Run the migration script first.');
      console.log('📝 Command: node migrate-existing-orders-to-rental.js');
    }

    if (missingUserCount > 0 || emptyToysCount > 0) {
      console.log('⚠️ Data integrity issues detected. Review the problematic records.');
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Main execution
verifyMigration().catch(console.error); 
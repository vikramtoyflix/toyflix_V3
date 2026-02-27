#!/usr/bin/env node

/**
 * VERIFICATION SCRIPT: Check rental_orders Migration Status (Direct PostgreSQL)
 * 
 * This script verifies the migration from orders/order_items to rental_orders
 * using direct PostgreSQL connection to bypass any RLS issues.
 * 
 * Run: node verify-migration-direct.js
 */

import postgres from 'postgres';

// Direct PostgreSQL connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';
const sql = postgres(connectionString);

async function verifyMigrationDirect() {
  console.log('🔍 RENTAL_ORDERS MIGRATION VERIFICATION (Direct PostgreSQL)');
  console.log('============================================================\n');

  try {
    // 1. Count records in each table
    console.log('📊 TABLE RECORD COUNTS:');
    console.log('========================');

    const ordersCount = await sql`SELECT COUNT(*) as count FROM orders`;
    const orderItemsCount = await sql`SELECT COUNT(*) as count FROM order_items`;
    const rentalOrdersCount = await sql`SELECT COUNT(*) as count FROM rental_orders`;
    const migratedOrdersCount = await sql`
      SELECT COUNT(*) as count FROM rental_orders WHERE legacy_order_id IS NOT NULL
    `;
    const newOrdersCount = await sql`
      SELECT COUNT(*) as count FROM rental_orders WHERE legacy_order_id IS NULL
    `;

    console.log(`📦 orders table: ${ordersCount[0].count} records`);
    console.log(`📋 order_items table: ${orderItemsCount[0].count} records`);
    console.log(`🏠 rental_orders table: ${rentalOrdersCount[0].count} total records`);
    console.log(`🔄 Migrated orders: ${migratedOrdersCount[0].count} records`);
    console.log(`🆕 New orders: ${newOrdersCount[0].count} records`);

    // 2. Migration completeness
    console.log('\n✅ MIGRATION COMPLETENESS:');
    console.log('===========================');

    const totalOrders = parseInt(ordersCount[0].count);
    const totalMigrated = parseInt(migratedOrdersCount[0].count);
    const migrationRate = totalOrders > 0 ? ((totalMigrated / totalOrders) * 100).toFixed(1) : 0;
    
    console.log(`📈 Migration rate: ${migrationRate}%`);

    if (totalMigrated === totalOrders && totalOrders > 0) {
      console.log('🎉 PERFECT! All orders have been migrated.');
    } else if (totalMigrated > 0) {
      console.log(`⚠️ PARTIAL: ${totalOrders - totalMigrated} orders still need migration.`);
    } else if (totalOrders > 0) {
      console.log('❌ NO MIGRATION: No orders have been migrated yet.');
    } else {
      console.log('📝 NO ORDERS: No orders found in database.');
    }

    // 3. Sample migrated order verification
    console.log('\n🔍 SAMPLE ORDER VERIFICATION:');
    console.log('==============================');

    if (totalMigrated > 0) {
      const sampleMigratedOrder = await sql`
        SELECT * FROM rental_orders 
        WHERE legacy_order_id IS NOT NULL 
        LIMIT 1
      `;

      if (sampleMigratedOrder.length > 0) {
        const order = sampleMigratedOrder[0];
        console.log('✅ Sample migrated order found:');
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Legacy ID: ${order.legacy_order_id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total Amount: ₹${order.total_amount}`);
        console.log(`   Toys Count: ${order.toys_data?.length || 0}`);
        console.log(`   Has Shipping Address: ${!!order.shipping_address?.address_line1}`);
        console.log(`   Payment Status: ${order.payment_status}`);
      }
    } else {
      console.log('❌ No migrated orders found for verification.');
    }

    // 4. Sample new order verification
    if (parseInt(newOrdersCount[0].count) > 0) {
      const sampleNewOrder = await sql`
        SELECT * FROM rental_orders 
        WHERE legacy_order_id IS NULL 
        LIMIT 1
      `;

      if (sampleNewOrder.length > 0) {
        const order = sampleNewOrder[0];
        console.log('\n✅ Sample new order found:');
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Order Number: ${order.order_number}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total Amount: ₹${order.total_amount}`);
        console.log(`   Toys Count: ${order.toys_data?.length || 0}`);
      }
    }

    // 5. Data integrity checks
    console.log('\n🔐 DATA INTEGRITY CHECKS:');
    console.log('==========================');

    const missingUserCount = await sql`
      SELECT COUNT(*) as count FROM rental_orders WHERE user_id IS NULL
    `;
    const emptyToysCount = await sql`
      SELECT COUNT(*) as count FROM rental_orders WHERE toys_data = '[]'::jsonb
    `;
    const missingAddressCount = await sql`
      SELECT COUNT(*) as count FROM rental_orders WHERE shipping_address = '{}'::jsonb
    `;

    console.log(`👤 Orders with missing user_id: ${missingUserCount[0].count}`);
    console.log(`🧸 Orders with empty toys_data: ${emptyToysCount[0].count}`);
    console.log(`📍 Orders with missing shipping address: ${missingAddressCount[0].count}`);

    // 6. Financial data verification
    console.log('\n💰 FINANCIAL DATA VERIFICATION:');
    console.log('================================');

    if (totalMigrated > 0) {
      const financialSummary = await sql`
        SELECT 
          SUM(total_amount) as total_order_amount,
          SUM(payment_amount) as total_payment_amount,
          COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
          COUNT(*) as total_orders
        FROM rental_orders 
        WHERE legacy_order_id IS NOT NULL
      `;

      if (financialSummary.length > 0) {
        const summary = financialSummary[0];
        console.log(`💸 Total order amount: ₹${parseFloat(summary.total_order_amount || 0).toFixed(2)}`);
        console.log(`💳 Total payment amount: ₹${parseFloat(summary.total_payment_amount || 0).toFixed(2)}`);
        console.log(`✅ Paid orders: ${summary.paid_orders}/${summary.total_orders}`);
        console.log(`📊 Payment rate: ${((summary.paid_orders / summary.total_orders) * 100).toFixed(1)}%`);
      }
    }

    // 7. Recent activity check
    console.log('\n⏰ RECENT ACTIVITY:');
    console.log('===================');

    const recentOrders = await sql`
      SELECT id, created_at, legacy_order_id, status 
      FROM rental_orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    if (recentOrders.length > 0) {
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

    const totalNew = parseInt(newOrdersCount[0].count);

    if (totalMigrated === totalOrders && totalOrders > 0 && totalNew > 0) {
      console.log('✅ EXCELLENT! Migration is complete and new orders are flowing to rental_orders.');
      console.log('✅ The unified system is working perfectly.');
      console.log('🔧 Next: Consider archiving old orders/order_items tables after backup.');
    } else if (totalMigrated === totalOrders && totalOrders > 0) {
      console.log('✅ Migration is complete, but no new orders detected yet.');
      console.log('🧪 Test: Create a new order to verify the unified flow.');
    } else if (totalMigrated > 0) {
      console.log('⚠️ Migration is partial. Run the migration script again to complete.');
      console.log('🔧 Check: Review any error logs from the migration process.');
    } else if (totalOrders > 0) {
      console.log('❌ No migration detected. Run the migration script first.');
      console.log('📝 Command: node migrate-existing-orders-to-rental.js');
    } else {
      console.log('📝 No orders in database yet. The unified system is ready for new orders.');
    }

    if (parseInt(missingUserCount[0].count) > 0 || parseInt(emptyToysCount[0].count) > 0) {
      console.log('⚠️ Data integrity issues detected. Review the problematic records.');
    }

    console.log('\n🎉 VERIFICATION COMPLETE!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Main execution
verifyMigrationDirect().catch(console.error); 
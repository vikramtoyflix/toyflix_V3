#!/usr/bin/env node

/**
 * Direct PostgreSQL connection test
 */

import postgres from 'postgres';

// Direct PostgreSQL connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';
const sql = postgres(connectionString);

async function testDirectConnection() {
  console.log('🔍 Testing direct PostgreSQL connection...\n');
  
  try {
    // Test basic connection
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log('✅ Direct PostgreSQL connection successful!');
    console.log(`📊 Database: ${result[0].current_database}`);
    console.log(`👤 User: ${result[0].current_user}`);
    console.log(`🔧 Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}\n`);
    
    // Check all relevant tables
    console.log('📊 TABLE RECORD COUNTS (Direct Query):');
    console.log('======================================');
    
    // Count orders
    const ordersCount = await sql`SELECT COUNT(*) as count FROM orders`;
    console.log(`📦 orders table: ${ordersCount[0].count} records`);
    
    // Count order_items
    const orderItemsCount = await sql`SELECT COUNT(*) as count FROM order_items`;
    console.log(`📋 order_items table: ${orderItemsCount[0].count} records`);
    
    // Count rental_orders
    const rentalOrdersCount = await sql`SELECT COUNT(*) as count FROM rental_orders`;
    console.log(`🏠 rental_orders table: ${rentalOrdersCount[0].count} records`);
    
    // Count custom_users
    const usersCount = await sql`SELECT COUNT(*) as count FROM custom_users`;
    console.log(`👥 custom_users table: ${usersCount[0].count} records`);
    
    // Count payment_orders
    const paymentOrdersCount = await sql`SELECT COUNT(*) as count FROM payment_orders`;
    console.log(`💳 payment_orders table: ${paymentOrdersCount[0].count} records`);
    
    // Count subscription_tracking
    const subscriptionCount = await sql`SELECT COUNT(*) as count FROM subscription_tracking`;
    console.log(`📋 subscription_tracking table: ${subscriptionCount[0].count} records`);
    
    // Count toys
    const toysCount = await sql`SELECT COUNT(*) as count FROM toys`;
    console.log(`🧸 toys table: ${toysCount[0].count} records`);
    
    console.log('\n🔍 DETAILED ANALYSIS:');
    console.log('=====================');
    
    // Check for migrated orders in rental_orders
    const migratedCount = await sql`
      SELECT COUNT(*) as count 
      FROM rental_orders 
      WHERE legacy_order_id IS NOT NULL
    `;
    console.log(`🔄 Migrated orders in rental_orders: ${migratedCount[0].count} records`);
    
    // Check for new orders in rental_orders
    const newOrdersCount = await sql`
      SELECT COUNT(*) as count 
      FROM rental_orders 
      WHERE legacy_order_id IS NULL
    `;
    console.log(`🆕 New orders in rental_orders: ${newOrdersCount[0].count} records`);
    
    // Sample recent data
    console.log('\n📅 RECENT DATA SAMPLES:');
    console.log('=======================');
    
    // Recent orders
    if (parseInt(ordersCount[0].count) > 0) {
      const recentOrders = await sql`
        SELECT id, user_id, status, total_amount, created_at 
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      console.log('📦 Recent orders:');
      recentOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... - ${order.status} - ₹${order.total_amount} - ${order.created_at.toLocaleDateString()}`);
      });
    }
    
    // Recent rental orders
    if (parseInt(rentalOrdersCount[0].count) > 0) {
      const recentRentalOrders = await sql`
        SELECT id, user_id, status, total_amount, created_at, legacy_order_id 
        FROM rental_orders 
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      console.log('\n🏠 Recent rental orders:');
      recentRentalOrders.forEach((order, index) => {
        const type = order.legacy_order_id ? '(Migrated)' : '(New)';
        console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... - ${order.status} - ₹${order.total_amount} - ${order.created_at.toLocaleDateString()} ${type}`);
      });
    }
    
    // Recent users
    if (parseInt(usersCount[0].count) > 0) {
      const recentUsers = await sql`
        SELECT id, phone, first_name, last_name, subscription_active, created_at 
        FROM custom_users 
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      console.log('\n👥 Recent users:');
      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone} - ${user.first_name} ${user.last_name} - Active: ${user.subscription_active} - ${user.created_at.toLocaleDateString()}`);
      });
    }
    
    console.log('\n🎯 MIGRATION STATUS:');
    console.log('====================');
    
    const totalOrders = parseInt(ordersCount[0].count);
    const totalRentalOrders = parseInt(rentalOrdersCount[0].count);
    const totalMigrated = parseInt(migratedCount[0].count);
    const totalNew = parseInt(newOrdersCount[0].count);
    
    if (totalOrders === 0 && totalRentalOrders === 0) {
      console.log('📝 No orders found in either table - fresh database or no orders created yet');
    } else if (totalOrders > 0 && totalMigrated === 0) {
      console.log('⚠️ Orders exist but none have been migrated to rental_orders');
      console.log('📝 Recommendation: Run migration script to move orders to unified table');
    } else if (totalMigrated === totalOrders) {
      console.log('✅ All orders have been migrated to rental_orders table');
      if (totalNew > 0) {
        console.log('🎉 New orders are also flowing to rental_orders - unified system working!');
      }
    } else {
      console.log(`⚠️ Partial migration: ${totalMigrated}/${totalOrders} orders migrated`);
    }
    
    console.log('\n🎉 Direct connection test complete!');
    
  } catch (error) {
    console.error('❌ Direct connection failed:', error.message);
    console.error('🔧 Check your DATABASE_URL or connection string');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testDirectConnection().catch(console.error); 
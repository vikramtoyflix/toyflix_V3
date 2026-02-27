#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Existing Orders → rental_orders Table (Direct PostgreSQL)
 * 
 * This script migrates all existing orders from the fragmented approach
 * using direct PostgreSQL connection to bypass any RLS issues.
 * 
 * Run: node migrate-direct.js
 */

import postgres from 'postgres';

// Direct PostgreSQL connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';
const sql = postgres(connectionString);

// Migration statistics
let stats = {
  totalOrders: 0,
  migratedOrders: 0,
  failedOrders: 0,
  skippedOrders: 0,
  errors: []
};

/**
 * Main migration function
 */
async function migrateExistingOrdersDirect() {
  console.log('🚀 Starting migration of existing orders to rental_orders table (Direct PostgreSQL)...\n');
  
  try {
    // Step 1: Get all existing orders
    console.log('📊 Fetching existing orders...');
    const existingOrders = await sql`
      SELECT * FROM orders 
      ORDER BY created_at ASC
    `;

    stats.totalOrders = existingOrders.length;
    console.log(`✅ Found ${stats.totalOrders} existing orders to migrate\n`);

    if (stats.totalOrders === 0) {
      console.log('🎉 No orders to migrate. Migration complete!');
      return;
    }

    // Step 2: Check if any orders already exist in rental_orders
    console.log('🔍 Checking for existing migrations...');
    const existingRentalOrders = await sql`
      SELECT legacy_order_id FROM rental_orders 
      WHERE legacy_order_id IS NOT NULL
    `;

    const existingLegacyIds = new Set(
      existingRentalOrders.map(order => order.legacy_order_id)
    );
    
    console.log(`📋 Found ${existingLegacyIds.size} orders already migrated\n`);

    // Step 3: Migrate each order
    console.log('🔄 Starting order migration...\n');
    
    for (let i = 0; i < existingOrders.length; i++) {
      const order = existingOrders[i];
      const orderNumber = i + 1;
      
      console.log(`[${orderNumber}/${stats.totalOrders}] Processing order ${order.id.slice(0, 8)}...`);
      
      try {
        // Skip if already migrated
        if (existingLegacyIds.has(order.id)) {
          console.log(`   ⏭️ Already migrated, skipping`);
          stats.skippedOrders++;
          continue;
        }

        await migrateIndividualOrderDirect(order);
        stats.migratedOrders++;
        console.log(`   ✅ Successfully migrated`);
        
      } catch (error) {
        stats.failedOrders++;
        stats.errors.push({
          order_id: order.id,
          error: error.message
        });
        console.log(`   ❌ Failed: ${error.message}`);
      }
      
      // Progress indicator
      if (orderNumber % 10 === 0) {
        console.log(`\n📈 Progress: ${orderNumber}/${stats.totalOrders} orders processed\n`);
      }
    }

    // Step 4: Print final statistics
    console.log('\n🎉 MIGRATION COMPLETE!\n');
    printMigrationStats();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Migrate an individual order to rental_orders table
 */
async function migrateIndividualOrderDirect(order) {
  // Fetch customer data
  const customerData = await sql`
    SELECT * FROM custom_users 
    WHERE id = ${order.user_id}
  `;
  const customer = customerData[0] || null;

  // Fetch order items with toy details
  const orderItems = await sql`
    SELECT oi.*, 
           t.name as toy_name,
           t.description as toy_description,
           t.image_url as toy_image_url,
           t.category as toy_category,
           COALESCE(t.age_range, '') as toy_age_group,
           t.retail_price as toy_retail_price,
           t.rental_price as toy_rental_price
    FROM order_items oi
    LEFT JOIN toys t ON oi.toy_id = t.id
    WHERE oi.order_id = ${order.id}
  `;

  // Fetch payment information (try payment_orders first)
  let paymentData = null;
  const paymentOrders = await sql`
    SELECT * FROM payment_orders 
    WHERE user_id = ${order.user_id}
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  if (paymentOrders.length > 0) {
    paymentData = paymentOrders[0];
  } else {
    // Fallback to payment_tracking
    const paymentTracking = await sql`
      SELECT * FROM payment_tracking 
      WHERE user_id = ${order.user_id}
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    paymentData = paymentTracking[0] || null;
  }

  // Fetch subscription data
  const subscriptionData = await sql`
    SELECT * FROM subscription_tracking 
    WHERE user_id = ${order.user_id}
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  const subscription = subscriptionData[0] || null;

  // Transform order items to toys_data JSONB format
  const toysData = orderItems.map(item => ({
    toy_id: item.toy_id,
    name: item.toy_name || 'Unknown Toy',
    description: item.toy_description || '',
    image_url: item.toy_image_url || '',
    category: item.toy_category || '',
    age_group: item.toy_age_group || '',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || item.toy_rental_price || 0,
    total_price: item.total_price || (item.unit_price * item.quantity) || 0,
    returned: false,
    subscription_category: item.subscription_category || '',
    ride_on_toy_id: item.ride_on_toy_id || null
  }));

  // Standardize shipping address
  const shippingAddress = order.shipping_address || {};
  const standardizedAddress = {
    first_name: shippingAddress.first_name || customer?.first_name || '',
    last_name: shippingAddress.last_name || customer?.last_name || '',
    phone: shippingAddress.phone || customer?.phone || '',
    email: shippingAddress.email || customer?.email || '',
    address_line1: shippingAddress.address_line1 || '',
    address_line2: shippingAddress.address_line2 || shippingAddress.apartment || '',
    city: shippingAddress.city || '',
    state: shippingAddress.state || '',
    postcode: shippingAddress.postcode || shippingAddress.zip_code || '',
    country: shippingAddress.country || 'India',
    latitude: shippingAddress.latitude || null,
    longitude: shippingAddress.longitude || null,
    plus_code: shippingAddress.plus_code || '',
    delivery_instructions: order.delivery_instructions || null
  };

  // Calculate rental dates
  const rentalStartDate = order.rental_start_date ? 
    new Date(order.rental_start_date).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0];
  const rentalEndDate = order.rental_end_date ? 
    new Date(order.rental_end_date).toISOString().split('T')[0] : 
    new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

  // Insert into rental_orders table
  await sql`
    INSERT INTO rental_orders (
      legacy_order_id,
      legacy_created_at,
      migrated_at,
      user_id,
      user_phone,
      status,
      order_type,
      total_amount,
      base_amount,
      gst_amount,
      discount_amount,
      coupon_code,
      payment_status,
      payment_method,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_amount,
      payment_currency,
      subscription_plan,
      subscription_category,
      subscription_id,
      cycle_number,
      rental_start_date,
      rental_end_date,
      delivery_date,
      returned_date,
      return_status,
      toys_data,
      toys_delivered_count,
      toys_returned_count,
      shipping_address,
      age_group,
      confirmed_at,
      shipped_at,
      delivered_at,
      delivery_instructions,
      admin_notes,
      internal_status,
      created_at,
      updated_at
    ) VALUES (
      ${order.id},
      ${order.created_at},
      ${new Date().toISOString()},
      ${order.user_id},
      ${customer?.phone || ''},
      ${order.status || 'pending'},
      ${order.order_type || 'subscription'},
      ${order.total_amount || 0},
      ${order.base_amount || 0},
      ${order.gst_amount || 0},
      ${order.discount_amount || 0},
      ${order.coupon_code || null},
      ${paymentData?.status || 'pending'},
      ${'razorpay'},
      ${paymentData?.razorpay_order_id || order.razorpay_order_id || null},
      ${paymentData?.razorpay_payment_id || order.razorpay_payment_id || null},
      ${paymentData?.razorpay_signature || order.razorpay_signature || null},
      ${paymentData?.amount || order.total_amount || 0},
      ${paymentData?.currency || 'INR'},
      ${subscription?.plan_id || 'basic'},
      ${subscription?.plan_id || 'basic'},
      ${subscription?.id || null},
      ${1},
      ${rentalStartDate},
      ${rentalEndDate},
      ${order.delivered_at ? new Date(order.delivered_at).toISOString().split('T')[0] : null},
      ${order.returned_date ? new Date(order.returned_date).toISOString().split('T')[0] : null},
      ${order.returned_date ? 'returned' : 'pending'},
      ${JSON.stringify(toysData)},
      ${toysData.length},
      ${order.returned_date ? toysData.length : 0},
      ${JSON.stringify(standardizedAddress)},
      ${toysData[0]?.age_group || subscription?.age_group || '3-5'},
      ${order.confirmed_at || (paymentData ? order.created_at : null)},
      ${order.shipped_at || order.confirmed_at || null},
      ${order.delivered_at || order.shipped_at || null},
      ${order.delivery_instructions || null},
      ${'Migrated from legacy order ' + order.id},
      ${'migrated'},
      ${order.created_at},
      ${order.updated_at || new Date().toISOString()}
    )
  `;
}

/**
 * Print migration statistics
 */
function printMigrationStats() {
  console.log('📊 MIGRATION STATISTICS:');
  console.log('========================');
  console.log(`📦 Total Orders Found: ${stats.totalOrders}`);
  console.log(`✅ Successfully Migrated: ${stats.migratedOrders}`);
  console.log(`⏭️ Already Migrated (Skipped): ${stats.skippedOrders}`);
  console.log(`❌ Failed Migrations: ${stats.failedOrders}`);
  
  const eligibleOrders = stats.totalOrders - stats.skippedOrders;
  const successRate = eligibleOrders > 0 ? ((stats.migratedOrders / eligibleOrders) * 100).toFixed(1) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ MIGRATION ERRORS:');
    console.log('====================');
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. Order ${error.order_id.slice(0, 8)}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('===================');
  
  if (stats.migratedOrders > 0) {
    console.log('✅ Migration successful! New orders will now use rental_orders table.');
    console.log('✅ Admin dashboard will show both migrated and new orders.');
    console.log('✅ User dashboard will display complete order history.');
  }
  
  if (stats.failedOrders > 0) {
    console.log('⚠️ Some orders failed to migrate. Check error details above.');
    console.log('⚠️ You can re-run this script to retry failed migrations.');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('==============');
  console.log('1. Run: node verify-migration-direct.js');
  console.log('2. Test admin dashboard with migrated orders');
  console.log('3. Test user dashboard functionality');
  console.log('4. Create new test order to verify unified flow');
  
  if (stats.failedOrders === 0 && stats.migratedOrders > 0) {
    console.log('5. Consider archiving old orders/order_items tables (after backup)');
  }
}

// Main execution
async function main() {
  console.log('🎯 RENTAL_ORDERS MIGRATION SCRIPT (Direct PostgreSQL)');
  console.log('======================================================\n');
  
  try {
    await migrateExistingOrdersDirect();
    
    console.log('\n🎉 MIGRATION SCRIPT COMPLETED SUCCESSFULLY!');
    console.log('Run "node verify-migration-direct.js" to verify results.');
    
  } catch (error) {
    console.error('\n❌ MIGRATION SCRIPT FAILED:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Execute main function
main().catch(console.error); 
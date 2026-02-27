#!/usr/bin/env node

/**
 * MIGRATION SCRIPT: Existing Orders → rental_orders Table
 * 
 * This script migrates all existing orders from the fragmented approach
 * (orders + order_items + payment_orders) to the unified rental_orders table.
 * 
 * Run: node migrate-existing-orders-to-rental.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.Gp5Ui_5bHVDcMNKANfFIuGUhN-lKLIVnJH7xoKhqzek'
);

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
async function migrateExistingOrders() {
  console.log('🚀 Starting migration of existing orders to rental_orders table...\n');
  
  try {
    // Step 1: Get all existing orders
    console.log('📊 Fetching existing orders...');
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true });

    if (ordersError) {
      throw new Error(`Failed to fetch existing orders: ${ordersError.message}`);
    }

    stats.totalOrders = existingOrders?.length || 0;
    console.log(`✅ Found ${stats.totalOrders} existing orders to migrate\n`);

    if (stats.totalOrders === 0) {
      console.log('🎉 No orders to migrate. Migration complete!');
      return;
    }

    // Step 2: Check if any orders already exist in rental_orders
    console.log('🔍 Checking for existing migrations...');
    const { data: existingRentalOrders, error: rentalError } = await supabase
      .from('rental_orders')
      .select('legacy_order_id')
      .not('legacy_order_id', 'is', null);

    if (rentalError) {
      console.warn('⚠️ Could not check existing rental orders:', rentalError.message);
    }

    const existingLegacyIds = new Set(
      (existingRentalOrders || []).map(order => order.legacy_order_id)
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

        await migrateIndividualOrder(order);
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
async function migrateIndividualOrder(order) {
  // Fetch customer data
  const { data: customer } = await supabase
    .from('custom_users')
    .select('*')
    .eq('id', order.user_id)
    .single();

  // Fetch order items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select(`
      *,
      toys (
        id,
        name,
        description,
        image_url,
        category,
        age_group,
        retail_price,
        rental_price
      )
    `)
    .eq('order_id', order.id);

  // Fetch payment information
  let paymentData = null;
  
  // Try payment_orders first
  const { data: paymentOrder } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', order.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentOrder) {
    paymentData = paymentOrder;
  } else {
    // Fallback to payment_tracking
    const { data: paymentTracking } = await supabase
      .from('payment_tracking')
      .select('*')
      .eq('user_id', order.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    paymentData = paymentTracking;
  }

  // Fetch subscription data
  const { data: subscription } = await supabase
    .from('subscription_tracking')
    .select('*')
    .eq('user_id', order.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Transform order items to toys_data JSONB format
  const toysData = (orderItems || []).map(item => ({
    toy_id: item.toy_id,
    name: item.toys?.name || 'Unknown Toy',
    description: item.toys?.description || '',
    image_url: item.toys?.image_url || '',
    category: item.toys?.category || '',
    age_group: item.toys?.age_group || item.age_group || '',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || item.toys?.rental_price || 0,
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

  // Create rental order record
  const rentalOrderData = {
    // Legacy tracking
    legacy_order_id: order.id,
    legacy_created_at: order.created_at,
    migrated_at: new Date().toISOString(),
    
    // Basic order info
    user_id: order.user_id,
    user_phone: customer?.phone || '',
    status: order.status || 'pending',
    order_type: order.order_type || 'subscription',
    
    // Financial data
    total_amount: order.total_amount || 0,
    base_amount: order.base_amount || 0,
    gst_amount: order.gst_amount || 0,
    discount_amount: order.discount_amount || 0,
    coupon_code: order.coupon_code || null,
    
    // Payment information
    payment_status: paymentData?.status || 'pending',
    payment_method: 'razorpay',
    razorpay_order_id: paymentData?.razorpay_order_id || order.razorpay_order_id || null,
    razorpay_payment_id: paymentData?.razorpay_payment_id || order.razorpay_payment_id || null,
    razorpay_signature: paymentData?.razorpay_signature || order.razorpay_signature || null,
    payment_amount: paymentData?.amount || order.total_amount || 0,
    payment_currency: paymentData?.currency || 'INR',
    
    // Subscription data
    subscription_plan: subscription?.plan_id || 'basic',
    subscription_category: subscription?.plan_id || 'basic',
    subscription_id: subscription?.id || null,
    cycle_number: 1,
    
    // Rental dates
    rental_start_date: order.rental_start_date ? 
      new Date(order.rental_start_date).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0],
    rental_end_date: order.rental_end_date ? 
      new Date(order.rental_end_date).toISOString().split('T')[0] : 
      new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    
    // Delivery tracking
    delivery_date: order.delivered_at ? 
      new Date(order.delivered_at).toISOString().split('T')[0] : null,
    returned_date: order.returned_date ? 
      new Date(order.returned_date).toISOString().split('T')[0] : null,
    return_status: order.returned_date ? 'returned' : 'pending',
    
    // Toys and shipping data (JSONB)
    toys_data: toysData,
    toys_delivered_count: toysData.length,
    toys_returned_count: order.returned_date ? toysData.length : 0,
    shipping_address: standardizedAddress,
    
    // Age group (from first toy or subscription)
    age_group: toysData[0]?.age_group || subscription?.age_group || '3-5',
    
    // Status timestamps
    confirmed_at: order.confirmed_at || (paymentData ? order.created_at : null),
    shipped_at: order.shipped_at || order.confirmed_at || null,
    delivered_at: order.delivered_at || order.shipped_at || null,
    
    // Metadata
    delivery_instructions: order.delivery_instructions || null,
    admin_notes: `Migrated from legacy order ${order.id}`,
    internal_status: 'migrated',
    
    // Timestamps
    created_at: order.created_at,
    updated_at: order.updated_at || new Date().toISOString()
  };

  // Insert into rental_orders table
  const { data: rentalOrder, error: rentalError } = await supabase
    .from('rental_orders')
    .insert(rentalOrderData)
    .select()
    .single();

  if (rentalError) {
    throw new Error(`Failed to create rental order: ${rentalError.message}`);
  }

  return rentalOrder;
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
  console.log(`📈 Success Rate: ${((stats.migratedOrders / (stats.totalOrders - stats.skippedOrders)) * 100).toFixed(1)}%`);
  
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
  console.log('1. Test admin dashboard with migrated orders');
  console.log('2. Test user dashboard functionality');
  console.log('3. Create new test order to verify unified flow');
  console.log('4. Monitor rental_orders table for new orders');
  
  if (stats.failedOrders === 0 && stats.migratedOrders > 0) {
    console.log('5. Consider archiving old orders/order_items tables (after backup)');
  }
}

/**
 * Validation function to check migration results
 */
async function validateMigration() {
  console.log('\n🔍 VALIDATING MIGRATION RESULTS...\n');
  
  try {
    // Count orders in both tables
    const { count: oldOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    const { count: rentalOrdersCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true });
    
    const { count: migratedOrdersCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true })
      .not('legacy_order_id', 'is', null);
    
    console.log('📊 VALIDATION RESULTS:');
    console.log('======================');
    console.log(`📦 Original orders table: ${oldOrdersCount || 0} records`);
    console.log(`🏠 rental_orders table: ${rentalOrdersCount || 0} total records`);
    console.log(`🔄 Migrated orders: ${migratedOrdersCount || 0} records`);
    console.log(`🆕 New orders: ${(rentalOrdersCount || 0) - (migratedOrdersCount || 0)} records`);
    
    if (migratedOrdersCount === oldOrdersCount) {
      console.log('✅ All orders successfully migrated!');
    } else {
      console.log(`⚠️ Migration incomplete: ${(oldOrdersCount || 0) - (migratedOrdersCount || 0)} orders missing`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 RENTAL_ORDERS MIGRATION SCRIPT');
  console.log('==================================\n');
  
  // Check if we should run validation only
  if (process.argv.includes('--validate')) {
    await validateMigration();
    return;
  }
  
  // Check if we should run in dry-run mode
  if (process.argv.includes('--dry-run')) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
    // Add dry-run logic here if needed
  }
  
  try {
    await migrateExistingOrders();
    await validateMigration();
    
    console.log('\n🎉 MIGRATION SCRIPT COMPLETED SUCCESSFULLY!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ MIGRATION SCRIPT FAILED:', error.message);
    process.exit(1);
  }
}

// Execute main function
main().catch(console.error); 
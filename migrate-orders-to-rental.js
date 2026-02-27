import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
);

// Migration statistics
let stats = {
  totalOrders: 0,
  migratedOrders: 0,
  failedOrders: 0,
  totalToys: 0,
  userCycles: new Map()
};

// Helper function to convert timestamp to date
function toDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString().split('T')[0];
}

// Helper function to get cycle number for user
function getUserCycleNumber(userId) {
  if (!stats.userCycles.has(userId)) {
    stats.userCycles.set(userId, 0);
  }
  const currentCycle = stats.userCycles.get(userId) + 1;
  stats.userCycles.set(userId, currentCycle);
  return currentCycle;
}

// Helper function to determine payment status
function getPaymentStatus(orderStatus) {
  switch (orderStatus) {
    case 'confirmed':
    case 'delivered':
    case 'shipped':
      return 'paid';
    case 'cancelled':
      return 'refunded';
    default:
      return 'pending';
  }
}

// Helper function to determine return status
function getReturnStatus(order) {
  if (order.returned_date) return 'complete';
  
  const rentalEndDate = new Date(order.rental_end_date || order.created_at);
  const today = new Date();
  
  if (rentalEndDate < today && !order.returned_date) {
    return 'overdue';
  }
  
  return 'pending';
}

// Fetch and aggregate toys data for an order
async function getToysDataForOrder(orderId) {
  try {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        id,
        toy_id,
        quantity,
        rental_price,
        unit_price,
        total_price,
        subscription_category,
        age_group,
        toys (
          id,
          name,
          category,
          brand,
          image_url
        )
      `)
      .eq('order_id', orderId);

    if (error) {
      console.error(`Error fetching order items for ${orderId}:`, error);
      return [];
    }

    return (orderItems || []).map(item => ({
      toy_id: item.toy_id,
      name: item.toys?.name || 'Unknown Toy',
      category: item.toys?.category || 'Unknown',
      brand: item.toys?.brand || '',
      image_url: item.toys?.image_url || '',
      quantity: item.quantity || 1,
      rental_price: item.rental_price || item.unit_price || item.total_price || 0,
      subscription_category: item.subscription_category || '',
      age_group: item.age_group || '',
      returned: false
    }));
  } catch (error) {
    console.error(`Exception fetching toys for order ${orderId}:`, error);
    return [];
  }
}

// Migrate a single order
async function migrateOrder(order) {
  try {
    console.log(`Migrating order ${order.id}...`);
    
    // Get cycle number for this user
    const cycleNumber = getUserCycleNumber(order.user_id);
    
    // Get toys data
    const toysData = await getToysDataForOrder(order.id);
    stats.totalToys += toysData.length;
    
    // Prepare rental dates
    const rentalStartDate = toDate(order.rental_start_date || order.created_at);
    const rentalEndDate = toDate(order.rental_end_date || 
      new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000));
    
    // Create order number
    const orderNumber = `ORD-${Math.floor(new Date(order.created_at).getTime() / 1000)}-${order.id.substring(0, 8)}`;
    
    // Prepare rental order data
    const rentalOrderData = {
      legacy_order_id: order.id,
      legacy_created_at: order.created_at,
      user_id: order.user_id,
      order_number: orderNumber,
      status: order.status || 'pending',
      order_type: order.order_type || 'subscription',
      subscription_plan: order.subscription_plan,
      total_amount: parseFloat(order.total_amount || 0),
      base_amount: parseFloat(order.base_amount || 0),
      gst_amount: parseFloat(order.gst_amount || 0),
      discount_amount: parseFloat(order.discount_amount || 0),
      payment_status: getPaymentStatus(order.status),
      cycle_number: cycleNumber,
      rental_start_date: rentalStartDate,
      rental_end_date: rentalEndDate,
      returned_date: toDate(order.returned_date),
      return_status: getReturnStatus(order),
      toys_data: toysData,
      toys_delivered_count: toysData.length,
      toys_returned_count: order.returned_date ? toysData.length : 0,
      shipping_address: order.shipping_address || {},
      subscription_category: toysData[0]?.subscription_category || null,
      age_group: toysData[0]?.age_group || null,
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at
    };
    
    // Insert into rental_orders
    const { data, error } = await supabase
      .from('rental_orders')
      .insert([rentalOrderData])
      .select();
    
    if (error) {
      console.error(`Failed to insert order ${order.id}:`, error);
      stats.failedOrders++;
      return false;
    }
    
    stats.migratedOrders++;
    
    // Log progress every 50 orders
    if (stats.migratedOrders % 50 === 0) {
      console.log(`✅ Migrated ${stats.migratedOrders} orders so far...`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Exception migrating order ${order.id}:`, error);
    stats.failedOrders++;
    return false;
  }
}

// Main migration function
async function migrateAllOrders() {
  console.log('🚀 Starting order migration to rental_orders table...\n');
  
  try {
    // Clear existing data (optional)
    console.log('🧹 Clearing existing rental_orders data...');
    const { error: clearError } = await supabase
      .from('rental_orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (clearError) {
      console.warn('Warning clearing existing data:', clearError);
    }
    
    // Fetch all orders with user_id
    console.log('📋 Fetching orders from database...');
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        total_amount,
        base_amount,
        gst_amount,
        discount_amount,
        rental_start_date,
        rental_end_date,
        returned_date,
        shipping_address,
        created_at,
        updated_at,
        order_type
      `)
      .not('user_id', 'is', null)
      .order('user_id, created_at');
    
    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }
    
    stats.totalOrders = orders.length;
    console.log(`📊 Found ${stats.totalOrders} orders to migrate\n`);
    
    // Migrate orders in batches
    const batchSize = 10;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(orders.length / batchSize)}...`);
      
      // Process batch in parallel
      const promises = batch.map(order => migrateOrder(order));
      await Promise.all(promises);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final statistics
    console.log('\n🎉 Migration completed!');
    console.log('📊 Final Statistics:');
    console.log(`   Total orders: ${stats.totalOrders}`);
    console.log(`   Migrated successfully: ${stats.migratedOrders}`);
    console.log(`   Failed: ${stats.failedOrders}`);
    console.log(`   Total toys migrated: ${stats.totalToys}`);
    console.log(`   Unique users: ${stats.userCycles.size}`);
    
    // Show cycle distribution
    console.log('\n📈 Cycle distribution:');
    const cycleCounts = {};
    for (const cycles of stats.userCycles.values()) {
      cycleCounts[cycles] = (cycleCounts[cycles] || 0) + 1;
    }
    
    Object.entries(cycleCounts)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([cycles, count]) => {
        console.log(`   Users with ${cycles} cycles: ${count}`);
      });
    
    // Test the migrated data
    await testMigratedData();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Test the migrated data
async function testMigratedData() {
  console.log('\n🧪 Testing migrated data...');
  
  try {
    // Count migrated orders
    const { count: totalCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Total rental orders in database: ${totalCount}`);
    
    // Test cycle function
    const { data: sampleOrder } = await supabase
      .from('rental_orders')
      .select('user_id')
      .limit(1)
      .single();
    
    if (sampleOrder) {
      const { data: cycleData, error: cycleError } = await supabase
        .rpc('get_user_current_cycle', { user_id_param: sampleOrder.user_id });
      
      if (cycleError) {
        console.warn('⚠️ Cycle function test failed:', cycleError);
      } else if (cycleData && cycleData.length > 0) {
        console.log(`✅ Cycle function test passed: User has cycle ${cycleData[0].cycle_number}`);
      } else {
        console.log('ℹ️ No active cycle found for test user (normal)');
      }
    }
    
    // Check selection window users
    const { data: selectionUsers } = await supabase
      .from('rental_orders_with_cycle_info')
      .select('user_id')
      .eq('is_selection_window_active', true);
    
    console.log(`✅ Users in selection window: ${selectionUsers?.length || 0}`);
    
    console.log('\n🎯 Migration verification complete!');
    console.log('🚀 System is ready for dashboard integration!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
  }
}

// Run the migration
migrateAllOrders().catch(console.error); 
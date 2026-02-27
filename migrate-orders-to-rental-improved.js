import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
);

// Configuration options
const CONFIG = {
  CLEAR_EXISTING_DATA: true, // Set to false to append instead of replace
  BATCH_SIZE: 20, // Number of orders to process in parallel
  PROGRESS_INTERVAL: 25, // Show progress every N orders
  MAX_ORDERS: null, // Set to number to limit orders, null for all
  INCLUDE_TOYS: true // Set to false for faster migration without toys data
};

// Migration statistics
let stats = {
  totalOrders: 0,
  migratedOrders: 0,
  failedOrders: 0,
  totalToys: 0,
  userCycles: new Map(),
  startTime: Date.now()
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
  if (!CONFIG.INCLUDE_TOYS) {
    return []; // Skip toys data for faster migration
  }

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
    
    // Log progress
    if (stats.migratedOrders % CONFIG.PROGRESS_INTERVAL === 0) {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.migratedOrders / elapsed;
      const remaining = stats.totalOrders - stats.migratedOrders;
      const eta = remaining / rate;
      
      console.log(`✅ Migrated ${stats.migratedOrders}/${stats.totalOrders} orders (${rate.toFixed(1)}/sec, ETA: ${Math.round(eta)}s)`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Exception migrating order ${order.id}:`, error);
    stats.failedOrders++;
    return false;
  }
}

// Check existing data
async function checkExistingData() {
  const { count } = await supabase
    .from('rental_orders')
    .select('*', { count: 'exact', head: true });
  
  return count || 0;
}

// Clear existing data
async function clearExistingData() {
  console.log('🧹 Clearing existing rental_orders data...');
  
  const { error } = await supabase
    .from('rental_orders')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (error) {
    console.error('❌ Error clearing existing data:', error);
    throw error;
  }
  
  console.log('✅ Existing data cleared');
}

// Fetch all orders with pagination to handle large datasets
async function fetchAllOrders() {
  console.log('📋 Fetching orders from database...');
  
  let allOrders = [];
  let from = 0;
  const pageSize = 1000; // Fetch in chunks of 1000
  
  while (true) {
    console.log(`   Fetching orders ${from + 1} to ${from + pageSize}...`);
    
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
      .order('user_id, created_at')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching orders:', error);
      throw error;
    }
    
    if (!orders || orders.length === 0) {
      break; // No more orders
    }
    
    allOrders = allOrders.concat(orders);
    console.log(`   Found ${orders.length} orders in this batch (total: ${allOrders.length})`);
    
    if (orders.length < pageSize) {
      break; // Last page
    }
    
    from += pageSize;
    
    // Apply limit if specified
    if (CONFIG.MAX_ORDERS && allOrders.length >= CONFIG.MAX_ORDERS) {
      allOrders = allOrders.slice(0, CONFIG.MAX_ORDERS);
      break;
    }
  }
  
  return allOrders;
}

// Main migration function
async function migrateAllOrders() {
  console.log('🚀 Starting IMPROVED order migration to rental_orders table...\n');
  console.log('📋 Configuration:');
  console.log(`   Clear existing data: ${CONFIG.CLEAR_EXISTING_DATA}`);
  console.log(`   Batch size: ${CONFIG.BATCH_SIZE}`);
  console.log(`   Include toys data: ${CONFIG.INCLUDE_TOYS}`);
  console.log(`   Max orders: ${CONFIG.MAX_ORDERS || 'All'}\n`);
  
  try {
    // Check existing data
    const existingCount = await checkExistingData();
    console.log(`📊 Existing rental_orders in database: ${existingCount}`);
    
    if (existingCount > 0) {
      if (CONFIG.CLEAR_EXISTING_DATA) {
        await clearExistingData();
      } else {
        console.log('⚠️ Existing data will be preserved (append mode)');
      }
    }
    
    // Fetch all orders with pagination
    const orders = await fetchAllOrders();
    
    stats.totalOrders = orders.length;
    console.log(`📊 Found ${stats.totalOrders} orders to migrate\n`);
    
    if (stats.totalOrders === 0) {
      console.log('❌ No orders found to migrate!');
      return;
    }
    
    // Reset user cycles for proper counting
    stats.userCycles.clear();
    
    // Migrate orders in batches
    for (let i = 0; i < orders.length; i += CONFIG.BATCH_SIZE) {
      const batch = orders.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(orders.length / CONFIG.BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} orders)...`);
      
      // Process batch in parallel
      const promises = batch.map(order => migrateOrder(order));
      await Promise.all(promises);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Final statistics
    const totalTime = (Date.now() - stats.startTime) / 1000;
    const avgRate = stats.migratedOrders / totalTime;
    
    console.log('\n🎉 Migration completed!');
    console.log('📊 Final Statistics:');
    console.log(`   Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`   Average rate: ${avgRate.toFixed(1)} orders/second`);
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
    
    // Show sample migrated order
    const { data: sampleMigratedOrder } = await supabase
      .from('rental_orders')
      .select('order_number, cycle_number, toys_delivered_count, status')
      .limit(1)
      .single();
    
    if (sampleMigratedOrder) {
      console.log(`✅ Sample migrated order: ${sampleMigratedOrder.order_number} (Cycle ${sampleMigratedOrder.cycle_number}, ${sampleMigratedOrder.toys_delivered_count} toys, ${sampleMigratedOrder.status})`);
    }
    
    console.log('\n🎯 Migration verification complete!');
    console.log('🚀 System is ready for dashboard integration!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
  }
}

// Run the migration
migrateAllOrders().catch(console.error); 
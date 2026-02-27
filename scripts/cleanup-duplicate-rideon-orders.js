import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanupDuplicateRideOnOrders() {
  console.log('🔍 Starting cleanup of duplicate ride-on orders...');
  
  try {
    // Find all ride-on orders grouped by user and payment
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, 
        user_id, 
        total_amount, 
        status,
        created_at,
        order_items!inner(toy_id, ride_on_toy_id)
      `)
      .eq('order_type', 'subscription')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`📦 Found ${orders.length} total orders`);

    // Group orders by user_id and total_amount to find potential duplicates
    const orderGroups = {};
    
    orders.forEach(order => {
      // Only check orders with ride-on toys
      const hasRideOnToy = order.order_items.some(item => item.ride_on_toy_id);
      if (!hasRideOnToy) return;

      const key = `${order.user_id}-${order.total_amount}`;
      if (!orderGroups[key]) {
        orderGroups[key] = [];
      }
      orderGroups[key].push(order);
    });

    // Find groups with duplicates
    const duplicateGroups = Object.entries(orderGroups).filter(([key, orders]) => orders.length > 1);
    
    console.log(`🔍 Found ${duplicateGroups.length} groups with potential duplicates:`);
    
    for (const [key, duplicateOrders] of duplicateGroups) {
      console.log(`\n👤 User Group: ${key}`);
      console.log(`   Orders found: ${duplicateOrders.length}`);
      
      // Sort by creation time, keep the first one (oldest)
      duplicateOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      console.log('   📋 Order details:');
      duplicateOrders.forEach((order, index) => {
        console.log(`     ${index + 1}. Order ID: ${order.id.slice(0, 8)}... | Created: ${order.created_at} | Amount: ₹${order.total_amount} | Status: ${order.status}`);
      });

      // Ask which orders to remove (all except the first one)
      const ordersToRemove = duplicateOrders.slice(1);
      
      if (ordersToRemove.length > 0) {
        console.log(`\n   🗑️  Will remove ${ordersToRemove.length} duplicate orders:`);
        
        for (const orderToRemove of ordersToRemove) {
          console.log(`     Removing: ${orderToRemove.id.slice(0, 8)}...`);
          
          // Remove order items first
          const { error: itemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderToRemove.id);
            
          if (itemsError) {
            console.error(`     ❌ Error removing order items: ${itemsError.message}`);
            continue;
          }
          
          // Remove the order
          const { error: orderError } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderToRemove.id);
            
          if (orderError) {
            console.error(`     ❌ Error removing order: ${orderError.message}`);
          } else {
            console.log(`     ✅ Removed duplicate order ${orderToRemove.id.slice(0, 8)}...`);
          }
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    
    // Show remaining orders summary
    const { data: remainingOrders, error: remainingError } = await supabase
      .from('orders')
      .select(`
        id, 
        user_id, 
        total_amount, 
        status,
        created_at,
        order_items!inner(toy_id, ride_on_toy_id)
      `)
      .eq('order_type', 'subscription')
      .order('created_at', { ascending: false });

    if (!remainingError) {
      const rideOnOrders = remainingOrders.filter(order => 
        order.order_items.some(item => item.ride_on_toy_id)
      );
      
      console.log(`\n📊 Summary:`);
      console.log(`   Total orders remaining: ${remainingOrders.length}`);
      console.log(`   Ride-on orders remaining: ${rideOnOrders.length}`);
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateRideOnOrders(); 
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicateOrders() {
  console.log('🔍 Checking for duplicate ride-on orders...');
  
  try {
    // Get all orders with their items
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, 
        user_id, 
        total_amount, 
        status,
        order_type,
        created_at,
        order_items(toy_id, ride_on_toy_id, quantity, unit_price)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`📦 Total orders found: ${orders.length}`);

    // Filter ride-on orders
    const rideOnOrders = orders.filter(order => 
      order.order_items && order.order_items.some(item => item.ride_on_toy_id)
    );

    console.log(`🏍️ Ride-on orders found: ${rideOnOrders.length}`);

    if (rideOnOrders.length === 0) {
      console.log('✅ No ride-on orders found.');
      return;
    }

    // Group by user and amount to find potential duplicates
    const userGroups = {};
    
    rideOnOrders.forEach(order => {
      const userId = order.user_id;
      if (!userGroups[userId]) {
        userGroups[userId] = [];
      }
      userGroups[userId].push(order);
    });

    console.log(`\n👥 Users with ride-on orders: ${Object.keys(userGroups).length}`);

    // Check each user for duplicates
    let duplicatesFound = false;
    
    for (const [userId, userOrders] of Object.entries(userGroups)) {
      if (userOrders.length > 1) {
        duplicatesFound = true;
        console.log(`\n🚨 User ${userId} has ${userOrders.length} ride-on orders:`);
        
        userOrders.forEach((order, index) => {
          const rideOnToys = order.order_items.filter(item => item.ride_on_toy_id);
          console.log(`   ${index + 1}. Order: ${order.id.slice(0, 8)}...`);
          console.log(`      Created: ${order.created_at}`);
          console.log(`      Amount: ₹${order.total_amount}`);
          console.log(`      Status: ${order.status}`);
          console.log(`      Ride-on toys: ${rideOnToys.length}`);
          rideOnToys.forEach(item => {
            console.log(`        - Toy ID: ${item.ride_on_toy_id}`);
          });
        });

        // Check if orders are created within a short timeframe (likely duplicates)
        const sortedOrders = userOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevTime = new Date(sortedOrders[i-1].created_at);
          const currTime = new Date(sortedOrders[i].created_at);
          const timeDiff = (currTime - prevTime) / 1000; // seconds
          
          if (timeDiff < 300) { // Within 5 minutes
            console.log(`      ⚠️  Orders ${i} and ${i+1} created ${timeDiff}s apart - likely duplicates!`);
          }
        }
      } else {
        console.log(`✅ User ${userId}: 1 ride-on order (no duplicates)`);
      }
    }

    if (!duplicatesFound) {
      console.log('\n🎉 No duplicate ride-on orders found!');
    } else {
      console.log('\n❗ Duplicates detected! Run cleanup-duplicate-rideon-orders.js to remove them.');
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Ride-on orders: ${rideOnOrders.length}`);
    console.log(`   Users with ride-on orders: ${Object.keys(userGroups).length}`);
    console.log(`   Users with multiple orders: ${Object.values(userGroups).filter(orders => orders.length > 1).length}`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDuplicateOrders(); 
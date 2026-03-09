import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSpecificDuplicates() {
  console.log('🔍 Checking the specific duplicate orders...');
  
  try {
    // Get the recent orders for the user instead of using hardcoded IDs
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'a2ff606e-a625-4a03-852f-3da91da3e0f6')
      .gte('created_at', '2025-06-27T23:54:00')
      .lte('created_at', '2025-06-27T23:56:00')
      .order('created_at', { ascending: true });
      
    if (recentError || !recentOrders || recentOrders.length === 0) {
      console.error('❌ No recent orders found:', recentError);
      return;
    }
    
    console.log(`Found ${recentOrders.length} orders from the timeframe`);
    
    for (const order of recentOrders) {
      console.log(`\n📦 Checking order: ${order.id.slice(0, 8)}...`);
        
            console.log(`   Amount: ₹${order.total_amount}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.created_at}`);
      
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
        
      if (itemsError) {
        console.error(`❌ Error fetching items: ${itemsError.message}`);
      } else {
        console.log(`   Items: ${items.length}`);
        items.forEach((item, index) => {
          console.log(`     ${index + 1}. Toy: ${item.toy_id || 'N/A'}`);
          console.log(`        Ride-on: ${item.ride_on_toy_id || 'N/A'}`);
          console.log(`        Price: ₹${item.unit_price || item.total_price || 'N/A'}`);
        });
      }
    }
    
    // Determine which to keep and which to remove
    if (recentOrders.length >= 2) {
      const olderOrder = recentOrders[0];
      const newerOrder = recentOrders[1];
      
      console.log(`\n🔧 RECOMMENDED ACTION:`);
      console.log(`   Keep: ${olderOrder.id.slice(0, 8)}... (older)`);
      console.log(`   Remove: ${newerOrder.id.slice(0, 8)}... (newer duplicate)`);
      console.log(`   \n   Run cleanup with: node scripts/cleanup-specific-duplicate.js ${newerOrder.id}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkSpecificDuplicates(); 
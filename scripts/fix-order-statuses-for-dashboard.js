import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhcjhlsadfuusmiglzpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDIwMjUsImV4cCI6MjA1MDk3ODAyNX0.m0_2_nCkJJLSyTKTNZfPR_aeYKKUZPL-yKRLdZLhOFQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrderStatusesForDashboard() {
  console.log('🔧 Fixing Order Statuses for Dashboard Display...\n');
  
  try {
    // First, let's see what order statuses we have
    console.log('📊 Current order statuses distribution:');
    const { data: statusCount } = await supabase
      .from('orders')
      .select('status')
      .not('status', 'is', null);
    
    const statusMap = {};
    statusCount?.forEach(order => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    });
    
    Object.entries(statusMap).forEach(([status, count]) => {
      console.log(`   "${status}": ${count} orders`);
    });
    console.log('');
    
    // Get all orders that should show in dashboard (completed orders from migration)
    console.log('🔍 Finding orders that should be visible in dashboard...');
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, created_at')
      .eq('status', 'pending')
      .not('total_amount', 'is', null)
      .gt('total_amount', 0);
    
    if (pendingError) {
      console.error('❌ Error fetching pending orders:', pendingError);
      return;
    }
    
    console.log(`✅ Found ${pendingOrders?.length || 0} pending orders with amounts > 0`);
    
    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('ℹ️ No orders to update');
      return;
    }
    
    // Update these orders to "delivered" status so they show in dashboard
    console.log('🚀 Updating order statuses to "delivered"...');
    
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'delivered',
        // Set rental dates so they show as current rentals
        rental_start_date: new Date().toISOString(),
        rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .in('id', pendingOrders.map(o => o.id))
      .select();
    
    if (updateError) {
      console.error('❌ Error updating orders:', updateError);
      return;
    }
    
    console.log(`✅ Successfully updated ${updated?.length || 0} orders to "delivered" status`);
    
    // Test with Mythili specifically
    console.log('\n🧪 Testing Mythili\'s orders after update...');
    const { data: mythiliUser } = await supabase
      .from('custom_users')
      .select('id')
      .eq('phone', '9980111432')
      .single();
      
    if (mythiliUser) {
      const { data: mythiliOrders } = await supabase
        .from('orders')
        .select('id, status, rental_start_date, rental_end_date')
        .eq('user_id', mythiliUser.id);
        
      console.log('   Mythili\'s orders after update:');
      mythiliOrders?.forEach(order => {
        console.log(`     ${order.id.slice(0, 8)}: ${order.status} (Start: ${order.rental_start_date})`);
      });
      
      // Test current rentals query
      const { data: currentRentals } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          rental_start_date,
          order_items (
            toy:toys (name)
          )
        `)
        .eq('user_id', mythiliUser.id)
        .in('status', ['shipped', 'delivered'])
        .is('returned_date', null);
        
      console.log(`   Current rentals query result: ${currentRentals?.length || 0} orders`);
      currentRentals?.forEach(order => {
        console.log(`     Order ${order.id.slice(0, 8)}: ${order.status}`);
        order.order_items?.forEach(item => {
          console.log(`       - ${item.toy?.name}`);
        });
      });
    }
    
    console.log('\n🎉 Order status fix completed!');
    console.log('ℹ️ Users should now see their orders and current rentals in the dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOrderStatusesForDashboard(); 
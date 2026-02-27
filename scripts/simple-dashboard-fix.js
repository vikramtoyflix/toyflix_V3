// Simple script to fix dashboard by updating order statuses
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bhcjhlsadfuusmiglzpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDIwMjUsImV4cCI6MjA1MDk3ODAyNX0.m0_2_nCkJJLSyTKTNZfPR_aeYKKUZPL-yKRLdZLhOFQ'
);

console.log('🔧 Simple Dashboard Fix - Updating Order Statuses');
console.log('==================================================');

try {
  // Find Mythili's user ID
  console.log('1. Finding Mythili...');
  const { data: user } = await supabase
    .from('custom_users')
    .select('id, first_name')
    .eq('phone', '9980111432')
    .single();
  
  if (!user) {
    console.log('❌ Mythili not found');
    process.exit(1);
  }
  
  console.log(`✅ Found: ${user.first_name} (${user.id})`);
  
  // Check current orders
  console.log('\n2. Checking current orders...');
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .eq('user_id', user.id);
  
  console.log(`📦 Current orders: ${currentOrders?.length || 0}`);
  currentOrders?.forEach(order => {
    console.log(`   ${order.id.slice(0, 8)}: ${order.status} (₹${order.total_amount})`);
  });
  
  // Update pending orders to delivered
  console.log('\n3. Updating pending orders to delivered...');
  const pendingOrders = currentOrders?.filter(o => o.status === 'pending') || [];
  
  if (pendingOrders.length > 0) {
    const { data: updated } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        rental_start_date: new Date().toISOString(),
        rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .in('id', pendingOrders.map(o => o.id))
      .select('id, status');
    
    console.log(`✅ Updated ${updated?.length || 0} orders to delivered`);
  } else {
    console.log('ℹ️ No pending orders to update');
  }
  
  // Test dashboard queries
  console.log('\n4. Testing dashboard queries...');
  
  // Order History query
  const { data: orderHistory } = await supabase
    .from('orders')
    .select(`
      id, status, total_amount, created_at,
      order_items (
        toy:toys (name)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  console.log(`📋 Order History: ${orderHistory?.length || 0} orders`);
  orderHistory?.forEach(order => {
    const toyNames = order.order_items?.map(item => item.toy?.name).join(', ') || 'No toys';
    console.log(`   ${order.id.slice(0, 8)}: ${order.status} - ${toyNames}`);
  });
  
  // Current Rentals query
  const { data: currentRentals } = await supabase
    .from('orders')
    .select(`
      id, status, rental_start_date,
      order_items (
        toy:toys (name, image_url, category, age_range)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['shipped', 'delivered'])
    .is('returned_date', null)
    .order('created_at', { ascending: false });
  
  console.log(`🏠 Current Rentals: ${currentRentals?.length || 0} orders`);
  
  // Flatten like frontend
  const flatRentals = [];
  currentRentals?.forEach(order => {
    order.order_items?.forEach(item => {
      flatRentals.push({
        orderId: order.id.slice(0, 8),
        toy: item.toy?.name,
        status: order.status
      });
    });
  });
  
  console.log(`🏠 Flattened Rentals: ${flatRentals.length} toys`);
  flatRentals.forEach(rental => {
    console.log(`   ${rental.toy} (${rental.status})`);
  });
  
  console.log('\n==================================================');
  console.log('🎉 Dashboard Fix Complete!');
  console.log('');
  console.log('📱 Expected Dashboard Results:');
  console.log(`   📋 Order History: ${orderHistory?.length || 0} orders visible`);
  console.log(`   🏠 Toys at Home: ${flatRentals.length} toys visible`);
  console.log('');
  console.log('🔗 Test at: http://localhost:8082');
  console.log('📞 Login: 9980111432');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhcjhlsadfuusmiglzpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDIwMjUsImV4cCI6MjA1MDk3ODAyNX0.m0_2_nCkJJLSyTKTNZfPR_aeYKKUZPL-yKRLdZLhOFQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMythiliDashboard() {
  console.log('🔍 Debugging Mythili Dashboard Data...\n');
  
  try {
    // Find Mythili's user ID
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('id, first_name, last_name, phone, email')
      .eq('phone', '9980111432')
      .single();
      
    if (userError || !user) {
      console.log('❌ User not found:', userError);
      return;
    }
    
    console.log('👤 User found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Phone:', user.phone);
    console.log('   Email:', user.email);
    console.log('');
    
    // Check orders - exactly like the frontend hook
    console.log('📦 Checking Orders (like useUserOrders hook)...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          toy:toys (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (ordersError) {
      console.log('❌ Orders error:', ordersError);
    } else {
      console.log('✅ Orders found:', orders?.length || 0);
      orders?.forEach((order, index) => {
        console.log(`   Order ${index + 1}:`);
        console.log('     ID:', order.id.slice(0, 8) + '...');
        console.log('     Status:', order.status);
        console.log('     Amount:', order.total_amount);
        console.log('     Created:', order.created_at);
        console.log('     Items:', order.order_items?.length || 0);
        order.order_items?.forEach((item, itemIndex) => {
          console.log(`       Item ${itemIndex + 1}: ${item.toy?.name} (₹${item.rental_price})`);
        });
        console.log('');
      });
    }
    
    // Check current rentals - exactly like the frontend hook
    console.log('🏠 Checking Current Rentals (like useCurrentRentals hook)...');
    const { data: rentals, error: rentalsError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          toy:toys (
            id,
            name,
            image_url,
            category,
            age_range
          )
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['shipped', 'delivered'])
      .is('returned_date', null)
      .order('created_at', { ascending: false });
      
    if (rentalsError) {
      console.log('❌ Rentals error:', rentalsError);
    } else {
      console.log('✅ Rental orders found:', rentals?.length || 0);
      
      // Flatten the data like the frontend does
      const flatRentals = [];
      rentals?.forEach(order => {
        order.order_items?.forEach(item => {
          flatRentals.push({
            id: order.id,
            status: order.status,
            rental_start_date: order.rental_start_date || order.created_at,
            toy: item.toy
          });
        });
      });
      
      console.log('✅ Flat rentals found:', flatRentals.length);
      flatRentals.forEach((rental, index) => {
        console.log(`   Rental ${index + 1}:`);
        console.log('     Toy:', rental.toy?.name);
        console.log('     Status:', rental.status);
        console.log('     Start Date:', rental.rental_start_date);
        console.log('');
      });
    }
    
    // Check what statuses exist in orders
    console.log('📊 All order statuses for this user:');
    orders?.forEach(order => {
      console.log(`   ${order.id.slice(0, 8)}: "${order.status}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugMythiliDashboard(); 
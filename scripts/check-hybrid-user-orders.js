import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkHybridUserOrders() {
  console.log('🔍 Checking for hybrid user orders (Supabase + WooCommerce)...');
  
  try {
    // Find the user who has ride-on orders
    const { data: rideOnOrder, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, user_id, total_amount, status, created_at,
        order_items!inner(ride_on_toy_id)
      `)
      .not('order_items.ride_on_toy_id', 'is', null)
      .single();

    if (orderError || !rideOnOrder) {
      console.log('❌ No ride-on orders found');
      return;
    }

    const userId = rideOnOrder.user_id;
    console.log(`👤 Found ride-on order user: ${userId}`);
    console.log(`📦 Supabase order: ${rideOnOrder.id.slice(0, 8)}... (₹${rideOnOrder.total_amount})`);

    // Check user details
    const { data: userData, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }

    console.log(`📱 User details:`, {
      phone: userData.phone,
      email: userData.email,
      first_name: userData.first_name,
      source: userData.source,
      has_woocommerce_data: userData.has_woocommerce_data,
      wc_user_id: userData.wc_user_id
    });

    // Check all Supabase orders for this user
    const { data: allSupabaseOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, order_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (allOrdersError) {
      console.error('❌ Error fetching all orders:', allOrdersError);
    } else {
      console.log(`\n📦 All Supabase orders for this user (${allSupabaseOrders.length}):`);
      allSupabaseOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... | ₹${order.total_amount} | ${order.status} | ${order.created_at} | ${order.order_type || 'N/A'}`);
      });
    }

    // Check for subscription tracking
    const { data: subscriptions, error: subError } = await supabase
      .from('subscription_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
    } else {
      console.log(`\n🔄 Subscription tracking records (${subscriptions.length}):`);
      subscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.id.slice(0, 8)}... | Type: ${sub.subscription_type} | Amount: ₹${sub.payment_amount} | Status: ${sub.status}`);
        if (sub.ride_on_toy_id) {
          console.log(`      🏍️ Ride-on toy: ${sub.ride_on_toy_id}`);
        }
      });
    }

    // Check if user might have WooCommerce data
    if (userData.source === 'woocommerce' || userData.has_woocommerce_data || userData.wc_user_id) {
      console.log(`\n⚠️  HYBRID USER DETECTED!`);
      console.log(`   This user has WooCommerce data flags set.`);
      console.log(`   The dashboard might be showing orders from BOTH systems:`);
      console.log(`   1. Supabase orders (new system) - ${allSupabaseOrders.length} orders`);
      console.log(`   2. WooCommerce orders (legacy system) - unknown count`);
      console.log(`\n💡 This explains why you see 2 orders in the dashboard!`);
      
      // Suggest solution
      console.log(`\n🔧 SOLUTION OPTIONS:`);
      console.log(`   A) Update user flags to disable WooCommerce data lookup`);
      console.log(`   B) Modify dashboard to deduplicate hybrid orders`);
      console.log(`   C) Check WooCommerce system for legacy orders`);
    } else {
      console.log(`\n✅ User is Supabase-only (no WooCommerce data)`);
      console.log(`   Dashboard should only show Supabase orders.`);
      console.log(`   If seeing duplicates, check for other issues.`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkHybridUserOrders(); 
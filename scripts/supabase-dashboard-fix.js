import { createClient } from '@supabase/supabase-js';

// Use the service role key for admin operations
const supabaseUrl = 'https://bhcjhlsadfuusmiglzpq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTQwMjAyNSwiZXhwIjoyMDUwOTc4MDI1fQ.4xNJ0AqG6jN6JGVLk5zWGiALCKKdJYBGnKfYeULLXHk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixDashboard() {
  console.log('🔧 Fixing Dashboard with Supabase Client...\n');
  
  try {
    const authUserId = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';
    
    // Step 1: Find current user with phone 9980111432
    console.log('📊 STEP 1: Finding current user...');
    const { data: currentUsers, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', '9980111432');
    
    if (userError) {
      console.error('❌ Error finding users:', userError);
      return;
    }
    
    console.log(`📱 Found ${currentUsers?.length || 0} users with phone 9980111432`);
    
    if (!currentUsers || currentUsers.length === 0) {
      console.log('❌ No users found with this phone number');
      return;
    }
    
    const currentUser = currentUsers[0];
    console.log(`👤 Current user: ${currentUser.first_name} ${currentUser.last_name} (${currentUser.id})`);
    
    // Check if authenticated user already exists
    const { data: authUser } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    console.log(`🔍 Authenticated user exists: ${authUser ? 'YES' : 'NO'}`);
    
    // If authenticated user doesn't exist, we need to transfer data
    if (!authUser && currentUser.id !== authUserId) {
      console.log('\n🔧 STEP 2: Transferring data to authenticated user ID...');
      
      // Update orders
      const { data: updatedOrders, error: orderError } = await supabase
        .from('orders')
        .update({
          user_id: authUserId,
          status: 'delivered', // Change from pending to delivered
          rental_start_date: new Date().toISOString(),
          rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', currentUser.id)
        .select('id, status');
      
      if (orderError) {
        console.error('❌ Error updating orders:', orderError);
      } else {
        console.log(`✅ Updated ${updatedOrders?.length || 0} orders to delivered status`);
      }
      
      // Update subscriptions
      const { data: updatedSubs, error: subError } = await supabase
        .from('subscriptions')
        .update({
          user_id: authUserId,
          status: 'active'
        })
        .eq('user_id', currentUser.id)
        .select('id, status');
      
      if (subError) {
        console.error('❌ Error updating subscriptions:', subError);
      } else {
        console.log(`✅ Updated ${updatedSubs?.length || 0} subscriptions to active`);
      }
      
      // Update entitlements
      const { data: updatedEnts, error: entError } = await supabase
        .from('user_entitlements')
        .update({ user_id: authUserId })
        .eq('user_id', currentUser.id)
        .select('id');
      
      if (entError) {
        console.error('❌ Error updating entitlements:', entError);
      } else {
        console.log(`✅ Updated ${updatedEnts?.length || 0} entitlements`);
      }
      
      // Delete old user
      const { error: deleteError } = await supabase
        .from('custom_users')
        .delete()
        .eq('id', currentUser.id);
      
      if (deleteError) {
        console.error('❌ Error deleting old user:', deleteError);
      } else {
        console.log('✅ Deleted old user record');
      }
      
      // Create new user with authenticated ID
      const { error: insertError } = await supabase
        .from('custom_users')
        .insert({
          id: authUserId,
          phone: currentUser.phone,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          email: currentUser.email,
          phone_verified: currentUser.phone_verified || true,
          created_at: currentUser.created_at,
          updated_at: new Date().toISOString(),
          is_active: currentUser.is_active || true,
          role: currentUser.role || 'user',
          subscription_active: currentUser.subscription_active,
          subscription_plan: currentUser.subscription_plan
        });
      
      if (insertError) {
        console.error('❌ Error creating new user:', insertError);
      } else {
        console.log('✅ Created new user with authenticated ID');
      }
    }
    
    // Step 3: Verify the fix
    console.log('\n✅ STEP 3: Verifying the fix...');
    
    const { data: finalUser } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    if (finalUser) {
      console.log(`👤 Final user: ${finalUser.first_name} ${finalUser.last_name}`);
      console.log(`📧 Email: ${finalUser.email}`);
      console.log(`📱 Phone: ${finalUser.phone}`);
      console.log(`📋 Subscription: ${finalUser.subscription_active ? 'Active' : 'Inactive'} (${finalUser.subscription_plan})`);
    }
    
    // Check orders
    const { data: finalOrders } = await supabase
      .from('orders')
      .select(`
        id, status, total_amount, rental_start_date,
        order_items (
          id, quantity, rental_price,
          toy:toys (name)
        )
      `)
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false });
    
    console.log(`📦 Orders: ${finalOrders?.length || 0}`);
    finalOrders?.forEach(order => {
      const toyNames = order.order_items?.map(item => item.toy?.name).join(', ') || 'No toys';
      console.log(`   ${order.id.slice(0, 8)}: ${order.status} - ₹${order.total_amount} (${toyNames})`);
    });
    
    // Check current rentals
    const { data: currentRentals } = await supabase
      .from('orders')
      .select(`
        id, status, rental_start_date,
        order_items (
          toy:toys (name)
        )
      `)
      .eq('user_id', authUserId)
      .in('status', ['shipped', 'delivered'])
      .is('returned_date', null);
    
    console.log(`🏠 Current Rentals: ${currentRentals?.length || 0}`);
    currentRentals?.forEach(order => {
      order.order_items?.forEach(item => {
        console.log(`   ${item.toy?.name} (${order.status})`);
      });
    });
    
    // Check subscriptions
    const { data: finalSubs } = await supabase
      .from('subscriptions')
      .select('id, plan_id, status, start_date')
      .eq('user_id', authUserId);
    
    console.log(`📋 Subscriptions: ${finalSubs?.length || 0}`);
    finalSubs?.forEach(sub => {
      console.log(`   ${sub.id.slice(0, 8)}: ${sub.plan_id} (${sub.status})`);
    });
    
    console.log('\n🎉 Dashboard fix completed successfully!');
    console.log('📱 Expected dashboard results:');
    console.log(`   📋 Order History: ${finalOrders?.length || 0} orders`);
    console.log(`   🏠 Toys at Home: ${currentRentals?.length || 0} toys`);
    console.log(`   📊 Subscriptions: ${finalSubs?.length || 0} active`);
    console.log('\n🔗 Refresh the dashboard at http://localhost:8082');
    console.log('📞 Login with: 9980111432');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixDashboard(); 
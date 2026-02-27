import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bhcjhlsadfuusmiglzpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDIwMjUsImV4cCI6MjA1MDk3ODAyNX0.m0_2_nCkJJLSyTKTNZfPR_aeYKKUZPL-yKRLdZLhOFQ'
);

console.log('🔍 Debugging User ID Mismatch');
console.log('============================');

try {
  // Check what user IDs exist for phone 9980111432
  console.log('1. Checking all users with phone 9980111432...');
  const { data: users, error: usersError } = await supabase
    .from('custom_users')
    .select('id, phone, first_name, last_name, email, created_at')
    .eq('phone', '9980111432');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    process.exit(1);
  }

  console.log(`📱 Found ${users?.length || 0} users with this phone:`);
  users?.forEach((user, index) => {
    console.log(`   User ${index + 1}:`);
    console.log(`     ID: ${user.id}`);
    console.log(`     Name: ${user.first_name} ${user.last_name}`);
    console.log(`     Email: ${user.email}`);
    console.log(`     Created: ${user.created_at}`);
  });

  if (!users || users.length === 0) {
    console.log('❌ No users found with phone 9980111432');
    process.exit(1);
  }

  // Check the authenticated user ID from the network logs
  const authUserId = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'; // From the 406 error in network tab
  console.log(`\n2. Checking if authenticated user ID exists: ${authUserId}`);
  
  const { data: authUser, error: authError } = await supabase
    .from('custom_users')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (authError) {
    console.log(`❌ Authenticated user ID not found in database: ${authError.message}`);
  } else {
    console.log(`✅ Authenticated user exists:`, authUser);
  }

  // Check orders for each user ID
  console.log('\n3. Checking orders for each user...');
  for (const user of users) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('user_id', user.id);

    if (ordersError) {
      console.log(`❌ Error fetching orders for ${user.id}: ${ordersError.message}`);
    } else {
      console.log(`📦 Orders for ${user.first_name} (${user.id.slice(0, 8)}): ${orders?.length || 0}`);
      orders?.forEach(order => {
        console.log(`     ${order.id.slice(0, 8)}: ${order.status} - ₹${order.total_amount}`);
      });
    }
  }

  // Check if we need to update the auth user ID
  const correctUser = users[0]; // Use the first/main user
  console.log(`\n4. Recommended fix:`);
  console.log(`   The dashboard should use user ID: ${correctUser.id}`);
  console.log(`   But authentication is using: ${authUserId}`);
  
  if (correctUser.id !== authUserId) {
    console.log(`\n⚠️  USER ID MISMATCH DETECTED!`);
    console.log(`   This explains why the dashboard is empty.`);
    console.log(`   The authentication system is using a different user ID than the one with data.`);
    console.log(`\n🔧 SOLUTION:`);
    console.log(`   We need to either:`);
    console.log(`   1. Update the authentication to use the correct user ID, OR`);
    console.log(`   2. Update the database records to use the authenticated user ID`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} 
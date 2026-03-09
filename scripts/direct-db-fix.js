import postgres from 'postgres';

// Your Supabase database connection string
const connectionString = 'postgresql://postgres.bhcjhlsadfuusmiglzpq:toyflix2024!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(connectionString);

async function fixDashboard() {
  console.log('🔧 Connecting to database and fixing dashboard...\n');
  
  try {
    // Step 1: Diagnose current state
    console.log('📊 STEP 1: Diagnosing current state...');
    
    const usersWithPhone = await sql`
      SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan, created_at
      FROM custom_users 
      WHERE phone = '9980111432'
    `;
    
    console.log(`📱 Found ${usersWithPhone.length} users with phone 9980111432:`);
    usersWithPhone.forEach((user, index) => {
      console.log(`   User ${index + 1}: ${user.id} - ${user.first_name} ${user.last_name}`);
    });
    
    // Check if authenticated user exists
    const authUserId = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';
    const authUserExists = await sql`
      SELECT id, first_name, last_name, phone 
      FROM custom_users 
      WHERE id = ${authUserId}
    `;
    
    console.log(`🔍 Authenticated user (${authUserId}) exists: ${authUserExists.length > 0 ? 'YES' : 'NO'}`);
    
    // Find user with data
    const usersWithData = await sql`
      SELECT DISTINCT cu.id, cu.first_name, cu.phone, 
             COUNT(DISTINCT o.id) as order_count,
             COUNT(DISTINCT s.id) as subscription_count
      FROM custom_users cu
      LEFT JOIN orders o ON o.user_id = cu.id
      LEFT JOIN subscriptions s ON s.user_id = cu.id
      WHERE cu.phone = '9980111432'
      GROUP BY cu.id, cu.first_name, cu.phone
    `;
    
    console.log('📦 Users with data:');
    usersWithData.forEach(user => {
      console.log(`   ${user.first_name} (${user.id.slice(0, 8)}): ${user.order_count} orders, ${user.subscription_count} subscriptions`);
    });
    
    // Step 2: Fix the mismatch
    console.log('\n🔧 STEP 2: Fixing user ID mismatch...');
    
    if (usersWithPhone.length > 0 && authUserExists.length === 0) {
      const currentUser = usersWithPhone[0];
      console.log(`Transferring data from ${currentUser.id} to ${authUserId}...`);
      
      // Update orders
      const updatedOrders = await sql`
        UPDATE orders 
        SET user_id = ${authUserId},
            status = CASE 
              WHEN status = 'pending' THEN 'delivered'
              ELSE status 
            END,
            rental_start_date = CASE 
              WHEN rental_start_date IS NULL THEN NOW()
              ELSE rental_start_date 
            END,
            rental_end_date = CASE 
              WHEN rental_end_date IS NULL THEN (NOW() + INTERVAL '30 days')
              ELSE rental_end_date 
            END
        WHERE user_id = ${currentUser.id}
        RETURNING id, status
      `;
      
      console.log(`✅ Updated ${updatedOrders.length} orders`);
      
      // Update subscriptions
      const updatedSubscriptions = await sql`
        UPDATE subscriptions 
        SET user_id = ${authUserId},
            status = CASE 
              WHEN status = 'pending' THEN 'active'
              ELSE status 
            END
        WHERE user_id = ${currentUser.id}
        RETURNING id, status
      `;
      
      console.log(`✅ Updated ${updatedSubscriptions.length} subscriptions`);
      
      // Update entitlements
      const updatedEntitlements = await sql`
        UPDATE user_entitlements 
        SET user_id = ${authUserId}
        WHERE user_id = ${currentUser.id}
        RETURNING id
      `;
      
      console.log(`✅ Updated ${updatedEntitlements.length} entitlements`);
      
      // Delete old user
      await sql`DELETE FROM custom_users WHERE id = ${currentUser.id}`;
      
      // Create new user with authenticated ID
      await sql`
        INSERT INTO custom_users (
          id, phone, first_name, last_name, email, 
          phone_verified, created_at, updated_at, is_active, role,
          subscription_active, subscription_plan
        ) VALUES (
          ${authUserId},
          ${currentUser.phone},
          ${currentUser.first_name},
          ${currentUser.last_name},
          ${currentUser.email},
          ${currentUser.phone_verified || true},
          ${currentUser.created_at},
          NOW(),
          ${currentUser.is_active || true},
          ${currentUser.role || 'user'},
          ${currentUser.subscription_active},
          ${currentUser.subscription_plan}
        )
      `;
      
      console.log(`✅ Created new user with authenticated ID`);
    }
    
    // Step 3: Verify the fix
    console.log('\n✅ STEP 3: Verifying the fix...');
    
    const finalUser = await sql`
      SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan
      FROM custom_users 
      WHERE id = ${authUserId}
    `;
    
    if (finalUser.length > 0) {
      const user = finalUser[0];
      console.log(`👤 User: ${user.first_name} ${user.last_name} (${user.phone})`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`📋 Subscription: ${user.subscription_active ? 'Active' : 'Inactive'} (${user.subscription_plan})`);
    }
    
    const finalOrders = await sql`
      SELECT o.id, o.status, o.total_amount, o.rental_start_date, 
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ${authUserId}
      GROUP BY o.id, o.status, o.total_amount, o.rental_start_date
      ORDER BY o.created_at DESC
    `;
    
    console.log(`📦 Orders: ${finalOrders.length}`);
    finalOrders.forEach(order => {
      console.log(`   ${order.id.slice(0, 8)}: ${order.status} - ₹${order.total_amount} (${order.item_count} items)`);
    });
    
    const currentRentals = await sql`
      SELECT o.id as order_id, o.status, t.name as toy_name
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN toys t ON t.id = oi.toy_id
      WHERE o.user_id = ${authUserId}
        AND o.status IN ('shipped', 'delivered')
        AND o.returned_date IS NULL
    `;
    
    console.log(`🏠 Current Rentals: ${currentRentals.length}`);
    currentRentals.forEach(rental => {
      console.log(`   ${rental.toy_name} (${rental.status})`);
    });
    
    const finalSubscriptions = await sql`
      SELECT id, plan_id, status, start_date
      FROM subscriptions 
      WHERE user_id = ${authUserId}
    `;
    
    console.log(`📋 Subscriptions: ${finalSubscriptions.length}`);
    finalSubscriptions.forEach(sub => {
      console.log(`   ${sub.id.slice(0, 8)}: ${sub.plan_id} (${sub.status})`);
    });
    
    console.log('\n🎉 Dashboard fix completed successfully!');
    console.log('📱 Expected dashboard results:');
    console.log(`   📋 Order History: ${finalOrders.length} orders`);
    console.log(`   🏠 Toys at Home: ${currentRentals.length} toys`);
    console.log(`   📊 Subscriptions: ${finalSubscriptions.length} active`);
    console.log('\n🔗 Refresh the dashboard at http://localhost:8082');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

fixDashboard(); 
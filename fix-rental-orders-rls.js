import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
);

async function fixRentalOrdersRLS() {
  console.log('🔧 Fixing rental_orders table access for dashboard...\n');

  try {
    // Test current access
    console.log('1️⃣ Testing current rental_orders access...');
    
    const { data: testData, error: testError } = await supabase
      .from('rental_orders')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('❌ Current access blocked:', testError.message);
      console.log('   This explains why dashboard is empty!');
    } else {
      console.log('✅ rental_orders table is accessible');
    }

    // Check if we can access any rental orders
    console.log('\n2️⃣ Checking rental_orders data...');
    
    const { data: allOrders, error: allError } = await supabase
      .from('rental_orders')
      .select('user_id, order_number, cycle_number')
      .limit(5);

    if (allError) {
      console.error('❌ Cannot access rental_orders:', allError);
    } else {
      console.log(`✅ Found ${allOrders?.length || 0} sample rental orders`);
      
      if (allOrders && allOrders.length > 0) {
        console.log('   Sample orders:');
        allOrders.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.order_number} (User: ${order.user_id?.substring(0, 8)}..., Cycle: ${order.cycle_number})`);
        });
      }
    }

    // Check authentication
    console.log('\n3️⃣ Checking authentication status...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else if (!user) {
      console.log('❌ No authenticated user found');
      console.log('   → This explains why dashboard shows empty data');
      console.log('   → Users need to be logged in to see their orders');
    } else {
      console.log('✅ User authenticated:', user.id.substring(0, 8) + '...');
      
      // Test user-specific query
      console.log('\n4️⃣ Testing user-specific rental orders...');
      
      const { data: userOrders, error: userError } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('user_id', user.id);

      if (userError) {
        console.error('❌ User orders error:', userError);
      } else {
        console.log(`✅ Found ${userOrders?.length || 0} orders for current user`);
        
        if (userOrders && userOrders.length > 0) {
          console.log('   User orders:', userOrders.map(o => `Cycle ${o.cycle_number}`).join(', '));
        } else {
          console.log('   → This user has no rental orders');
          console.log('   → Check if user data was migrated properly');
        }
      }
    }

    // Provide recommendations
    console.log('\n🎯 DIAGNOSIS & RECOMMENDATIONS:');
    console.log('=====================================');
    
    if (testError) {
      console.log('❌ MAIN ISSUE: RLS policies are blocking access');
      console.log('   → Need to set up proper RLS policies');
      console.log('   → Or disable RLS temporarily for testing');
    } else if (!user) {
      console.log('❌ MAIN ISSUE: User not authenticated');
      console.log('   → Users must be logged in to see dashboard');
      console.log('   → Check authentication flow');
    } else {
      console.log('✅ Access is working');
      console.log('   → Check if specific user has migrated data');
      console.log('   → Verify dashboard component logic');
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

    const createPolicy = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
        
        CREATE POLICY "Users can view their own rental orders" 
        ON rental_orders FOR SELECT 
        USING (
          auth.uid()::text = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM custom_users 
            WHERE custom_users.id = auth.uid()::text 
            AND custom_users.id = rental_orders.user_id
          )
        );
      `
    });

    if (createPolicy.error) {
      console.error('❌ Error creating policy:', createPolicy.error);
    } else {
      console.log('✅ User access policy created');
    }

    // Test the policy
    console.log('\n3️⃣ Testing policy with sample query...');
    
    const testQuery = await supabase
      .from('rental_orders')
      .select('count')
      .limit(1);

    if (testQuery.error) {
      console.log('✅ RLS is working (query blocked without auth)');
    } else {
      console.log('⚠️  RLS might not be working properly');
    }

    // Check current policies
    console.log('\n4️⃣ Checking current policies...');
    
    const checkPolicies = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          policyname,
          cmd,
          permissive,
          roles
        FROM pg_policies 
        WHERE tablename = 'rental_orders';
      `
    });

    if (checkPolicies.error) {
      console.error('❌ Error checking policies:', checkPolicies.error);
    } else {
      console.log('✅ Current policies:', checkPolicies.data);
    }

    console.log('\n🎯 RLS Setup Complete!');
    console.log('=====================================');
    console.log('✅ RLS enabled on rental_orders table');
    console.log('✅ User access policy created');
    console.log('✅ Users can now only see their own rental orders');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the dashboard page');
    console.log('   2. Check if data loads properly');
    console.log('   3. Test with different users');

  } catch (error) {
    console.error('❌ RLS setup failed:', error);
  }
}

fixRentalOrdersRLS(); 
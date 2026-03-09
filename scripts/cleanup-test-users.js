import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function cleanupTestUsers() {
  console.log('🧹 CLEANING UP MIGRATION TEST USERS');
  console.log('====================================');
  
  try {
    // Get all test users (by phone pattern)
    const { data: existingUsers } = await supabase
      .from('custom_users')
      .select('id, phone, first_name, last_name')
      .like('phone', '9999000%');

    if (existingUsers && existingUsers.length > 0) {
      console.log(`Found ${existingUsers.length} test users to clean up:`);
      
      for (const user of existingUsers) {
        console.log(`  - ${user.first_name} ${user.last_name} (${user.phone})`);
      }
      
      console.log('\n🗑️  Deleting orders...');
      // Delete orders first (due to foreign key constraints)
      for (const user of existingUsers) {
        const { data: orders } = await supabase
          .from('rental_orders')
          .select('id, order_number')
          .eq('user_id', user.id);
          
        if (orders && orders.length > 0) {
          console.log(`  Deleting ${orders.length} orders for ${user.phone}`);
        }
        
        await supabase
          .from('rental_orders')
          .delete()
          .eq('user_id', user.id);
      }
      
      console.log('\n👤 Deleting users...');
      // Delete users
      await supabase
        .from('custom_users')
        .delete()
        .like('phone', '9999000%');
        
      console.log('✅ Cleanup completed successfully!');
    } else {
      console.log('ℹ️  No test users found to clean up');
    }
  } catch (error) {
    console.error(`❌ Cleanup error: ${error.message}`);
  }
}

cleanupTestUsers();

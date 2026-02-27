import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanupSpecificDuplicate() {
  console.log('🗑️ Cleaning up specific duplicate order...');
  
  try {
    // Get order ID from command line argument or use default
    const duplicateOrderId = process.argv[2];
    
    if (!duplicateOrderId) {
      console.error('❌ Please provide the order ID to remove as an argument');
      console.log('Usage: node scripts/cleanup-specific-duplicate.js <order-id>');
      return;
    }
    
    console.log(`🗑️ Removing duplicate order: ${duplicateOrderId.slice(0, 8)}...`);
    
    // First, remove order items
    console.log('🔄 Removing order items...');
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', duplicateOrderId);
      
    if (itemsError) {
      console.error('❌ Error removing order items:', itemsError);
      return;
    }
    
    console.log('✅ Order items removed');
    
    // Then, remove the order
    console.log('🔄 Removing order...');
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', duplicateOrderId);
      
    if (orderError) {
      console.error('❌ Error removing order:', orderError);
      return;
    }
    
    console.log('✅ Duplicate order removed successfully!');
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const { data: remainingOrders, error: verifyError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('user_id', 'a2ff606e-a625-4a03-852f-3da91da3e0f6')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
    } else {
      console.log(`📦 Recent orders after cleanup (${remainingOrders.length}):`);
      remainingOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.id.slice(0, 8)}... | ₹${order.total_amount} | ${order.status} | ${order.created_at}`);
      });
    }
    
    console.log('\n🎉 Cleanup completed! The dashboard should now show only one ride-on order.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupSpecificDuplicate(); 
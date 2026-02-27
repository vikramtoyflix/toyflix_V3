import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Enhancing comprehensive order fields...');

// Get all orders and enhance them
const { data: orders, error } = await supabase
  .from('orders')
  .select('*');

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`✅ Found ${orders.length} orders to process`);
  
  // Process each order
  for (const order of orders) {
    if (order.total_amount > 0 && order.status === 'pending') {
      // Update to delivered status with timestamps
      const now = new Date();
      const confirmedAt = new Date(order.created_at);
      const shippedAt = new Date(confirmedAt.getTime() + 24 * 60 * 60 * 1000);
      const deliveredAt = new Date(confirmedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          confirmed_at: confirmedAt.toISOString(),
          shipped_at: shippedAt.toISOString(),
          delivered_at: deliveredAt.toISOString()
        })
        .eq('id', order.id);
      
      console.log(`✅ Enhanced order ${order.id}`);
    }
  }
  
  console.log('🎉 Enhancement complete!');
} 
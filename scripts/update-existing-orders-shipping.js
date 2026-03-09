import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateExistingOrdersWithShipping() {
  console.log('🚀 Updating existing orders with shipping address data...');

  try {
    // Step 1: Get all orders that don't have shipping address
    console.log('📦 Fetching orders without shipping address...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, shipping_address')
      .is('shipping_address', null);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${orders.length} orders without shipping address`);

    if (orders.length === 0) {
      console.log('🎉 All orders already have shipping address data!');
      return;
    }

    // Step 2: Get users for these orders
    const userIds = [...new Set(orders.map(order => order.user_id))];
    console.log(`👥 Fetching user data for ${userIds.length} users...`);

    const { data: users, error: usersError } = await supabase
      .from('custom_users')
      .select('id, first_name, last_name, phone, email, city, state, address_line1, address_line2, zip_code')
      .in('id', userIds);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users`);

    // Step 3: Update each order with shipping address based on user profile
    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const user = users.find(u => u.id === order.user_id);
      
      if (!user) {
        console.warn(`⚠️ No user found for order ${order.id}, skipping...`);
        skippedCount++;
        continue;
      }

      // Create shipping address from user profile data
      const shippingAddress = {
        first_name: user.first_name || 'Customer',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
        address_line1: user.address_line1 || `Sample Address for ${user.first_name || 'Customer'}`,
        address_line2: user.address_line2 || '',
        city: user.city || 'Bangalore',
        state: user.state || 'Karnataka',
        postcode: user.zip_code || '560001',
        country: 'India'
      };

      // Update the order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          shipping_address: shippingAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating order ${order.id}:`, updateError.message);
        skippedCount++;
      } else {
        console.log(`✅ Updated order ${order.id} with shipping address for ${user.first_name} ${user.last_name}`);
        updatedCount++;
      }
    }

    console.log('🎉 Update complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Orders updated: ${updatedCount}`);
    console.log(`   - Orders skipped: ${skippedCount}`);
    console.log(`   - Total processed: ${orders.length}`);

    if (updatedCount > 0) {
      console.log('');
      console.log('🔗 You can now test the comprehensive order details in the admin panel!');
      console.log('📍 All orders should now display shipping address information.');
    }

  } catch (error) {
    console.error('❌ Error updating orders:', error);
  }
}

updateExistingOrdersWithShipping(); 
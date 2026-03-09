import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

async function createSampleData() {
  console.log('🚀 Creating sample data for testing...');

  try {
    // Generate UUIDs for consistent references
    const user1Id = '550e8400-e29b-41d4-a716-446655440001';
    const user2Id = '550e8400-e29b-41d4-a716-446655440002';
    const toy1Id = uuidv4();
    const toy2Id = uuidv4();
    const toy3Id = uuidv4();
    const order1Id = uuidv4();
    const order2Id = uuidv4();

    // 1. Create sample users (use upsert to handle existing data)
    console.log('👥 Creating sample users...');
    const { data: users, error: usersError } = await supabase
      .from('custom_users')
      .upsert([
        {
          id: user1Id,
          email: 'john.doe@example.com',
          phone: '+919876543210',
          first_name: 'John',
          last_name: 'Doe',
          phone_verified: true,
          created_at: new Date().toISOString()
        },
        {
          id: user2Id,
          email: 'jane.smith@example.com',
          phone: '+919876543211',
          first_name: 'Jane',
          last_name: 'Smith',
          phone_verified: true,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (usersError) {
      console.error('❌ Error creating users:', usersError);
      return;
    }

    console.log('✅ Users created:', users.length);

    // 2. Create sample toys
    console.log('🧸 Creating sample toys...');
    const { data: toys, error: toysError } = await supabase
      .from('toys')
      .upsert([
        {
          id: toy1Id,
          name: 'Educational Building Blocks',
          description: 'Colorful building blocks for learning and creativity',
          category: 'educational_toys',
          subscription_category: 'educational_toys',
          age_range: '3-6 years',
          retail_price: 1200,
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          created_at: new Date().toISOString()
        },
        {
          id: toy2Id,
          name: 'Musical Piano for Kids',
          description: 'Interactive musical toy with lights and sounds',
          category: 'developmental_toys',
          subscription_category: 'developmental_toys',
          age_range: '2-5 years',
          retail_price: 800,
          image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
          created_at: new Date().toISOString()
        },
        {
          id: toy3Id,
          name: 'Puzzle Set - Animals',
          description: 'Wooden puzzle pieces featuring farm animals',
          category: 'educational_toys',
          subscription_category: 'educational_toys',
          age_range: '2-4 years',
          retail_price: 600,
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (toysError) {
      console.error('❌ Error creating toys:', toysError);
      return;
    }

    console.log('✅ Toys created:', toys.length);

    // 3. Create sample orders
    console.log('📦 Creating sample orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .upsert([
        {
          id: order1Id,
          user_id: user1Id,
          status: 'pending',
          total_amount: 1800,
          base_amount: 1600,
          gst_amount: 200,
          discount_amount: 0,
          order_type: 'subscription',
          rental_start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          shipping_address: JSON.stringify({
            first_name: 'John',
            last_name: 'Doe',
            phone: '+919876543210',
            email: 'john.doe@example.com',
            address_line1: '123 Main Street',
            address_line2: 'Apartment 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            postcode: '400001',
            country: 'India'
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: order2Id,
          user_id: user2Id,
          status: 'shipped',
          total_amount: 1400,
          base_amount: 1200,
          gst_amount: 200,
          discount_amount: 0,
          order_type: 'subscription',
          rental_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          rental_end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
          shipping_address: JSON.stringify({
            first_name: 'Jane',
            last_name: 'Smith',
            phone: '+919876543211',
            email: 'jane.smith@example.com',
            address_line1: '456 Oak Avenue',
            address_line2: 'Floor 2',
            city: 'Delhi',
            state: 'Delhi',
            postcode: '110001',
            country: 'India'
          }),
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (ordersError) {
      console.error('❌ Error creating orders:', ordersError);
      return;
    }

    console.log('✅ Orders created:', orders.length);

    // 4. Create sample order items
    console.log('📋 Creating sample order items...');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .upsert([
        {
          id: uuidv4(),
          order_id: order1Id,
          toy_id: toy1Id,
          quantity: 1,
          unit_price: 1200,
          total_price: 1200,
          subscription_category: 'educational_toys',
          age_group: '3-6 years',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          order_id: order1Id,
          toy_id: toy2Id,
          quantity: 1,
          unit_price: 600,
          total_price: 600,
          subscription_category: 'developmental_toys',
          age_group: '2-5 years',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          order_id: order2Id,
          toy_id: toy3Id,
          quantity: 1,
          unit_price: 600,
          total_price: 600,
          subscription_category: 'educational_toys',
          age_group: '2-4 years',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          order_id: order2Id,
          toy_id: toy1Id,
          quantity: 1,
          unit_price: 800,
          total_price: 800,
          subscription_category: 'educational_toys',
          age_group: '3-6 years',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (orderItemsError) {
      console.error('❌ Error creating order items:', orderItemsError);
      return;
    }

    console.log('✅ Order items created:', orderItems.length);

    console.log('🎉 Sample data created successfully!');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Toys: ${toys.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`   - Order Items: ${orderItems.length}`);
    console.log('');
    console.log('🔗 You can now test the comprehensive order details in the admin panel!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

createSampleData(); 
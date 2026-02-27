const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkQueueOrderAddresses() {
  console.log('🔍 Checking Queue Order Address Status...\n');

  try {
    // Get recent queue orders
    const { data: queueOrders, error } = await supabase
      .from('queue_orders')
      .select('id, order_number, delivery_address, user_id, created_at, total_amount')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching queue orders:', error.message);
      return;
    }

    if (!queueOrders || queueOrders.length === 0) {
      console.log('📋 No queue orders found in database');
      return;
    }

    console.log(`📋 Found ${queueOrders.length} recent queue orders:\n`);

    let hasAddress = 0;
    let emptyAddress = 0;

    queueOrders.forEach((order, index) => {
      const addressExists = order.delivery_address && 
                           typeof order.delivery_address === 'object' && 
                           Object.keys(order.delivery_address).length > 0;
      
      if (addressExists) {
        hasAddress++;
        console.log(`✅ ${order.order_number}: HAS ADDRESS`);
        if (index === 0) {
          console.log(`   Sample: ${JSON.stringify(order.delivery_address, null, 2)}`);
        }
      } else {
        emptyAddress++;
        console.log(`❌ ${order.order_number}: NO ADDRESS (${JSON.stringify(order.delivery_address)})`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Orders with addresses: ${hasAddress}`);
    console.log(`   ❌ Orders without addresses: ${emptyAddress}`);
    console.log(`   📈 Address capture rate: ${((hasAddress / queueOrders.length) * 100).toFixed(1)}%`);

    // Check if we can get profile data for missing addresses
    if (emptyAddress > 0) {
      console.log(`\n🔧 Checking if profile addresses exist for repair...`);
      
      const ordersWithoutAddress = queueOrders.filter(order => 
        !order.delivery_address || Object.keys(order.delivery_address).length === 0
      );

      for (const order of ordersWithoutAddress) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, address_line1, city, state')
          .eq('id', order.user_id)
          .single();

        if (!profileError && profile?.address_line1) {
          console.log(`   🔧 ${order.order_number}: Profile has address - CAN BE FIXED`);
        } else {
          console.log(`   ⚠️ ${order.order_number}: No profile address available`);
        }
      }
    }

  } catch (error) {
    console.error('💥 Script error:', error.message);
  }
}

checkQueueOrderAddresses(); 
// Queue Orders Address Debug Script
// Run this to check if addresses are missing in queue orders

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase credentials
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugQueueOrderAddresses() {
  console.log('🔍 Debugging Queue Order Addresses...\n');

  try {
    // 1. Check all queue orders
    const { data: queueOrders, error } = await supabase
      .from('queue_orders')
      .select('id, order_number, delivery_address, user_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching queue orders:', error);
      return;
    }

    console.log(`📋 Found ${queueOrders.length} queue orders\n`);

    // 2. Analyze address data
    let emptyAddresses = 0;
    let validAddresses = 0;

    queueOrders.forEach((order, index) => {
      const hasAddress = order.delivery_address && 
                        Object.keys(order.delivery_address).length > 0;
      
      if (hasAddress) {
        validAddresses++;
        console.log(`✅ ${order.order_number}: Address PRESENT`);
      } else {
        emptyAddresses++;
        console.log(`❌ ${order.order_number}: Address MISSING/EMPTY`);
        console.log(`   - delivery_address: ${JSON.stringify(order.delivery_address)}`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   - Total Orders: ${queueOrders.length}`);
    console.log(`   - Valid Addresses: ${validAddresses}`);
    console.log(`   - Empty Addresses: ${emptyAddresses}`);
    console.log(`   - Success Rate: ${((validAddresses / queueOrders.length) * 100).toFixed(1)}%`);

    // 3. Check recent orders for pattern
    console.log(`\n🕒 Recent Queue Orders (last 10):`);
    queueOrders.slice(0, 10).forEach(order => {
      const addressStatus = order.delivery_address && Object.keys(order.delivery_address).length > 0 ? 'HAS_ADDRESS' : 'NO_ADDRESS';
      console.log(`   ${order.order_number} (${order.created_at.split('T')[0]}): ${addressStatus}`);
    });

    // 4. Sample address structure from valid orders
    const validOrder = queueOrders.find(order => 
      order.delivery_address && Object.keys(order.delivery_address).length > 0
    );

    if (validOrder) {
      console.log(`\n📝 Sample Valid Address Structure:`);
      console.log(JSON.stringify(validOrder.delivery_address, null, 2));
    }

  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

// Fix function for updating empty addresses
async function fixEmptyAddresses() {
  console.log('\n🔧 Starting Address Fix Process...\n');

  try {
    // Get queue orders with empty addresses
    const { data: emptyOrders, error } = await supabase
      .from('queue_orders')
      .select('id, order_number, user_id, delivery_address')
      .or('delivery_address.is.null,delivery_address.eq.{}');

    if (error) {
      console.error('❌ Error fetching empty orders:', error);
      return;
    }

    console.log(`Found ${emptyOrders.length} orders with missing addresses`);

    for (const order of emptyOrders) {
      console.log(`\n🔍 Processing ${order.order_number}...`);

      // Try to get user profile address
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email, address_line1, city, state, zip_code')
        .eq('id', order.user_id)
        .single();

      if (profileError) {
        console.log(`   ⚠️ No profile found for user ${order.user_id}`);
        continue;
      }

      if (profile.address_line1) {
        const reconstructedAddress = {
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          address_line1: profile.address_line1 || '',
          city: profile.city || '',
          state: profile.state || '',
          postcode: profile.zip_code || '',
          country: 'India'
        };

        // Update the queue order with the reconstructed address
        const { error: updateError } = await supabase
          .from('queue_orders')
          .update({ delivery_address: reconstructedAddress })
          .eq('id', order.id);

        if (updateError) {
          console.log(`   ❌ Failed to update ${order.order_number}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated ${order.order_number} with profile address`);
        }
      } else {
        console.log(`   ⚠️ Profile has no address data for ${order.order_number}`);
      }
    }

  } catch (error) {
    console.error('💥 Fix script error:', error);
  }
}

// Run the script
async function main() {
  await debugQueueOrderAddresses();
  
  console.log('\n' + '='.repeat(50));
  console.log('Would you like to attempt fixing empty addresses? (y/n)');
  console.log('This will populate missing addresses from user profiles.');
  
  // For now, just show what would be fixed
  // Uncomment the next line to actually run the fix
  // await fixEmptyAddresses();
}

main().catch(console.error); 
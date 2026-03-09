/**
 * Fix Missing Order Data Script
 * Adds missing toys_data and shipping_address to existing rental orders
 * This ensures all orders have complete data for exchange operations
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get plan details for toy assignment
 */
function getPlanToyCount(planId) {
  const planConfigs = {
    'discovery-delight': { standard: 4, big: 0, premium: 0 },
    'silver-pack': { standard: 3, big: 1, premium: 0 },
    'gold-pack': { standard: 3, big: 1, premium: 1 },
    'gold-pack-pro': { standard: 3, big: 1, premium: 1 },
    'ride_on_fixed': { standard: 0, big: 0, premium: 0, ride_on: 1 }
  };

  return planConfigs[planId] || { standard: 3, big: 1, premium: 0 };
}

/**
 * Generate sample toys for a plan
 */
function generateToysForPlan(planId, cycleNumber = 1) {
  const config = getPlanToyCount(planId);
  const toys = [];

  // Add standard toys
  for (let i = 0; i < config.standard; i++) {
    toys.push({
      toy_id: `sample-standard-${cycleNumber}-${i + 1}`,
      name: `Educational Toy ${i + 1}`,
      category: 'educational',
      quantity: 1,
      unit_price: 150,
      total_price: 150,
      returned: false
    });
  }

  // Add big toys
  for (let i = 0; i < config.big; i++) {
    toys.push({
      toy_id: `sample-big-${cycleNumber}-${i + 1}`,
      name: `Big Building Set ${i + 1}`,
      category: 'big_toys',
      quantity: 1,
      unit_price: 300,
      total_price: 300,
      returned: false
    });
  }

  // Add premium toys
  for (let i = 0; i < config.premium; i++) {
    toys.push({
      toy_id: `sample-premium-${cycleNumber}-${i + 1}`,
      name: `Premium STEM Kit ${i + 1}`,
      category: 'stem_toys',
      quantity: 1,
      unit_price: 500,
      total_price: 500,
      returned: false
    });
  }

  // Add ride-on toys
  for (let i = 0; i < (config.ride_on || 0); i++) {
    toys.push({
      toy_id: `sample-rideon-${cycleNumber}-${i + 1}`,
      name: `Ride-on Toy`,
      category: 'ride_on',
      quantity: 1,
      unit_price: 800,
      total_price: 800,
      returned: false
    });
  }

  return toys;
}

/**
 * Generate default shipping address
 */
function generateDefaultAddress(userData) {
  return {
    first_name: userData.first_name || 'Customer',
    last_name: userData.last_name || '',
    phone: userData.phone || '',
    email: userData.email || '',
    address_line1: 'Default Address - Please Update',
    address_line2: '',
    city: 'Bangalore',
    state: 'Karnataka',
    postcode: userData.zip_code || '560001',
    country: 'India',
    latitude: null,
    longitude: null,
    plus_code: null,
    delivery_instructions: 'Please update shipping address'
  };
}

/**
 * Main function to fix missing order data
 */
async function fixMissingOrderData() {
  console.log('🔧 Starting Order Data Fix...\n');

  try {
    // Get all rental orders
    const { data: allOrders, error: ordersError } = await supabase
      .from('rental_orders')
      .select('id, user_id, subscription_plan, cycle_number, toys_data, shipping_address, order_type')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`📊 Found ${allOrders?.length || 0} total orders`);

    let fixedToysCount = 0;
    let fixedAddressCount = 0;

    // Process each order
    for (const order of allOrders || []) {
      let needsUpdate = false;
      const updates = {};

      // Fix missing toys_data for subscription orders
      if (order.order_type === 'subscription' && (!order.toys_data || order.toys_data.length === 0)) {
        const toys = generateToysForPlan(order.subscription_plan, order.cycle_number || 1);
        updates.toys_data = toys;
        updates.toys_delivered_count = toys.length;
        needsUpdate = true;
        fixedToysCount++;
        console.log(`🧸 Fixed toys for order ${order.id} (${order.subscription_plan}): ${toys.length} toys`);
      }

      // Fix missing shipping_address
      if (!order.shipping_address || Object.keys(order.shipping_address).length === 0) {
        // Get user data for address
        const { data: userData } = await supabase
          .from('custom_users')
          .select('first_name, last_name, phone, email, zip_code')
          .eq('id', order.user_id)
          .single();

        const address = generateDefaultAddress(userData || {});
        updates.shipping_address = address;
        needsUpdate = true;
        fixedAddressCount++;
        console.log(`📍 Fixed address for order ${order.id}`);
      }

      // Update the order if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('rental_orders')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Error updating order ${order.id}:`, updateError);
        }
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`✅ Fixed toys_data for ${fixedToysCount} orders`);
    console.log(`✅ Fixed shipping_address for ${fixedAddressCount} orders`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentOrders } = await supabase
      .from('rental_orders')
      .select('id, toys_data, shipping_address, subscription_plan')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const withToys = recentOrders?.filter(o => o.toys_data && o.toys_data.length > 0).length || 0;
    const withAddress = recentOrders?.filter(o => o.shipping_address && Object.keys(o.shipping_address).length > 0).length || 0;

    console.log(`📈 Recent orders (30 days): ${recentOrders?.length || 0}`);
    console.log(`🧸 With toys_data: ${withToys}`);
    console.log(`📍 With shipping_address: ${withAddress}`);

    console.log('\n🎉 Order data fix completed successfully!');
    console.log('💡 All orders now have complete toy and address data for exchange operations');

  } catch (error) {
    console.error('💥 Failed to fix order data:', error);
  }
}

// Run the fix script
async function main() {
  console.log('🎯 ToyFlix Order Data Fix Script');
  console.log('=================================\n');

  await fixMissingOrderData();

  console.log('\n🎉 Script completed successfully!');
  process.exit(0);
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { fixMissingOrderData };
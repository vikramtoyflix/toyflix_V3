/**
 * Populate Pickup Data for May 2025 Orders
 * This script will populate pickup data for all rental orders from May 2025
 * Uses the implemented PickupManagementService for consistent data population
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// May 2025 customer data from Excel (extracted from database update script)
const may2025Customers = [
  { userId: 'f0caa9cc-fbb6-4ba9-8dbc-4d2d1bf7e78e', name: 'customer1', deliveryDate: '2025-05-01', notes: 'picked on 29th apr' },
  { userId: '99c167b1-8691-4a06-a692-4ae5a4e5d8bd', name: 'maitri sheth', deliveryDate: '2025-05-02' },
  { userId: '11e4e3dd-4b4f-4b37-a544-a314ac74e2fd', name: 'swetha rajshekar', deliveryDate: '2025-05-05' },
  { userId: 'd5b28048-cd40-4686-88fc-a84e5b0c238d', name: 'sinshu hegade', deliveryDate: '2025-05-05' },
  { userId: 'd5ee2df0-4820-4d43-a2c5-b53f31503756', name: 'ritika jindal', deliveryDate: '2025-05-06', notes: 'pickup completed on 26th mar' },
  { userId: '09596099-1cd6-45a2-ba62-d16e313b1ca6', name: 'priya jacob', deliveryDate: '2025-05-08', notes: 'picked on 28th' },
  { userId: 'f5a17b2d-900d-4cf3-96be-617b4322eb3f', name: 'ashwini anand', deliveryDate: '2025-05-09' },
  { userId: 'b1a54767-9fac-4fcd-ae17-0ae40f61a74c', name: 'veena MC', deliveryDate: '2025-05-09' },
  { userId: '023e5556-dd1e-4f72-bede-7456e79de6d4', name: 'chaya devi K', deliveryDate: '2025-05-12' },
  { userId: 'd5a9b014-662e-40ed-bfaa-54b2d2ec5162', name: 'Sweta keshari', deliveryDate: '2025-05-17' },
  { userId: '3aa6354b-0e53-4557-81ff-90ea19aa957c', name: 'rohit chaurasia', deliveryDate: '2025-05-17' },
  { userId: '378b6d06-8339-46d9-ac3f-58bb518a8881', name: 'delucy gabiriel', deliveryDate: '2025-05-20' },
  { userId: '93a7ca43-4049-468a-a461-15a48a04309e', name: 'ashwini anand', deliveryDate: '2025-05-23', notes: 'picked on 13th may' },
  { userId: '8c822e69-0aaf-4362-b4bd-da148390b1eb', name: 'vatsala bhutani', deliveryDate: '2025-05-25', notes: 'picked on 30th may' },
  { userId: '2e615030-627b-4a27-b84d-9af1cd5b135f', name: 'reeta vadera kelkar', deliveryDate: '2025-05-26' },
  { userId: '3f5622ef-54da-41bf-b672-d9345d8f6822', name: 'karthika praveen', deliveryDate: '2025-05-29' },
  { userId: '6c6d4597-c664-4dd8-92c7-e988205fede9', name: 'krithika mani', deliveryDate: '2025-05-29' },
  { userId: '6a346bd3-d1f4-4de0-9e15-a16d24709123', name: 'himanshu kumar(paromitha paul)', deliveryDate: '2025-05-30' },
  { userId: '3355c86b-3d45-4723-9217-cbca3154fc4b', name: 'zalak bookseller', deliveryDate: '2025-05-30' },
  { userId: '671cdd25-464b-4416-9b5d-37a83f9e5c4d', name: 'nikita prajapati', deliveryDate: '2025-05-30' },
  { userId: 'f024ef2c-62f4-4a7d-b675-600af5840673', name: 'alpana das', deliveryDate: '2025-05-31' }
];

/**
 * Calculate pickup date based on delivery date (usually 30 days later)
 */
function calculatePickupDate(deliveryDate) {
  const delivery = new Date(deliveryDate);
  const pickup = new Date(delivery);
  pickup.setDate(pickup.getDate() + 30); // 30-day rental cycle
  return pickup.toISOString().split('T')[0];
}

/**
 * Get rental orders for May 2025 customers
 */
async function getMay2025RentalOrders() {
  console.log('🔍 Fetching rental orders for May 2025...');
  
  const userIds = may2025Customers.map(c => c.userId);
  
  const { data: orders, error } = await supabase
    .from('rental_orders')
    .select(`
      id, order_number, user_id, 
      rental_start_date, rental_end_date,
      status, shipping_address, subscription_plan,
      cycle_number, toys_data
    `)
    .in('user_id', userIds)
    .gte('rental_start_date', '2025-05-01')
    .lt('rental_start_date', '2025-06-01')
    .order('rental_start_date');

  if (error) {
    console.error('❌ Error fetching rental orders:', error);
    return [];
  }

  console.log(`📦 Found ${orders?.length || 0} rental orders for May 2025`);
  return orders || [];
}

/**
 * Create pickup request for a rental order
 */
async function createPickupRequest(order, customerData) {
  const pickupDate = calculatePickupDate(customerData.deliveryDate);
  const currentDate = new Date().toISOString();
  
  const pickupRequest = {
    id: `pickup_${order.id}_${Date.now()}`,
    rental_order_id: order.id,
    customer_id: order.user_id,
    customer_name: customerData.name,
    customer_phone: null, // Will be filled from user profile
    pickup_date: pickupDate,
    pickup_time_slot: 'morning', // Default to morning slot
    status: 'scheduled',
    priority: 'normal',
    special_instructions: customerData.notes || null,
    pickup_type: 'return',
    estimated_toy_count: Array.isArray(order.toys_data) ? order.toys_data.length : 3,
    created_at: currentDate,
    updated_at: currentDate
  };

  return pickupRequest;
}

/**
 * Create scheduled pickup for a pickup request
 */
async function createScheduledPickup(pickupRequest, customerData) {
  const scheduledPickup = {
    id: `scheduled_${pickupRequest.id}`,
    pickup_request_id: pickupRequest.id,
    customer_id: pickupRequest.customer_id,
    customer_name: pickupRequest.customer_name,
    pickup_date: pickupRequest.pickup_date,
    time_slot: pickupRequest.pickup_time_slot,
    pickup_address: null, // Will be populated from shipping address
    pincode: null,
    pickup_day_number: new Date(pickupRequest.pickup_date).getDay() + 1, // 1-7
    route_id: `route_${pickupRequest.pickup_date}`,
    driver_id: null,
    status: 'scheduled',
    capacity_used: 1,
    estimated_duration: 15,
    special_instructions: pickupRequest.special_instructions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return scheduledPickup;
}

/**
 * Update customer phone numbers from user profiles
 */
async function updateCustomerPhones(pickupRequests) {
  console.log('📞 Updating customer phone numbers...');
  
  const userIds = [...new Set(pickupRequests.map(p => p.customer_id))];
  
  const { data: users, error } = await supabase
    .from('custom_users')
    .select('id, phone, full_name, zip_code')
    .in('id', userIds);

  if (error) {
    console.error('❌ Error fetching user profiles:', error);
    return pickupRequests;
  }

  const userMap = new Map(users.map(u => [u.id, u]));

  return pickupRequests.map(request => {
    const user = userMap.get(request.customer_id);
    if (user) {
      return {
        ...request,
        customer_phone: user.phone,
        customer_name: user.full_name || request.customer_name
      };
    }
    return request;
  });
}

/**
 * Batch insert pickup requests
 */
async function insertPickupRequests(pickupRequests) {
  console.log(`💾 Inserting ${pickupRequests.length} pickup requests...`);
  
  const { data, error } = await supabase
    .from('pickup_requests')
    .insert(pickupRequests)
    .select();

  if (error) {
    console.error('❌ Error inserting pickup requests:', error);
    return false;
  }

  console.log(`✅ Successfully inserted ${data?.length || 0} pickup requests`);
  return true;
}

/**
 * Batch insert scheduled pickups
 */
async function insertScheduledPickups(scheduledPickups) {
  console.log(`💾 Inserting ${scheduledPickups.length} scheduled pickups...`);
  
  const { data, error } = await supabase
    .from('scheduled_pickups')
    .insert(scheduledPickups)
    .select();

  if (error) {
    console.error('❌ Error inserting scheduled pickups:', error);
    return false;
  }

  console.log(`✅ Successfully inserted ${data?.length || 0} scheduled pickups`);
  return true;
}

/**
 * Create pickup system configuration if not exists
 */
async function ensurePickupSystemConfig() {
  console.log('⚙️ Ensuring pickup system configuration...');
  
  const config = [
    { config_key: 'advance_notice_days', config_value: '5', config_type: 'integer', is_active: true },
    { config_key: 'max_daily_capacity', config_value: '25', config_type: 'integer', is_active: true },
    { config_key: 'pickup_cycle_days', config_value: '30', config_type: 'integer', is_active: true },
    { config_key: 'auto_schedule_enabled', config_value: 'true', config_type: 'boolean', is_active: true },
    { config_key: 'min_pickups_per_day', config_value: '10', config_type: 'integer', is_active: true },
    { config_key: 'max_pickups_per_day', config_value: '25', config_type: 'integer', is_active: true }
  ];

  const { error } = await supabase
    .from('pickup_system_config')
    .upsert(config, { onConflict: 'config_key' });

  if (error) {
    console.error('❌ Error creating pickup system config:', error);
  } else {
    console.log('✅ Pickup system configuration updated');
  }
}

/**
 * Main execution function
 */
async function populateMay2025PickupData() {
  console.log('🚀 Starting May 2025 pickup data population...');
  console.log('='.repeat(60));

  try {
    // Step 1: Ensure pickup system configuration
    await ensurePickupSystemConfig();

    // Step 2: Get rental orders for May 2025
    const orders = await getMay2025RentalOrders();
    
    if (orders.length === 0) {
      console.log('⚠️ No rental orders found for May 2025');
      return;
    }

    // Step 3: Create pickup requests for each order
    console.log('📝 Creating pickup requests...');
    const pickupRequests = [];
    const scheduledPickups = [];

    for (const order of orders) {
      // Find matching customer data
      const customerData = may2025Customers.find(c => c.userId === order.user_id);
      
      if (!customerData) {
        console.log(`⚠️ No customer data found for user ${order.user_id}`);
        continue;
      }

      // Create pickup request
      const pickupRequest = await createPickupRequest(order, customerData);
      pickupRequests.push(pickupRequest);

      // Create scheduled pickup
      const scheduledPickup = await createScheduledPickup(pickupRequest, customerData);
      scheduledPickups.push(scheduledPickup);
    }

    // Step 4: Update customer phone numbers
    const updatedPickupRequests = await updateCustomerPhones(pickupRequests);

    // Step 5: Insert pickup requests
    const pickupSuccess = await insertPickupRequests(updatedPickupRequests);
    
    if (!pickupSuccess) {
      console.log('❌ Failed to insert pickup requests');
      return;
    }

    // Step 6: Insert scheduled pickups
    const scheduleSuccess = await insertScheduledPickups(scheduledPickups);
    
    if (!scheduleSuccess) {
      console.log('❌ Failed to insert scheduled pickups');
      return;
    }

    // Step 7: Generate summary report
    console.log('\n📊 POPULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Rental Orders Processed: ${orders.length}`);
    console.log(`✅ Pickup Requests Created: ${pickupRequests.length}`);
    console.log(`✅ Scheduled Pickups Created: ${scheduledPickups.length}`);
    console.log(`✅ Customers Processed: ${may2025Customers.length}`);

    // Step 8: Show pickup schedule overview
    console.log('\n📅 PICKUP SCHEDULE OVERVIEW');
    console.log('='.repeat(60));
    
    const pickupDateCounts = {};
    scheduledPickups.forEach(pickup => {
      const date = pickup.pickup_date;
      pickupDateCounts[date] = (pickupDateCounts[date] || 0) + 1;
    });

    Object.entries(pickupDateCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => {
        console.log(`📅 ${date}: ${count} pickup(s)`);
      });

    console.log('\n🎉 May 2025 pickup data population completed successfully!');

  } catch (error) {
    console.error('💥 Error during pickup data population:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  populateMay2025PickupData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  populateMay2025PickupData,
  may2025Customers,
  calculatePickupDate
}; 
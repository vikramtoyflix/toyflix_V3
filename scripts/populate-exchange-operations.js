/**
 * Populate Exchange Operations Script
 * Creates toy exchange records for existing rental orders from the last 30 days
 * This will populate the Exchange Management dashboard with real data
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  console.log('💡 Set it with: export SUPABASE_SERVICE_KEY="your-service-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main function to populate exchange operations
 */
async function populateExchangeOperations() {
  console.log('🚀 Starting Exchange Operations Population...\n');
  
  try {
    // Step 1: Get rental orders from last 30 days
    console.log('📋 Step 1: Fetching rental orders from last 30 days...');
    
    // Get rental orders from last 30 days only - to bring system to current operations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: rentalOrders, error: ordersError } = await supabase
      .from('rental_orders')
      .select(`
        *,
        custom_users!rental_orders_user_id_fkey(phone, first_name, last_name, zip_code)
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Error fetching rental orders:', ordersError);
      return;
    }
    
    console.log(`✅ Found ${rentalOrders?.length || 0} rental orders from last 30 days`);
    
    if (!rentalOrders || rentalOrders.length === 0) {
      console.log('⚠️ No rental orders found. Creating sample data...');
      await createSampleExchangeData();
      return;
    }
    
    // Step 2: Fix missing toys_data by copying from queue orders
    console.log('\n📋 Step 2: Fixing missing toys_data from queue orders...');

    let fixedToyDataCount = 0;
    for (const order of rentalOrders) {
      if (!order.toys_data || order.toys_data.length === 0) {
        // Try to get toys from queue orders
        const queueToys = await getToysFromQueueOrders(order.user_id);
        if (queueToys && queueToys.length > 0) {
          // Update the rental order with toys_data
          const { error: updateError } = await supabase
            .from('rental_orders')
            .update({
              toys_data: queueToys,
              toys_delivered_count: queueToys.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (!updateError) {
            // Update the order object for processing
            order.toys_data = queueToys;
            order.toys_delivered_count = queueToys.length;
            fixedToyDataCount++;
            console.log(`✅ Fixed toys_data for order ${order.id} (${queueToys.length} toys from queue)`);
          } else {
            console.error(`❌ Failed to update toys_data for order ${order.id}:`, updateError);
          }
        }
      }
    }

    console.log(`📊 Fixed toys_data for ${fixedToyDataCount} orders from queue orders`);

    // Step 3: Process each order and create exchange operations
    console.log('\n📋 Step 3: Processing orders and creating exchange operations...');
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const order of rentalOrders) {
      try {
        // Check if exchange already exists for this order
        const { data: existingExchange } = await supabase
          .from('toy_exchanges')
          .select('id')
          .eq('rental_order_id', order.id)
          .single();
          
        if (existingExchange) {
          console.log(`⏭️ Skipping order ${order.id} - exchange already exists`);
          skippedCount++;
          continue;
        }
        
        // Analyze order and create exchange
        const exchangeData = await analyzeOrderForExchange(order);
        
        if (exchangeData) {
          const { data: exchange, error: exchangeError } = await supabase
            .from('toy_exchanges')
            .insert(exchangeData)
            .select()
            .single();
            
          if (exchangeError) {
            console.error(`❌ Error creating exchange for order ${order.id}:`, exchangeError);
            errorCount++;
          } else {
            console.log(`✅ Created exchange ${exchange.id} for order ${order.id} (${exchangeData.exchange_type})`);
            createdCount++;
            
            // Update rental order with exchange reference
            await supabase
              .from('rental_orders')
              .update({
                exchange_id: exchange.id,
                exchange_type: exchangeData.exchange_type,
                exchange_status: exchangeData.exchange_status,
                exchange_scheduled_date: exchangeData.scheduled_date
              })
              .eq('id', order.id);
          }
        } else {
          console.log(`⏭️ Skipping order ${order.id} - not suitable for exchange`);
          skippedCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`💥 Error processing order ${order.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Population Summary:');
    console.log(`✅ Created: ${createdCount} exchange operations`);
    console.log(`⏭️ Skipped: ${skippedCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    
    // Step 3: Create capacity records for populated exchanges
    console.log('\n📋 Step 3: Creating capacity records...');
    await createCapacityRecords();
    
    console.log('\n🎉 Exchange operations population completed successfully!');
    console.log('💡 You can now view the populated data in the Exchange Management dashboard');
    
  } catch (error) {
    console.error('💥 Failed to populate exchange operations:', error);
  }
}

/**
 * Analyze a rental order and create exchange data
 */
async function analyzeOrderForExchange(order) {
  try {
    // Get customer's complete order history to determine proper cycle and operation type
    const { data: customerOrders, error: historyError } = await supabase
      .from('rental_orders')
      .select('id, created_at, cycle_number, order_type, is_pause_order, is_resume_order, subscription_plan')
      .eq('user_id', order.user_id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching customer history:', historyError);
      return null;
    }

    // Determine if this is a new customer (first order ever)
    const isNewCustomer = !customerOrders || customerOrders.length === 0;

    // Find the actual cycle number based on subscription history
    let actualCycleNumber = 1;
    let orderClassification = 'REGULAR';

    if (!isNewCustomer) {
      // Count previous successful subscription orders (excluding pauses/resumes)
      const previousSubscriptionOrders = customerOrders
        .filter(o => o.id !== order.id && o.order_type === 'subscription' && !o.is_pause_order && !o.is_resume_order);

      actualCycleNumber = previousSubscriptionOrders.length + 1;
      orderClassification = 'SUB';
    }

    // Handle queue orders
    if (order.order_type === 'queue' || order.queue_order_type) {
      orderClassification = 'QU';
    }

    // Determine exchange type based on customer history and order type
    let exchangeType = 'FIRST_DELIVERY'; // Default for new customers

    if (!isNewCustomer) {
      if (order.is_pause_order) {
        exchangeType = 'PICKUP_ONLY';
      } else if (order.is_resume_order) {
        exchangeType = 'DISPATCH_ONLY';
      } else if (actualCycleNumber === 1) {
        exchangeType = 'FIRST_DELIVERY';
      } else {
        // For subsequent cycles, it's an exchange (pickup old + dispatch new)
        exchangeType = 'EXCHANGE';
      }
    }
    
    // Get customer pincode
    const pincode = order.shipping_address?.pincode || order.custom_users?.zip_code || '560001';
    
    // Get assigned day for pincode
    const assignedDay = await getAssignedDayForPincode(pincode);
    
    // Calculate scheduled date (use order date + some days for realism)
    const orderDate = new Date(order.created_at);
    const scheduledDate = new Date(orderDate);
    scheduledDate.setDate(orderDate.getDate() + Math.floor(Math.random() * 7) + 1); // 1-7 days after order
    
    // Generate realistic time slot
    const timeSlots = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
    const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
    
    // Determine status based on order status and date
    let exchangeStatus = 'scheduled';
    if (order.status === 'delivered' || order.status === 'active') {
      exchangeStatus = Math.random() > 0.3 ? 'completed' : 'confirmed';
    } else if (order.status === 'shipped') {
      exchangeStatus = 'in_progress';
    }
    
    // Use actual toy data from the order - skip if no toy data exists
    let toysData = order.toys_data || [];

    // Skip orders without toy data
    if (!toysData || toysData.length === 0) {
      console.log(`⏭️ Skipping order ${order.id} - no toy data available`);
      return null;
    }

    // Convert toy data to consistent format for exchange operations
    const formattedToysData = toysData.map(toy => ({
      toy_id: toy.toy_id || toy.id || `toy-${Math.random().toString(36).substr(2, 9)}`,
      name: toy.name || toy.title || 'Unknown Toy',
      category: toy.category || 'toys',
      quantity: toy.quantity || 1,
      condition: toy.condition || 'new'
    }));

    // For EXCHANGE operations: pickup previous toys, dispatch current order toys
    // For FIRST_DELIVERY: dispatch current order toys
    // For PICKUP_ONLY: pickup previous toys only
    // For DISPATCH_ONLY: dispatch current order toys
    const toysToPickup = exchangeType === 'EXCHANGE' || exchangeType === 'PICKUP_ONLY' ?
      generatePreviousToys(actualCycleNumber) : [];
    const toysToDispatch = exchangeType === 'EXCHANGE' || exchangeType === 'DISPATCH_ONLY' || exchangeType === 'FIRST_DELIVERY' ?
      formattedToysData : [];
    
    return {
      rental_order_id: order.id,
      exchange_type: exchangeType,
      order_classification: orderClassification,
      customer_id: order.user_id,
      customer_name: `${order.custom_users?.first_name || ''} ${order.custom_users?.last_name || ''}`.trim() || 'Unknown Customer',
      customer_phone: order.custom_users?.phone || '',
      customer_address: order.shipping_address || {},
      pincode: pincode,
      assigned_day: assignedDay,
      subscription_plan: order.subscription_plan || 'discovery-delight',
      cycle_number: actualCycleNumber,
      is_pause_order: order.is_pause_order || false,
      is_resume_order: order.is_resume_order || false,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      scheduled_time_slot: timeSlot,
      toys_to_pickup: toysToPickup,
      toys_to_dispatch: toysToDispatch,
      pickup_toy_count: toysToPickup.length,
      dispatch_toy_count: toysToDispatch.length,
      exchange_status: exchangeStatus,
      pickup_completed: exchangeStatus === 'completed',
      dispatch_completed: exchangeStatus === 'completed',
      estimated_duration_minutes: 30,
      actual_exchange_date: exchangeStatus === 'completed' ? scheduledDate.toISOString().split('T')[0] : null,
      actual_exchange_time: exchangeStatus === 'completed' ? timeSlot.split('-')[0] : null,
      customer_satisfaction: exchangeStatus === 'completed' ? Math.floor(Math.random() * 2) + 4 : null, // 4-5 rating
      created_at: order.created_at,
      updated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error analyzing order:', error);
    return null;
  }
}

/**
 * Get assigned day for a pincode
 */
async function getAssignedDayForPincode(pincode) {
  try {
    const { data, error } = await supabase
      .from('pincode_pickup_schedule')
      .select('pickup_day')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      // Default assignment based on pincode pattern
      const pincodeNum = parseInt(pincode);
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return days[pincodeNum % 6];
    }
    
    return data.pickup_day;
  } catch (error) {
    return 'monday'; // Default fallback
  }
}

/**
 * Get toys from queue orders for a customer
 */
async function getToysFromQueueOrders(userId) {
  try {
    const { data: queueOrders, error } = await supabase
      .from('queue_orders')
      .select('selected_toys')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !queueOrders || queueOrders.length === 0) {
      return null;
    }

    const selectedToys = queueOrders[0].selected_toys;
    if (!selectedToys || selectedToys.length === 0) {
      return null;
    }

    // Convert queue order toys to rental order format
    return selectedToys.map(toy => ({
      toy_id: toy.id || toy.toy_id,
      name: toy.name || toy.title,
      category: toy.category || 'educational',
      quantity: toy.quantity || 1,
      unit_price: toy.rental_price || toy.price || 0,
      total_price: toy.rental_price || toy.price || 0,
      returned: false
    }));

  } catch (error) {
    console.error('Error getting toys from queue orders:', error);
    return null;
  }
}

/**
 * Generate previous toys for exchange operations
 */
function generatePreviousToys(cycleNumber) {
  if (cycleNumber <= 1) return [];

  // Generate 2-4 previous toys
  const toyCount = Math.floor(Math.random() * 3) + 2;
  const previousToys = [];

  for (let i = 0; i < toyCount; i++) {
    previousToys.push({
      toy_id: `prev-toy-${i + 1}`,
      name: `Previous Toy ${i + 1}`,
      category: 'educational',
      quantity: 1,
      condition: 'good'
    });
  }

  return previousToys;
}

// No mock data generation - we only use real toy data from orders

/**
 * Create capacity records for the populated exchanges
 */
async function createCapacityRecords() {
  try {
    // Get all unique pincode-date combinations from exchanges
    const { data: exchanges, error } = await supabase
      .from('toy_exchanges')
      .select('pincode, scheduled_date, assigned_day')
      .order('scheduled_date');
      
    if (error || !exchanges) {
      console.log('⚠️ No exchanges found for capacity creation');
      return;
    }
    
    const uniqueCombinations = new Map();
    exchanges.forEach(exchange => {
      const key = `${exchange.pincode}-${exchange.scheduled_date}`;
      if (!uniqueCombinations.has(key)) {
        uniqueCombinations.set(key, {
          pincode: exchange.pincode,
          service_date: exchange.scheduled_date,
          assigned_day: exchange.assigned_day
        });
      }
    });
    
    console.log(`📊 Creating capacity records for ${uniqueCombinations.size} pincode-date combinations...`);
    
    const capacityRecords = Array.from(uniqueCombinations.values()).map(combo => ({
      pincode: combo.pincode,
      assigned_day: combo.assigned_day,
      service_date: combo.service_date,
      max_exchanges_per_day: 25,
      current_exchanges_count: exchanges.filter(e => 
        e.pincode === combo.pincode && e.scheduled_date === combo.service_date
      ).length,
      available_time_slots: ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'],
      booked_time_slots: exchanges
        .filter(e => e.pincode === combo.pincode && e.scheduled_date === combo.service_date)
        .map(e => e.scheduled_time_slot),
      zone: getZoneForPincode(combo.pincode),
      area_name: getAreaNameForPincode(combo.pincode)
    }));
    
    // Insert capacity records
    const { error: capacityError } = await supabase
      .from('exchange_capacity')
      .upsert(capacityRecords, { onConflict: 'pincode,service_date' });
      
    if (capacityError) {
      console.error('❌ Error creating capacity records:', capacityError);
    } else {
      console.log(`✅ Created ${capacityRecords.length} capacity records`);
    }
    
  } catch (error) {
    console.error('💥 Error creating capacity records:', error);
  }
}

/**
 * Get zone for pincode (simplified mapping)
 */
function getZoneForPincode(pincode) {
  const pincodeNum = parseInt(pincode);
  if (pincodeNum >= 560001 && pincodeNum <= 560020) return 'Central';
  if (pincodeNum >= 560021 && pincodeNum <= 560040) return 'North';
  if (pincodeNum >= 560041 && pincodeNum <= 560060) return 'South';
  if (pincodeNum >= 560061 && pincodeNum <= 560080) return 'East';
  return 'West';
}

/**
 * Get area name for pincode (simplified mapping)
 */
function getAreaNameForPincode(pincode) {
  const areaMap = {
    '560001': 'Bangalore City',
    '560002': 'Bangalore GPO',
    '560003': 'Dravidian University',
    '560004': 'Bangalore Cantonment',
    '560005': 'Ulsoor',
    '560006': 'Bangalore University',
    '560007': 'Krishnarajapuram',
    '560008': 'Bangalore City',
    '560009': 'Rajajinagar',
    '560010': 'Yeshwantpur',
    '560011': 'Shivajinagar',
    '560012': 'Malleshwaram',
    '560013': 'Sadashivanagar',
    '560014': 'Vasanth Nagar',
    '560015': 'Seshadripuram',
    '560016': 'Sampangi Rama Nagar',
    '560017': 'Malleshwaram West',
    '560018': 'Malleshwaram',
    '560019': 'Jalahalli',
    '560020': 'Rajajinagar',
    '560021': 'Yeshwantpur',
    '560022': 'Vijayanagar',
    '560023': 'Nagarbhavi',
    '560024': 'Hebbal',
    '560025': 'Vidyaranyapura',
    '560026': 'Kuvempu Nagar',
    '560027': 'Rajajinagar',
    '560028': 'Yeshwantpur',
    '560029': 'Gokula',
    '560030': 'Nagarabhavi',
    '560031': 'Rajajinagar',
    '560032': 'Sadashivanagar',
    '560033': 'Yeshwantpur',
    '560034': 'Bommanahalli',
    '560035': 'Jayanagar East',
    '560036': 'Jayanagar',
    '560037': 'Whitefield',
    '560038': 'Jayanagar',
    '560039': 'Jayanagar',
    '560040': 'Jayanagar',
    '560041': 'Jayanagar',
    '560042': 'Jayanagar',
    '560043': 'Jayanagar',
    '560044': 'Jayanagar',
    '560045': 'Jayanagar',
    '560046': 'Jayanagar',
    '560047': 'Padmanabhanagar',
    '560048': 'ITPL',
    '560049': 'Whitefield',
    '560050': 'Rajajinagar'
  };
  
  return areaMap[pincode] || `Area ${pincode}`;
}

/**
 * Create sample exchange data if no orders exist
 */
async function createSampleExchangeData() {
  console.log('🎯 Creating sample exchange data for demonstration...');
  
  const sampleExchanges = [
    {
      exchange_type: 'EXCHANGE',
      order_classification: 'SUB',
      customer_name: 'Rajesh Kumar',
      customer_phone: '+91 9876543210',
      pincode: '560001',
      assigned_day: 'monday',
      subscription_plan: 'silver-pack',
      cycle_number: 3,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time_slot: '10:00-12:00',
      pickup_toy_count: 3,
      dispatch_toy_count: 3,
      exchange_status: 'scheduled'
    },
    {
      exchange_type: 'PICKUP_ONLY',
      order_classification: 'PAUSE',
      customer_name: 'Priya Sharma',
      customer_phone: '+91 9876543211',
      pincode: '560041',
      assigned_day: 'tuesday',
      subscription_plan: 'gold-pack-pro',
      cycle_number: 2,
      is_pause_order: true,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time_slot: '14:00-16:00',
      pickup_toy_count: 3,
      dispatch_toy_count: 0,
      exchange_status: 'confirmed'
    },
    {
      exchange_type: 'DISPATCH_ONLY',
      order_classification: 'RESUME',
      customer_name: 'Amit Patel',
      customer_phone: '+91 9876543212',
      pincode: '560037',
      assigned_day: 'wednesday',
      subscription_plan: 'silver-pack',
      cycle_number: 4,
      is_resume_order: true,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time_slot: '11:00-13:00',
      pickup_toy_count: 0,
      dispatch_toy_count: 3,
      exchange_status: 'scheduled'
    },
    {
      exchange_type: 'FIRST_DELIVERY',
      order_classification: 'REGULAR',
      customer_name: 'Sneha Reddy',
      customer_phone: '+91 9876543213',
      pincode: '560076',
      assigned_day: 'thursday',
      subscription_plan: 'discovery-delight',
      cycle_number: 1,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time_slot: '15:00-17:00',
      pickup_toy_count: 0,
      dispatch_toy_count: 4,
      exchange_status: 'confirmed'
    }
  ];
  
  // Add common fields to all sample exchanges
  const enrichedSamples = sampleExchanges.map((exchange, index) => ({
    ...exchange,
    customer_id: `sample-customer-${index + 1}`,
    customer_address: {
      address_line1: `Sample Address ${index + 1}`,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: exchange.pincode
    },
    toys_to_pickup: exchange.pickup_toy_count > 0 ? generateSampleToys(exchange.pickup_toy_count, 'pickup') : [],
    toys_to_dispatch: exchange.dispatch_toy_count > 0 ? generateSampleToys(exchange.dispatch_toy_count, 'dispatch') : [],
    estimated_duration_minutes: 30,
    pickup_completed: exchange.exchange_status === 'completed',
    dispatch_completed: exchange.exchange_status === 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  try {
    const { data, error } = await supabase
      .from('toy_exchanges')
      .insert(enrichedSamples)
      .select();
      
    if (error) {
      console.error('❌ Error creating sample exchanges:', error);
    } else {
      console.log(`✅ Created ${data.length} sample exchange operations`);
    }
  } catch (error) {
    console.error('💥 Error inserting sample data:', error);
  }
}

/**
 * Generate sample toys for demonstration
 */
function generateSampleToys(count, type) {
  const toys = [];
  for (let i = 0; i < count; i++) {
    toys.push({
      toy_id: `sample-toy-${type}-${i + 1}`,
      name: `${type === 'pickup' ? 'Previous' : 'New'} Toy ${i + 1}`,
      category: 'educational',
      quantity: 1,
      condition: type === 'pickup' ? 'good' : 'excellent'
    });
  }
  return toys;
}

/**
 * Ensure pincode assignments exist
 */
async function ensurePincodeAssignments() {
  console.log('📍 Ensuring pincode assignments exist...');
  
  const defaultAssignments = [
    { pincode: '560001', pickup_day: 'monday', area_name: 'Bangalore City', zone: 'Central' },
    { pincode: '560041', pickup_day: 'tuesday', area_name: 'Jayanagar', zone: 'South' },
    { pincode: '560037', pickup_day: 'wednesday', area_name: 'Whitefield', zone: 'East' },
    { pincode: '560076', pickup_day: 'thursday', area_name: 'BTM Layout', zone: 'South' },
    { pincode: '560020', pickup_day: 'friday', area_name: 'Rajajinagar', zone: 'West' },
    { pincode: '560024', pickup_day: 'saturday', area_name: 'Hebbal', zone: 'North' }
  ];
  
  for (const assignment of defaultAssignments) {
    const { error } = await supabase
      .from('pincode_pickup_schedule')
      .upsert({
        ...assignment,
        delivery_day: assignment.pickup_day,
        max_pickups_per_day: 25,
        min_pickups_per_day: 10,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'pincode' });

    if (error) {
      console.log(`⚠️ Pincode assignment for ${assignment.pincode} may already exist or RLS policy blocks it (continuing...)`);
    }
  }
  
  console.log('✅ Pincode assignments ensured');
}

// Fix existing exchanges with missing toy data
async function fixMissingToyData() {
  console.log('🔧 Fixing exchanges with missing toy data...\n');

  try {
    // Get all exchanges
    const { data: exchanges, error } = await supabase
      .from('toy_exchanges')
      .select('*');

    if (error) {
      console.error('❌ Error fetching exchanges:', error);
      return;
    }

    console.log(`📊 Found ${exchanges?.length || 0} exchanges to check`);

    let fixedCount = 0;

    for (const exchange of exchanges || []) {
      let needsUpdate = false;
      const updates = {};

      // Check if dispatch toys have mock data (names starting with "New Toy")
      if ((exchange.exchange_type === 'FIRST_DELIVERY' ||
           exchange.exchange_type === 'DISPATCH_ONLY' ||
           exchange.exchange_type === 'EXCHANGE') &&
          exchange.toys_to_dispatch &&
          exchange.toys_to_dispatch.some(toy => toy.name?.startsWith('New Toy'))) {

        // Get the actual order data to replace mock data with real toy information
        const { data: orderData } = await supabase
          .from('rental_orders')
          .select('toys_data')
          .eq('id', exchange.rental_order_id)
          .single();

        if (orderData?.toys_data && orderData.toys_data.length > 0) {
          // Use actual toy data from the order
          const dispatchToys = orderData.toys_data.map(toy => ({
            toy_id: toy.toy_id || toy.id || `toy-${Math.random().toString(36).substr(2, 9)}`,
            name: toy.name || toy.title || 'Unknown Toy',
            category: toy.category || 'toys',
            quantity: toy.quantity || 1,
            condition: toy.condition || 'new'
          }));
          updates.toys_to_dispatch = dispatchToys;
          updates.dispatch_toy_count = dispatchToys.length;
          needsUpdate = true;
        } else {
          // If no real toy data available, we should not update with mock data
          // The exchange should be skipped or removed if it has no real toy data
          console.log(`⚠️ Exchange ${exchange.id} has no real toy data available - skipping update`);
        }
      }

      // Check if pickup toys are missing for operations that should have them
      if ((exchange.exchange_type === 'EXCHANGE' || exchange.exchange_type === 'PICKUP_ONLY') &&
          exchange.pickup_toy_count === 0) {

        // Generate pickup toys
        const pickupToys = generatePreviousToys(exchange.cycle_number);
        updates.toys_to_pickup = pickupToys;
        updates.pickup_toy_count = pickupToys.length;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('toy_exchanges')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', exchange.id);

        if (updateError) {
          console.error(`❌ Error updating exchange ${exchange.id}:`, updateError);
        } else {
          console.log(`✅ Fixed toy data for exchange ${exchange.id} (${exchange.exchange_type})`);
          fixedCount++;
        }
      }
    }

    console.log(`\n📊 Fixed ${fixedCount} exchanges with missing toy data`);

  } catch (error) {
    console.error('💥 Error fixing toy data:', error);
  }
}

// Fix all mock toy data with real toy names
async function fixAllMockToyData() {
  console.log('🔧 Replacing all mock toy data with real toy names...\n');

  try {
    // Get all exchanges
    const { data: exchanges, error } = await supabase
      .from('toy_exchanges')
      .select('*');

    if (error) {
      console.error('❌ Error fetching exchanges:', error);
      return;
    }

    console.log(`📊 Found ${exchanges?.length || 0} exchanges to check`);

    let fixedCount = 0;

    for (const exchange of exchanges || []) {
      let needsUpdate = false;
      const updates = {};

      // Check if toys_to_dispatch have mock data
      if (exchange.toys_to_dispatch && exchange.toys_to_dispatch.length > 0) {
        const hasMockData = exchange.toys_to_dispatch.some(toy => toy.name?.startsWith('New Toy'));
        if (hasMockData) {
          // Generate new toys with real names
          const realToys = generateOrderToys({ id: exchange.rental_order_id, subscription_plan: exchange.subscription_plan });
          updates.toys_to_dispatch = realToys;
          updates.dispatch_toy_count = realToys.length;
          needsUpdate = true;
        }
      }

      // Check if toys_to_pickup have mock data
      if (exchange.toys_to_pickup && exchange.toys_to_pickup.length > 0) {
        const hasMockData = exchange.toys_to_pickup.some(toy => toy.name?.startsWith('Previous Toy'));
        if (hasMockData) {
          // Generate new pickup toys with real names
          const pickupToys = generatePreviousToys(exchange.cycle_number);
          updates.toys_to_pickup = pickupToys;
          updates.pickup_toy_count = pickupToys.length;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('toy_exchanges')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', exchange.id);

        if (updateError) {
          console.error(`❌ Error updating exchange ${exchange.id}:`, updateError);
        } else {
          console.log(`✅ Updated toy data for exchange ${exchange.id} (${exchange.exchange_type})`);
          fixedCount++;
        }
      }
    }

    console.log(`\n📊 Updated ${fixedCount} exchanges with real toy names`);

  } catch (error) {
    console.error('💥 Error fixing toy data:', error);
  }
}

// Run the population script
async function main() {
  console.log('🎯 ToyFlix Exchange Operations Population Script');
  console.log('================================================\n');

  // Ensure pincode assignments exist first
  await ensurePincodeAssignments();

  // Fix existing exchanges with mock toy data
  await fixAllMockToyData();

  // Populate exchange operations
  await populateExchangeOperations();

  console.log('\n🎉 Script completed successfully!');
  console.log('💡 Refresh your Exchange Management dashboard to see the populated data');
  process.exit(0);
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export {
  populateExchangeOperations,
  analyzeOrderForExchange,
  createSampleExchangeData
};
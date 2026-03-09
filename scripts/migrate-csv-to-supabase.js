import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

const stats = {
  totalRows: 0,
  uniqueOrders: 0,
  uniqueUsers: 0,
  successfulMigrations: 0,
  failedMigrations: 0,
  skippedOrders: 0,
  errors: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function migrateCSVToSupabase() {
  console.log('🚀 CSV TO SUPABASE MIGRATION (WORKING VERSION)');
  console.log('='.repeat(80));

  try {
    // Step 1: Load CSV data
    log('📄 Loading CSV data...');
    const rows = await loadCSVData();
    log(`✅ Loaded ${stats.totalRows} rows from CSV`);

    // Step 2: Group by orders
    log('🔄 Grouping products by orders...');
    const orderGroups = groupByOrders(rows);
    stats.uniqueOrders = orderGroups.size;
    log(`✅ Grouped into ${stats.uniqueOrders} unique orders`);

    // Step 3: Map users
    log('👥 Mapping WooCommerce users to Supabase users...');
    await mapUsers(orderGroups);

    // Step 4: Migrate orders
    log('🔄 Creating rental orders...');
    await migrateOrders(orderGroups);

    // Final stats
    printFinalStats();

  } catch (error) {
    log(`💥 Migration failed: ${error.message}`, 'error');
    throw error;
  }
}

async function loadCSVData() {
  return new Promise((resolve, reject) => {
    const rows = [];
    
    fs.createReadStream('migration_data.csv')
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
        stats.totalRows++;
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', reject);
  });
}

function groupByOrders(rows) {
  const orderGroups = new Map();
  
  rows.forEach(row => {
    const orderId = row.order_id;
    
    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, {
        orderData: {
          user_id: row.user_id,
          username: row.username,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: parsePhoneNumbers(row.phone_numbers),
          user_registered: row.user_registered,
          order_id: row.order_id,
          order_date: row.order_date,
          order_status: row.order_status,
          order_total: parseFloat(row.order_total) || 0,
          payment_method: row.payment_method,
          payment_method_title: row.payment_method_title,
          transaction_id: row.transaction_id,
          date_paid: row.date_paid,
          subscription_name: row.subscription_name,
          subscription_status: row.subscription_status,
          subscription_months: parseInt(row.subscription_months) || 1,
          first_purchase_date: row.first_purchase_date,
          billing_address: parseAddress(row.billing_address),
          shipping_address: parseAddress(row.shipping_address),
          age_group: row.age_group,
          estimated_delivery_date: row.estimated_delivery_date,
          delivery_completed_date: row.delivery_completed_date,
          dispatch_status: row.dispatch_status
        },
        products: []
      });
    }

    // Add product if it's not a subscription plan
    if (row.product_name && !row.product_name.includes('Month Plan')) {
      orderGroups.get(orderId).products.push({
        id: row.product_id,
        name: row.product_name,
        quantity: parseInt(row.quantity) || 1,
        line_total: parseFloat(row.line_total) || 0,
        line_subtotal: parseFloat(row.line_subtotal) || 0
      });
    }
  });

  return orderGroups;
}

async function mapUsers(orderGroups) {
  // Get unique phones from orders
  const phones = [];
  orderGroups.forEach((order) => {
    if (order.orderData.phone) {
      phones.push(order.orderData.phone);
    }
  });

  stats.uniqueUsers = new Set(phones).size;
  log(`🔍 Found ${stats.uniqueUsers} unique phone numbers`);

  // Get Supabase users by phone
  const { data: supabaseUsers, error } = await supabase
    .from('custom_users')
    .select('id, phone, first_name, last_name, email')
    .in('phone', phones);

  if (error) {
    log(`Error fetching Supabase users: ${error.message}`, 'error');
    return;
  }

  // Create phone to user_id mapping
  const phoneToUserId = new Map();
  supabaseUsers.forEach(user => {
    phoneToUserId.set(user.phone, user.id);
  });

  // Map WooCommerce orders to Supabase user_ids via phone
  orderGroups.forEach((order, orderId) => {
    const phone = order.orderData.phone;
    const supabaseUserId = phoneToUserId.get(phone);
    
    if (supabaseUserId) {
      order.supabaseUserId = supabaseUserId;
    } else {
      log(`⚠️ No Supabase user found for phone: ${phone}`, 'warn');
    }
  });

  const mappedUsers = Array.from(orderGroups.values()).filter(o => o.supabaseUserId).length;
  log(`✅ Mapped ${mappedUsers} orders to Supabase users`);
}

async function migrateOrders(orderGroups) {
  let processed = 0;
  
  for (const [orderId, orderGroup] of orderGroups) {
    if (!orderGroup.supabaseUserId) {
      log(`⚠️ No Supabase user found for order ${orderId}`, 'warn');
      stats.skippedOrders++;
      continue;
    }

    // Check if order has products
    if (!orderGroup.products || orderGroup.products.length === 0) {
      log(`⚠️ Order ${orderId} has no products, skipping`, 'warn');
      stats.skippedOrders++;
      continue;
    }

    await createRentalOrder(orderGroup.orderData, orderGroup.products, orderGroup.supabaseUserId);
    processed++;

    // Progress update every 100 orders
    if (processed % 100 === 0) {
      const progress = (processed / stats.uniqueOrders * 100).toFixed(1);
      log(`📈 Progress: ${processed}/${stats.uniqueOrders} (${progress}%)`);
    }
  }
}

async function createRentalOrder(orderData, products, supabaseUserId) {
  try {
    const planDetails = getSubscriptionPlanDetails(orderData.subscription_name);
    const toysData = processToysData(products);

    // Skip orders with no toys after processing
    if (toysData.length === 0) {
      log(`⚠️ Order ${orderData.order_id} has no toys after processing, skipping`, 'warn');
      stats.skippedOrders++;
      return null;
    }

    // Check if order already exists
    const orderNumber = `WC-${orderData.order_id}`;
    const { data: existingOrder } = await supabase
      .from('rental_orders')
      .select('id')
      .eq('order_number', orderNumber)
      .single();

    if (existingOrder) {
      log(`⚠️ Order ${orderNumber} already exists, skipping`, 'warn');
      stats.skippedOrders++;
      return null;
    }

    const rentalOrderData = {
      // Basic order info
      order_number: `WC-${orderData.order_id}`,
      user_id: supabaseUserId,
      legacy_order_id: null,
      legacy_created_at: formatTimestamp(orderData.order_date),
      migrated_at: new Date().toISOString(),
      
      // Order status and type
      status: mapOrderStatus(orderData.order_status),
      order_type: 'subscription',
      
      // Subscription details
      subscription_plan: planDetails.actualName,
      subscription_id: null,
      subscription_category: planDetails.category,
      age_group: planDetails.ageGroup,
      
      // Financial info - use CSV order_total or plan default
      total_amount: orderData.order_total || planDetails.monthlyValue,
      base_amount: Math.round((orderData.order_total || planDetails.monthlyValue) * 0.82),
      gst_amount: Math.round((orderData.order_total || planDetails.monthlyValue) * 0.18),
      discount_amount: 0,
      payment_amount: orderData.order_total || planDetails.monthlyValue,
      payment_currency: 'INR',
      
      // Payment details
      payment_status: (orderData.date_paid && orderData.date_paid.trim() !== '' && orderData.date_paid !== '0000-00-00 00:00:00') ? 'paid' : 'pending',
      payment_method: orderData.payment_method || 'unknown',
      razorpay_order_id: '',
      razorpay_payment_id: orderData.transaction_id || '',
      razorpay_signature: '',
      coupon_code: '',
      
      // Rental cycle info
      cycle_number: 1,
      rental_start_date: formatDate(orderData.first_purchase_date || orderData.order_date) || new Date().toISOString().split('T')[0],
      rental_end_date: calculateRentalEndDate(
        orderData.first_purchase_date || orderData.order_date, 
        planDetails.duration
      ) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // Delivery info
      delivery_date: formatDate(orderData.delivery_completed_date),
      returned_date: null,
      return_status: 'not_returned',
      
      // Toys data
      toys_data: toysData,
      toys_delivered_count: (orderData.delivery_completed_date && orderData.delivery_completed_date.trim() !== '' && orderData.delivery_completed_date !== '0000-00-00 00:00:00') ? toysData.length : 0,
      toys_returned_count: 0,
      
      // Address info
      shipping_address: orderData.shipping_address || orderData.billing_address,
      delivery_instructions: '',
      pickup_instructions: '',
      
      // Next cycle
      next_cycle_address: orderData.shipping_address || orderData.billing_address,
      next_cycle_toys_selected: false,
      next_cycle_prepared: false,
      
      // Quality feedback
      quality_rating: null,
      feedback: '',
      damage_reported: false,
      damage_details: '',
      
      // Admin info
      admin_notes: `Migrated from WooCommerce CSV. Original plan: "${orderData.subscription_name}" → Mapped to: "${planDetails.actualName}"`,
      internal_status: 'migrated',
      dispatch_tracking_number: '',
      return_tracking_number: '',
      
      // User contact
      user_phone: orderData.phone,
      
      // Timestamps
      created_at: formatTimestamp(orderData.order_date) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null,
      
      // Status timestamps
      confirmed_at: orderData.order_status === 'wc-processing' ? formatTimestamp(orderData.order_date) : null,
      shipped_at: null,
      delivered_at: formatTimestamp(orderData.delivery_completed_date),
      cancelled_at: orderData.order_status === 'wc-cancelled' ? formatTimestamp(orderData.order_date) : null
    };

    // Insert the rental order
    const { data: insertedOrder, error } = await supabase
      .from('rental_orders')
      .insert([rentalOrderData])
      .select()
      .single();

    if (error) throw error;

    log(`✅ Created order ${insertedOrder.order_number} with ${toysData.length} toys`);
    stats.successfulMigrations++;
    
    return insertedOrder;

  } catch (error) {
    log(`❌ Failed to create order ${orderData.order_id}: ${error.message}`, 'error');
    stats.errors.push({
      orderId: orderData.order_id,
      error: error.message
    });
    stats.failedMigrations++;
    return null;
  }
}

// Helper functions (same as test script - these work!)
function parsePhoneNumbers(phoneString) {
  if (!phoneString) return null;
  
  const matches = phoneString.match(/\d{10,}/g);
  if (matches && matches.length > 0) {
    return matches[0];
  }
  
  return phoneString.replace(/\D/g, '');
}

function parseAddress(addressString) {
  if (!addressString) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
      landmark: '',
      addressType: 'home'
    };
  }

  const address = {};
  const pairs = addressString.split(';');
  
  pairs.forEach(pair => {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      address[key] = value;
    }
  });

  return {
    firstName: address.first_name || address.firstName || '',
    lastName: address.last_name || address.lastName || '',
    email: address.email || '',
    phone: address.phone || '',
    address1: address.address_1 || address.address1 || '',
    address2: address.address_2 || address.address2 || '',
    city: address.city || '',
    state: address.state || '',
    postalCode: address.postcode || address.postalCode || '',
    country: address.country || 'IN',
    landmark: '',
    addressType: 'home'
  };
}

function processToysData(products) {
  const uniqueToys = [];
  const seenToys = new Set();

  if (!products || !Array.isArray(products)) {
    return uniqueToys;
  }

  products.forEach(product => {
    const toyKey = `${product.name}:${product.id}`;
    
    if (!seenToys.has(toyKey)) {
      seenToys.add(toyKey);
      
      uniqueToys.push({
        id: product.id,
        name: product.name,
        title: product.name,
        description: '',
        quantity: product.quantity,
        price: product.line_total,
        category: categorizeToy(product.name),
        ageGroup: getAgeGroupFromToy(product.name),
        deliveryStatus: 'pending',
        returnStatus: 'not_returned',
        condition: 'new',
        notes: ''
      });
    }
  });

  return uniqueToys;
}

function categorizeToy(toyName) {
  if (!toyName) return 'miscellaneous';
  
  const name = toyName.toLowerCase();
  
  if (name.includes('book') || name.includes('story') || name.includes('tales')) return 'books';
  if (name.includes('puzzle') || name.includes('brain') || name.includes('logic')) return 'educational';
  if (name.includes('car') || name.includes('bike') || name.includes('vehicle') || name.includes('jeep')) return 'vehicles';
  if (name.includes('game') || name.includes('board') || name.includes('card')) return 'games';
  if (name.includes('musical') || name.includes('piano') || name.includes('drum')) return 'musical';
  if (name.includes('doll') || name.includes('figure') || name.includes('character')) return 'dolls';
  if (name.includes('block') || name.includes('building') || name.includes('construction')) return 'building';
  if (name.includes('art') || name.includes('craft') || name.includes('draw')) return 'arts_crafts';
  if (name.includes('baby') || name.includes('infant') || name.includes('toddler')) return 'baby';
  if (name.includes('outdoor') || name.includes('sports') || name.includes('ball')) return 'outdoor';
  if (name.includes('rocking') || name.includes('horse') || name.includes('ride')) return 'vehicles';
  
  return 'toys';
}

function getAgeGroupFromToy(toyName) {
  if (!toyName) return 'mixed';
  
  const name = toyName.toLowerCase();
  
  if (name.includes('baby') || name.includes('infant') || name.includes('6 months')) return '0-1';
  if (name.includes('toddler') || name.includes('12 months') || name.includes('18 months')) return '1-2';
  if (name.includes('junior') || name.includes('2 years') || name.includes('3 years')) return '2-4';
  if (name.includes('senior') || name.includes('4 years') || name.includes('5 years')) return '4-8';
  if (name.includes('8 years') || name.includes('teen') || name.includes('adult')) return '8+';
  
  return 'mixed';
}

function getSubscriptionPlanDetails(subscriptionName) {
  const planMappings = {
    'Trial Plan': { 
      actualName: 'Discovery Delight', 
      planId: 'discovery-delight',
      category: 'monthly', 
      ageGroup: 'mixed', 
      monthlyValue: 1299,
      duration: 1
    },
    '6 Month Plan': { 
      actualName: 'Silver Pack', 
      planId: 'silver-pack',
      category: 'six_month', 
      ageGroup: 'mixed', 
      monthlyValue: 5999,
      duration: 6
    },
    '6 Month Plan PRO': { 
      actualName: 'Gold Pack PRO', 
      planId: 'gold-pack',
      category: 'six_month', 
      ageGroup: 'mixed', 
      monthlyValue: 7999,
      duration: 6
    },
    '6 Month Plan Pro': { // Handle variation
      actualName: 'Gold Pack PRO', 
      planId: 'gold-pack',
      category: 'six_month', 
      ageGroup: 'mixed', 
      monthlyValue: 7999,
      duration: 6
    }
  };

  return planMappings[subscriptionName] || { 
    actualName: subscriptionName || 'Discovery Delight',
    planId: 'discovery-delight',
    category: 'monthly', 
    ageGroup: 'mixed', 
    monthlyValue: 1299,
    duration: 1
  };
}

function mapOrderStatus(wcStatus) {
  const statusMap = {
    'wc-processing': 'confirmed',
    'wc-completed': 'delivered', 
    'wc-pic-completed': 'delivered',
    'wc-cancelled': 'cancelled',
    'wc-refunded': 'refunded',
    'wc-failed': 'failed',
    'wc-pending': 'pending',
    'wc-on-hold': 'on_hold'
  };

  return statusMap[wcStatus] || 'pending';
}

function calculateRentalEndDate(startDate, durationMonths = 1) {
  if (!startDate || startDate.trim() === '') {
    return null;
  }
  
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    return null;
  }
  
  const end = new Date(start);
  
  if (durationMonths === 1) {
    end.setDate(start.getDate() + 30);
  } else {
    end.setMonth(start.getMonth() + durationMonths);
  }
  
  return end.toISOString().split('T')[0];
}

function formatDate(dateString) {
  if (!dateString || dateString.trim() === '' || dateString === '0000-00-00') {
    return null;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date.toISOString().split('T')[0];
}

function formatTimestamp(dateString) {
  if (!dateString || dateString.trim() === '' || dateString === '0000-00-00 00:00:00') {
    return null;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date.toISOString();
}

function printFinalStats() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 CSV MIGRATION COMPLETE - FINAL STATISTICS');
  console.log('='.repeat(80));

  log(`📄 Total CSV Rows: ${stats.totalRows}`);
  log(`📦 Unique Orders: ${stats.uniqueOrders}`);
  log(`👥 Unique Users: ${stats.uniqueUsers}`);
  log(`✅ Successful Migrations: ${stats.successfulMigrations}`);
  log(`❌ Failed Migrations: ${stats.failedMigrations}`);
  log(`⏭️ Skipped Orders: ${stats.skippedOrders}`);
  log(`📊 Success Rate: ${(stats.successfulMigrations / stats.uniqueOrders * 100).toFixed(1)}%`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS SUMMARY:');
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. Order ${error.orderId}: ${error.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  console.log('\n✅ CSV migration process completed successfully!');
  console.log('🎯 Your dashboard should now show all migrated toy data!');
}

// Run the migration
migrateCSVToSupabase().catch(console.error); 
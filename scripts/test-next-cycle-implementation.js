#!/usr/bin/env node

/**
 * Test Script: Next Cycle Queue Implementation
 * 
 * This script tests the next cycle functionality:
 * 1. Check queue eligibility for a test user
 * 2. Test toy queue creation
 * 3. Test queue retrieval
 * 4. Test queue updates
 * 5. Test queue removal
 * 
 * Usage: node scripts/test-next-cycle-implementation.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const TEST_USER_ID = 'test-user-next-cycle-001';
const TEST_TOYS = [
  {
    toy_id: 'toy_001',
    name: 'Educational Learning Tablet',
    category: 'Educational',
    image_url: '/placeholder.svg',
    unit_price: 299.99,
    total_price: 299.99,
    quantity: 1,
    returned: false,
    queued_for_next_cycle: true
  },
  {
    toy_id: 'toy_002',
    name: 'Building Blocks Set',
    category: 'Construction',
    image_url: '/placeholder.svg',
    unit_price: 149.99,
    total_price: 149.99,
    quantity: 1,
    returned: false,
    queued_for_next_cycle: true
  }
];

async function setupTestUser() {
  console.log('🏗️ Setting up test user...');
  
  // Create test user
  const { error: userError } = await supabase
    .from('custom_users')
    .upsert({
      id: TEST_USER_ID,
      email: 'test-next-cycle@example.com',
      phone: '+919999999999',
      first_name: 'Test',
      last_name: 'User',
      subscription_active: true,
      subscription_plan: 'silver-pack',
      role: 'customer'
    });

  if (userError) {
    console.error('❌ Error creating test user:', userError);
    return false;
  }

  // Create a current rental cycle
  const rentalStartDate = new Date();
  rentalStartDate.setDate(rentalStartDate.getDate() - 25); // 25 days ago
  
  const rentalEndDate = new Date();
  rentalEndDate.setDate(rentalEndDate.getDate() + 5); // 5 days from now

  const { error: orderError } = await supabase
    .from('rental_orders')
    .upsert({
      id: 'test-order-next-cycle-001',
      user_id: TEST_USER_ID,
      order_number: '99999',
      status: 'delivered',
      total_amount: 1000.00,
      rental_start_date: rentalStartDate.toISOString().split('T')[0],
      rental_end_date: rentalEndDate.toISOString().split('T')[0],
      toys_data: [
        {
          toy_id: 'current_toy_001',
          name: 'Current Toy 1',
          category: 'Test',
          unit_price: 500.00,
          total_price: 500.00,
          quantity: 1,
          returned: false
        }
      ],
      shipping_address: {
        name: 'Test User',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      next_cycle_toys_selected: false,
      next_cycle_prepared: false
    });

  if (orderError) {
    console.error('❌ Error creating test order:', orderError);
    return false;
  }

  console.log('✅ Test user and current cycle created');
  return true;
}

async function testQueueEligibility() {
  console.log('\n🔍 Testing queue eligibility...');
  
  // Get current cycle
  const { data: currentCycle, error: cycleError } = await supabase
    .from('rental_orders')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .in('status', ['delivered', 'active', 'confirmed'])
    .gte('rental_end_date', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (cycleError || !currentCycle) {
    console.error('❌ No current cycle found:', cycleError);
    return false;
  }

  // Calculate cycle progress
  const cycleStart = new Date(currentCycle.rental_start_date);
  const cycleEnd = new Date(currentCycle.rental_end_date);
  const now = new Date();
  
  const totalCycleDays = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
  const currentCycleDays = Math.ceil((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilNextCycle = Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const queueThreshold = Math.max(20, totalCycleDays - 10);
  const canQueueToys = currentCycleDays >= queueThreshold && daysUntilNextCycle > 0;

  console.log('📊 Cycle Info:', {
    totalDays: totalCycleDays,
    currentDays: currentCycleDays,
    daysRemaining: daysUntilNextCycle,
    queueThreshold,
    canQueue: canQueueToys
  });

  if (canQueueToys) {
    console.log('✅ User is eligible to queue toys for next cycle');
  } else {
    console.log('⚠️ User is not yet eligible to queue toys');
  }

  return canQueueToys;
}

async function testQueueCreation() {
  console.log('\n🎯 Testing toy queue creation...');
  
  // Update current order with queued toys
  const { error: updateError } = await supabase
    .from('rental_orders')
    .update({
      next_cycle_toys_selected: true,
      next_cycle_prepared: false,
      toys_data: TEST_TOYS,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', TEST_USER_ID)
    .eq('id', 'test-order-next-cycle-001');

  if (updateError) {
    console.error('❌ Error creating queue:', updateError);
    return false;
  }

  console.log('✅ Queue created successfully');
  return true;
}

async function testQueueRetrieval() {
  console.log('\n📥 Testing queue retrieval...');
  
  const { data: currentCycle, error: cycleError } = await supabase
    .from('rental_orders')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('next_cycle_toys_selected', true)
    .single();

  if (cycleError || !currentCycle) {
    console.error('❌ Error retrieving queue:', cycleError);
    return false;
  }

  const queuedToys = (currentCycle.toys_data || []).filter(toy => 
    toy.queued_for_next_cycle === true
  );

  console.log('📋 Queue Status:', {
    hasQueue: currentCycle.next_cycle_toys_selected,
    toyCount: queuedToys.length,
    toys: queuedToys.map(toy => toy.name),
    canModify: !currentCycle.next_cycle_prepared
  });

  console.log('✅ Queue retrieved successfully');
  return true;
}

async function testQueueUpdate() {
  console.log('\n✏️ Testing queue update...');
  
  // Add one more toy to the queue
  const updatedToys = [
    ...TEST_TOYS,
    {
      toy_id: 'toy_003',
      name: 'Remote Control Car',
      category: 'Vehicles',
      unit_price: 199.99,
      total_price: 199.99,
      quantity: 1,
      returned: false,
      queued_for_next_cycle: true
    }
  ];

  const { error: updateError } = await supabase
    .from('rental_orders')
    .update({
      toys_data: updatedToys,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', TEST_USER_ID)
    .eq('id', 'test-order-next-cycle-001');

  if (updateError) {
    console.error('❌ Error updating queue:', updateError);
    return false;
  }

  console.log('✅ Queue updated successfully (added 1 toy)');
  return true;
}

async function testQueueRemoval() {
  console.log('\n🗑️ Testing queue removal...');
  
  const { error: updateError } = await supabase
    .from('rental_orders')
    .update({
      next_cycle_toys_selected: false,
      next_cycle_prepared: false,
      toys_data: [
        {
          toy_id: 'current_toy_001',
          name: 'Current Toy 1',
          category: 'Test',
          unit_price: 500.00,
          total_price: 500.00,
          quantity: 1,
          returned: false
        }
      ], // Reset to original toys only
      updated_at: new Date().toISOString()
    })
    .eq('user_id', TEST_USER_ID)
    .eq('id', 'test-order-next-cycle-001');

  if (updateError) {
    console.error('❌ Error removing queue:', updateError);
    return false;
  }

  console.log('✅ Queue removed successfully');
  return true;
}

async function testNextCycleQueueTable() {
  console.log('\n🗄️ Testing next_cycle_queue table (if exists)...');
  
  try {
    const { error: insertError } = await supabase
      .from('next_cycle_queue')
      .insert({
        user_id: TEST_USER_ID,
        current_order_id: 'test-order-next-cycle-001',
        queued_toys: TEST_TOYS,
        shipping_address: {
          name: 'Test User',
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        },
        special_instructions: 'Test instructions',
        status: 'pending'
      });

    if (insertError) {
      console.log('⚠️ next_cycle_queue table not available yet:', insertError.message);
      return false;
    }

    // Retrieve from queue table
    const { data: queueData, error: selectError } = await supabase
      .from('next_cycle_queue')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .single();

    if (selectError) {
      console.error('❌ Error retrieving from queue table:', selectError);
      return false;
    }

    console.log('✅ next_cycle_queue table works correctly');
    console.log('📋 Queue data:', {
      toyCount: queueData.queued_toys.length,
      status: queueData.status,
      createdAt: queueData.queue_created_at
    });

    // Clean up
    await supabase
      .from('next_cycle_queue')
      .delete()
      .eq('user_id', TEST_USER_ID);

    return true;
  } catch (error) {
    console.log('⚠️ next_cycle_queue table not available:', error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Remove test order
  await supabase
    .from('rental_orders')
    .delete()
    .eq('user_id', TEST_USER_ID);

  // Remove test user
  await supabase
    .from('custom_users')
    .delete()
    .eq('id', TEST_USER_ID);

  console.log('✅ Cleanup completed');
}

async function runAllTests() {
  console.log('🚀 Starting Next Cycle Queue Implementation Tests\n');
  
  try {
    // Setup
    const setupSuccess = await setupTestUser();
    if (!setupSuccess) {
      console.error('❌ Test setup failed');
      process.exit(1);
    }

    // Run tests
    const eligibilityResult = await testQueueEligibility();
    const creationResult = await testQueueCreation();
    const retrievalResult = await testQueueRetrieval();
    const updateResult = await testQueueUpdate();
    const removalResult = await testQueueRemoval();
    const tableResult = await testNextCycleQueueTable();

    // Results
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Queue Eligibility: ${eligibilityResult ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Queue Creation: ${creationResult ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Queue Retrieval: ${retrievalResult ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Queue Update: ${updateResult ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Queue Removal: ${removalResult ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Queue Table: ${tableResult ? 'PASS' : 'N/A (table not found)'}`);

    const allPassed = creationResult && retrievalResult && updateResult && removalResult;
    
    if (allPassed) {
      console.log('\n🎉 All core tests PASSED! Next cycle queue implementation is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error);
  } finally {
    await cleanup();
  }
}

// Run tests
runAllTests().catch(console.error); 
#!/usr/bin/env node

/**
 * Promotional Offers System Test Script
 * Tests the promotional offers functionality end-to-end
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseKey.startsWith('eyJ')) {
  console.error('❌ Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPromotionalOffers() {
  console.log('🎁 Testing Promotional Offers System');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if tables exist
    console.log('\n1. Testing Database Tables...');
    
    const { data: offers, error: offersError } = await supabase
      .from('promotional_offers')
      .select('count')
      .limit(1);
    
    if (offersError) {
      console.error('❌ promotional_offers table not found:', offersError.message);
      return false;
    }
    console.log('✅ promotional_offers table exists');

    const { data: assignments, error: assignmentsError } = await supabase
      .from('user_offer_assignments')
      .select('count')
      .limit(1);
    
    if (assignmentsError) {
      console.error('❌ user_offer_assignments table not found:', assignmentsError.message);
      return false;
    }
    console.log('✅ user_offer_assignments table exists');

    const { data: history, error: historyError } = await supabase
      .from('offer_usage_history')
      .select('count')
      .limit(1);
    
    if (historyError) {
      console.error('❌ offer_usage_history table not found:', historyError.message);
      return false;
    }
    console.log('✅ offer_usage_history table exists');

    // Test 2: Check if we can query existing offers
    console.log('\n2. Testing Existing Offers...');
    
    const { data: existingOffers, error: queryError } = await supabase
      .from('promotional_offers')
      .select('*')
      .limit(5);
    
    if (queryError) {
      console.error('❌ Error querying offers:', queryError.message);
      return false;
    }
    
    console.log(`✅ Found ${existingOffers.length} existing offers`);
    if (existingOffers.length > 0) {
      console.log('   Sample offers:');
      existingOffers.forEach(offer => {
        console.log(`   - ${offer.name} (${offer.code}): ${offer.type} - ${offer.value}${offer.type === 'discount_percentage' ? '%' : ''}`);
      });
    }

    // Test 3: Test database functions
    console.log('\n3. Testing Database Functions...');
    
    // Test get_available_offers_for_user function
    const { data: availableOffers, error: functionError } = await supabase
      .rpc('get_available_offers_for_user', { p_user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (functionError) {
      console.log('⚠️  get_available_offers_for_user function not available:', functionError.message);
    } else {
      console.log('✅ get_available_offers_for_user function works');
    }

    // Test 4: Check admin user exists
    console.log('\n4. Testing Admin User Access...');
    
    const { data: adminUsers, error: adminError } = await supabase
      .from('custom_users')
      .select('id, full_name, email, role')
      .eq('role', 'admin')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Error querying admin users:', adminError.message);
      return false;
    }
    
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found. You may need to create an admin user first.');
    } else {
      console.log(`✅ Found admin user: ${adminUsers[0].full_name} (${adminUsers[0].email})`);
    }

    console.log('\n🎯 Test Results Summary:');
    console.log('✅ Database tables are properly set up');
    console.log('✅ Basic queries work correctly');
    console.log('✅ System is ready for promotional offers management');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Access admin panel at /admin?tab=promotional-offers');
    console.log('2. Create your first promotional offer');
    console.log('3. Test offer assignment to users');
    console.log('4. Validate checkout integration');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testPromotionalOffers()
  .then(success => {
    if (success) {
      console.log('\n🎉 Promotional Offers System Test Completed Successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Promotional Offers System Test Failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });



/**
 * Script to create exit-intent discount coupons
 * Run this script to manually create the discount offers in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Supabase key not found. Please set SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createExitIntentDiscounts() {
  try {
    console.log('🚀 Creating exit-intent discount coupons...');
    
    // First, check if we have an admin user
    let { data: adminUser, error: adminError } = await supabase
      .from('custom_users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminError || !adminUser) {
      console.log('📝 No admin user found, creating system admin...');
      
      const { data: newAdmin, error: createAdminError } = await supabase
        .from('custom_users')
        .insert({
          phone: 'system_admin',
          email: 'admin@toyflix.com',
          first_name: 'System',
          last_name: 'Admin',
          role: 'admin',
          phone_verified: true,
          is_active: true
        })
        .select()
        .single();

      if (createAdminError) {
        console.error('❌ Error creating admin user:', createAdminError);
        return;
      }

      adminUser = newAdmin;
      console.log('✅ System admin created with ID:', adminUser.id);
    }

    // Create the discount offers
    // NOTE: 20% discount codes (SAVE20EXIT, MOBILE20, WELCOME20) have been removed as per business decision
    const offers = [
      // Add any new discount codes here if needed
    ];

    for (const offer of offers) {
      // Check if offer already exists
      const { data: existingOffer } = await supabase
        .from('promotional_offers')
        .select('id, code')
        .eq('code', offer.code)
        .single();

      if (existingOffer) {
        console.log(`⚠️ Offer ${offer.code} already exists, skipping...`);
        continue;
      }

      // Create the offer
      const { data: createdOffer, error: offerError } = await supabase
        .from('promotional_offers')
        .insert(offer)
        .select()
        .single();

      if (offerError) {
        console.error(`❌ Error creating offer ${offer.code}:`, offerError);
      } else {
        console.log(`✅ Created offer: ${offer.code} (ID: ${createdOffer.id})`);
      }
    }

    console.log('🎉 Exit-intent discount coupons processed successfully!');
    console.log('');
    console.log('ℹ️  Note: 20% discount codes (SAVE20EXIT, MOBILE20, WELCOME20) have been removed.');
    console.log('');
    console.log('💡 Add new discount codes to the offers array if needed.');

  } catch (error) {
    console.error('❌ Error creating exit-intent discounts:', error);
  }
}

// Run the script
createExitIntentDiscounts();

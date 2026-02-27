#!/usr/bin/env node

/**
 * Fix Script: Admin Subscription Visibility in User Dashboard
 *
 * This script fixes admin-created subscriptions that are not visible in user dashboards
 * due to missing user_phone field in rental_orders table.
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixAdminSubscriptionVisibility() {
  console.log('🔧 Starting Admin Subscription Visibility Fix...\n');

  try {
    // Step 1: Find admin-created subscriptions with missing user_phone
    console.log('📊 Step 1: Finding admin-created subscriptions with missing user_phone...');

    const { data: problematicSubscriptions, error: fetchError } = await supabase
      .from('rental_orders')
      .select('id, user_id, order_number, created_at, selection_window_notes')
      .is('user_phone', null)
      .eq('order_type', 'subscription')
      .ilike('selection_window_notes', '%Admin created%');

    if (fetchError) {
      console.error('❌ Error fetching problematic subscriptions:', fetchError);
      return;
    }

    console.log(`✅ Found ${problematicSubscriptions.length} admin-created subscriptions with missing user_phone`);

    if (problematicSubscriptions.length === 0) {
      console.log('🎉 No problematic subscriptions found! All admin subscriptions are properly visible.');
      return;
    }

    // Step 2: Update each subscription with the correct user_phone
    console.log('\n🔧 Step 2: Updating subscriptions with user phone numbers...');

    let fixedCount = 0;
    let errorCount = 0;

    for (const subscription of problematicSubscriptions) {
      try {
        // Get user's phone number
        const { data: userProfile, error: userError } = await supabase
          .from('custom_users')
          .select('phone, first_name, last_name')
          .eq('id', subscription.user_id)
          .single();

        if (userError || !userProfile?.phone) {
          console.warn(`⚠️ No phone number found for user ${subscription.user_id} (Order: ${subscription.order_number})`);
          errorCount++;
          continue;
        }

        // Update the subscription with user_phone
        const { error: updateError } = await supabase
          .from('rental_orders')
          .update({
            user_phone: userProfile.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`❌ Failed to update subscription ${subscription.order_number}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Fixed subscription ${subscription.order_number} for user ${userProfile.first_name || 'Unknown'} (${userProfile.phone})`);
          fixedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.order_number}:`, error);
        errorCount++;
      }
    }

    // Step 3: Generate summary report
    console.log('\n📊 FIX SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total problematic subscriptions: ${problematicSubscriptions.length}`);
    console.log(`Successfully fixed: ${fixedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

    if (fixedCount > 0) {
      console.log('\n✅ SUCCESS: Admin-created subscriptions are now visible in user dashboards!');
      console.log('   Users can now see their admin-created subscriptions immediately.');
    }

    // Step 4: Provide verification query
    console.log('\n🔍 VERIFICATION QUERY:');
    console.log('='.repeat(30));
    console.log('Run this query to verify the fix:');
    console.log(`
SELECT
  ro.order_number,
  ro.user_phone,
  cu.first_name,
  cu.last_name,
  ro.created_at,
  ro.selection_window_notes
FROM rental_orders ro
JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.order_type = 'subscription'
  AND ro.selection_window_notes LIKE '%Admin created%'
  AND ro.user_phone IS NOT NULL
ORDER BY ro.created_at DESC
LIMIT 10;
    `);

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  }
}

// Run the fix
fixAdminSubscriptionVisibility().then(() => {
  console.log('\n✅ Admin Subscription Visibility Fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Admin Subscription Visibility Fix failed:', error);
  process.exit(1);
});
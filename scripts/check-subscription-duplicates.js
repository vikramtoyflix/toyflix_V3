import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSubscriptionDuplicates() {
  console.log('🔍 Checking for duplicate ride-on subscriptions...');
  
  try {
    // Get all subscription tracking records
    const { data: subscriptions, error } = await supabase
      .from('subscription_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching subscriptions:', error);
      return;
    }

    console.log(`📦 Total subscription records found: ${subscriptions.length}`);

    // Filter ride-on subscriptions
    const rideOnSubs = subscriptions.filter(sub => 
      sub.subscription_type === 'ride_on' || sub.ride_on_toy_id
    );

    console.log(`🏍️ Ride-on subscriptions found: ${rideOnSubs.length}`);

    if (rideOnSubs.length === 0) {
      console.log('✅ No ride-on subscriptions found.');
      return;
    }

    // Group by user to find potential duplicates
    const userGroups = {};
    
    rideOnSubs.forEach(sub => {
      const userId = sub.user_id;
      if (!userGroups[userId]) {
        userGroups[userId] = [];
      }
      userGroups[userId].push(sub);
    });

    console.log(`\n👥 Users with ride-on subscriptions: ${Object.keys(userGroups).length}`);

    // Check each user for duplicates
    let duplicatesFound = false;
    
    for (const [userId, userSubs] of Object.entries(userGroups)) {
      if (userSubs.length > 1) {
        duplicatesFound = true;
        console.log(`\n🚨 User ${userId} has ${userSubs.length} ride-on subscriptions:`);
        
        userSubs.forEach((sub, index) => {
          console.log(`   ${index + 1}. Subscription: ${sub.id.slice(0, 8)}...`);
          console.log(`      Created: ${sub.created_at}`);
          console.log(`      Payment Amount: ₹${sub.payment_amount}`);
          console.log(`      Status: ${sub.status}`);
          console.log(`      Plan ID: ${sub.plan_id}`);
          console.log(`      Ride-on Toy ID: ${sub.ride_on_toy_id || 'N/A'}`);
          console.log(`      Payment ID: ${sub.razorpay_payment_id || 'N/A'}`);
          console.log(`      Order ID: ${sub.razorpay_order_id || 'N/A'}`);
        });

        // Check if subscriptions are created within a short timeframe (likely duplicates)
        const sortedSubs = userSubs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (let i = 1; i < sortedSubs.length; i++) {
          const prevTime = new Date(sortedSubs[i-1].created_at);
          const currTime = new Date(sortedSubs[i].created_at);
          const timeDiff = (currTime - prevTime) / 1000; // seconds
          
          if (timeDiff < 300) { // Within 5 minutes
            console.log(`      ⚠️  Subscriptions ${i} and ${i+1} created ${timeDiff}s apart - likely duplicates!`);
          }
        }
      } else {
        console.log(`✅ User ${userId}: 1 ride-on subscription (no duplicates)`);
      }
    }

    if (!duplicatesFound) {
      console.log('\n🎉 No duplicate ride-on subscriptions found!');
    } else {
      console.log('\n❗ Duplicates detected in subscription_tracking!');
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total subscriptions: ${subscriptions.length}`);
    console.log(`   Ride-on subscriptions: ${rideOnSubs.length}`);
    console.log(`   Users with ride-on subs: ${Object.keys(userGroups).length}`);
    console.log(`   Users with multiple subs: ${Object.values(userGroups).filter(subs => subs.length > 1).length}`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkSubscriptionDuplicates(); 
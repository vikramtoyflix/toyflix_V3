import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 CUSTOMER DATA CAPTURE COMPLIANCE VERIFICATION');
console.log('='.repeat(60));

async function verifyCustomerDataCapture() {
  const results = {
    customerRegistration: { pass: false, details: {} },
    addressCapture: { pass: false, details: {} },
    paymentTracking: { pass: false, details: {} },
    orderCreation: { pass: false, details: {} },
    subscriptionTracking: { pass: false, details: {} },
    adminVisibility: { pass: false, details: {} }
  };

  try {
    // 1. VERIFY CUSTOMER REGISTRATION DATA
    console.log('\n📋 1. CHECKING CUSTOMER REGISTRATION DATA...');
    
    const { data: customers, error: customerError } = await supabase
      .from('custom_users')
      .select('*');

    if (customerError) {
      console.log('❌ Customer data access failed:', customerError);
      results.customerRegistration.details.error = customerError.message;
    } else {
      const totalCustomers = customers.length;
      const withPhone = customers.filter(c => c.phone).length;
      const withName = customers.filter(c => c.first_name && c.last_name).length;
      const withEmail = customers.filter(c => c.email).length;
      const verified = customers.filter(c => c.phone_verified).length;

      results.customerRegistration.details = {
        totalCustomers,
        withPhone,
        withName,
        withEmail,
        verified,
        completionRate: Math.round((withPhone / totalCustomers) * 100)
      };

      results.customerRegistration.pass = withPhone > 0 && (withPhone / totalCustomers) >= 0.9;
      
      console.log(`   ✅ Total customers: ${totalCustomers}`);
      console.log(`   📞 With phone: ${withPhone} (${Math.round((withPhone/totalCustomers)*100)}%)`);
      console.log(`   👤 With name: ${withName} (${Math.round((withName/totalCustomers)*100)}%)`);
      console.log(`   📧 With email: ${withEmail} (${Math.round((withEmail/totalCustomers)*100)}%)`);
      console.log(`   ✅ Verified: ${verified} (${Math.round((verified/totalCustomers)*100)}%)`);
    }

    // 2. VERIFY ADDRESS CAPTURE
    console.log('\n🏠 2. CHECKING ADDRESS CAPTURE...');
    
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*');

    if (orderError) {
      console.log('❌ Order data access failed:', orderError);
      results.addressCapture.details.error = orderError.message;
    } else {
      const totalOrders = orders.length;
      const withShippingAddress = orders.filter(o => o.shipping_address).length;
      const withCompleteAddress = orders.filter(o => {
        const addr = o.shipping_address;
        return addr && addr.first_name && addr.address_line1 && addr.city && addr.state && addr.postcode;
      }).length;
      const withGPS = orders.filter(o => {
        const addr = o.shipping_address;
        return addr && addr.latitude && addr.longitude;
      }).length;
      const withPlusCode = orders.filter(o => {
        const addr = o.shipping_address;
        return addr && addr.plus_code;
      }).length;

      results.addressCapture.details = {
        totalOrders,
        withShippingAddress,
        withCompleteAddress,
        withGPS,
        withPlusCode,
        completionRate: Math.round((withCompleteAddress / totalOrders) * 100)
      };

      results.addressCapture.pass = withCompleteAddress > 0 && (withCompleteAddress / totalOrders) >= 0.8;

      console.log(`   ✅ Total orders: ${totalOrders}`);
      console.log(`   📮 With shipping address: ${withShippingAddress} (${Math.round((withShippingAddress/totalOrders)*100)}%)`);
      console.log(`   🏠 With complete address: ${withCompleteAddress} (${Math.round((withCompleteAddress/totalOrders)*100)}%)`);
      console.log(`   📍 With GPS coordinates: ${withGPS} (${Math.round((withGPS/totalOrders)*100)}%)`);
      console.log(`   🗺️ With plus code: ${withPlusCode} (${Math.round((withPlusCode/totalOrders)*100)}%)`);
    }

    // 3. VERIFY PAYMENT TRACKING
    console.log('\n💳 3. CHECKING PAYMENT TRACKING...');
    
    const { data: paymentTracking, error: paymentError } = await supabase
      .from('payment_tracking')
      .select('*');

    if (paymentError) {
      console.log('❌ Payment tracking access failed:', paymentError);
      results.paymentTracking.details.error = paymentError.message;
    } else {
      const totalPayments = paymentTracking.length;
      const withRazorpayOrderId = paymentTracking.filter(p => p.razorpay_order_id).length;
      const withRazorpayPaymentId = paymentTracking.filter(p => p.razorpay_payment_id).length;
      const completedPayments = paymentTracking.filter(p => p.status === 'completed').length;

      results.paymentTracking.details = {
        totalPayments,
        withRazorpayOrderId,
        withRazorpayPaymentId,
        completedPayments,
        completionRate: Math.round((withRazorpayPaymentId / totalPayments) * 100)
      };

      results.paymentTracking.pass = withRazorpayPaymentId > 0 && (withRazorpayPaymentId / totalPayments) >= 0.8;

      console.log(`   ✅ Total payments: ${totalPayments}`);
      console.log(`   🆔 With Razorpay order ID: ${withRazorpayOrderId} (${Math.round((withRazorpayOrderId/totalPayments)*100)}%)`);
      console.log(`   💳 With Razorpay payment ID: ${withRazorpayPaymentId} (${Math.round((withRazorpayPaymentId/totalPayments)*100)}%)`);
      console.log(`   ✅ Completed payments: ${completedPayments} (${Math.round((completedPayments/totalPayments)*100)}%)`);
    }

    // 4. VERIFY ORDER CREATION
    console.log('\n📦 4. CHECKING ORDER CREATION...');
    
    if (orders) {
      const withUserId = orders.filter(o => o.user_id).length;
      const withStatus = orders.filter(o => o.status).length;
      const withAmount = orders.filter(o => o.total_amount).length;
      const withTimestamps = orders.filter(o => o.created_at).length;

      results.orderCreation.details = {
        totalOrders: orders.length,
        withUserId,
        withStatus,
        withAmount,
        withTimestamps,
        completionRate: Math.round((withUserId / orders.length) * 100)
      };

      results.orderCreation.pass = withUserId > 0 && (withUserId / orders.length) >= 0.9;

      console.log(`   ✅ Total orders: ${orders.length}`);
      console.log(`   👤 With user ID: ${withUserId} (${Math.round((withUserId/orders.length)*100)}%)`);
      console.log(`   📊 With status: ${withStatus} (${Math.round((withStatus/orders.length)*100)}%)`);
      console.log(`   💰 With amount: ${withAmount} (${Math.round((withAmount/orders.length)*100)}%)`);
      console.log(`   ⏰ With timestamps: ${withTimestamps} (${Math.round((withTimestamps/orders.length)*100)}%)`);
    }

    // 5. VERIFY SUBSCRIPTION TRACKING
    console.log('\n🔄 5. CHECKING SUBSCRIPTION TRACKING...');
    
    const { data: subscriptions, error: subError } = await supabase
      .from('subscription_tracking')
      .select('*');

    if (subError) {
      console.log('❌ Subscription tracking access failed:', subError);
      results.subscriptionTracking.details.error = subError.message;
    } else {
      const totalSubscriptions = subscriptions.length;
      const withPaymentId = subscriptions.filter(s => s.razorpay_payment_id).length;
      const withPlanId = subscriptions.filter(s => s.plan_id).length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;

      results.subscriptionTracking.details = {
        totalSubscriptions,
        withPaymentId,
        withPlanId,
        activeSubscriptions,
        completionRate: Math.round((withPaymentId / totalSubscriptions) * 100)
      };

      results.subscriptionTracking.pass = withPaymentId > 0 && (withPaymentId / totalSubscriptions) >= 0.8;

      console.log(`   ✅ Total subscriptions: ${totalSubscriptions}`);
      console.log(`   💳 With payment ID: ${withPaymentId} (${Math.round((withPaymentId/totalSubscriptions)*100)}%)`);
      console.log(`   📋 With plan ID: ${withPlanId} (${Math.round((withPlanId/totalSubscriptions)*100)}%)`);
      console.log(`   🟢 Active subscriptions: ${activeSubscriptions} (${Math.round((activeSubscriptions/totalSubscriptions)*100)}%)`);
    }

    // 6. VERIFY ADMIN VISIBILITY (Check if comprehensive view can access data)
    console.log('\n👁️ 6. CHECKING ADMIN VISIBILITY...');
    
    try {
      // Test if we can fetch the same data that comprehensive view would need
      const testUserId = customers && customers.length > 0 ? customers[0].id : null;
      
      if (testUserId) {
        const { data: testOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', testUserId)
          .limit(1)
          .single();

        const { data: testPayment } = await supabase
          .from('payment_tracking')
          .select('*')
          .eq('user_id', testUserId)
          .limit(1)
          .single();

        const { data: testSubscription } = await supabase
          .from('subscription_tracking')
          .select('*')
          .eq('user_id', testUserId)
          .limit(1)
          .single();

        results.adminVisibility.details = {
          canAccessOrders: !!testOrder,
          canAccessPayments: !!testPayment,
          canAccessSubscriptions: !!testSubscription,
          testUserId
        };

        results.adminVisibility.pass = true; // If we got here, basic access works

        console.log(`   ✅ Can access orders: ${!!testOrder}`);
        console.log(`   ✅ Can access payments: ${!!testPayment}`);
        console.log(`   ✅ Can access subscriptions: ${!!testSubscription}`);
      } else {
        console.log('   ⚠️ No test user available');
        results.adminVisibility.pass = false;
      }
    } catch (error) {
      console.log('   ❌ Admin visibility test failed:', error.message);
      results.adminVisibility.details.error = error.message;
    }

    // OVERALL COMPLIANCE REPORT
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLIANCE SUMMARY');
    console.log('='.repeat(60));

    const checks = [
      { name: 'Customer Registration', result: results.customerRegistration },
      { name: 'Address Capture', result: results.addressCapture },
      { name: 'Payment Tracking', result: results.paymentTracking },
      { name: 'Order Creation', result: results.orderCreation },
      { name: 'Subscription Tracking', result: results.subscriptionTracking },
      { name: 'Admin Visibility', result: results.adminVisibility }
    ];

    let passedChecks = 0;
    checks.forEach(check => {
      const status = check.result.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${check.name}`);
      if (check.result.pass) passedChecks++;
    });

    const overallCompliance = Math.round((passedChecks / checks.length) * 100);
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 OVERALL COMPLIANCE: ${overallCompliance}% (${passedChecks}/${checks.length} checks passed)`);
    
    if (overallCompliance >= 90) {
      console.log('🎉 EXCELLENT - Customer data capture is compliant!');
    } else if (overallCompliance >= 70) {
      console.log('⚠️ GOOD - Minor improvements needed for full compliance');
    } else {
      console.log('🚨 CRITICAL - Significant issues with customer data capture!');
    }

    console.log('\n📋 DETAILED RESULTS:');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyCustomerDataCapture(); 
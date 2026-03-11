import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

// Razorpay credentials from environment
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

// Validate environment variables
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay credentials not configured in environment variables');
}

/** Map subscription plan ID to Zoho Marketing tag for cart abandonment / lifecycle journeys */
function planIdToZohoTag(planId: string): 'Trial' | 'Silver plan' | 'Gold plan' {
  const id = (planId || '').toLowerCase();
  if (id.includes('gold') || id === 'family' || id === 'gold-pack' || id === 'gold-pack-pro') return 'Gold plan';
  if (id.includes('silver') || id === 'premium' || id === 'quarterly' || id === '6_month' || id === 'silver-pack') return 'Silver plan';
  return 'Trial'; // Discovery Delight, basic, monthly, trial, ride_on, etc.
}

// Freshworks/WhatsApp integration removed – not in use. Order completion flow uses Supabase only (rental_orders, subscription_tracking, Zoho sync).
// Edge function uses service_role; RLS is bypassed for server-side order creation.

serve(async (req) => {
  console.log('🔄 Payment verification request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing required fields:', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
      throw new Error('Missing required fields: order_id, payment_id, and signature are required');
    }

    console.log('📦 Verifying payment:', { razorpay_order_id, razorpay_payment_id });

    // Verify payment signature using hardcoded key secret
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      console.error('❌ Invalid payment signature');
      throw new Error('Invalid payment signature');
    }

    console.log('✅ Payment signature verified');

    // Find order in payment_orders first (primary table), then fallback to payment_tracking
    let order = null;
    let orderSource = 'payment_orders';

    const { data: paymentOrder, error: paymentOrderError } = await supabaseClient
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (paymentOrder && !paymentOrderError) {
      order = paymentOrder;
      console.log('✅ Order found in payment_orders table');
    } else {
      console.log('⚠️ Order not found in payment_orders, checking payment_tracking...');
      
      const { data: trackingOrder, error: trackingError } = await supabaseClient
        .from('payment_tracking')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

      if (trackingOrder && !trackingError) {
        order = trackingOrder;
        orderSource = 'payment_tracking';
        console.log('✅ Order found in payment_tracking table');
      } else {
        console.error('❌ Order not found in either table:', { paymentOrderError, trackingError });
        throw new Error('Order not found in database. Please contact support.');
      }
    }

    if (!order || !order.user_id) {
      console.error('❌ Order missing or invalid user_id:', order);
      throw new Error('Invalid order - missing user information');
    }

    console.log('📦 Found order for user:', order.user_id);
    const userId = order.user_id;
    const orderItems = order.order_items || {};

    // Fetch user profile once for address fallback (critical for new customers)
    let userProfile: any = null;
    try {
      const { data: profileData } = await supabaseClient
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();
      userProfile = profileData || null;
    } catch (_) {
      // Non-blocking; address fallback will use order_items only
    }

    // Update payment status in the appropriate table
    if (orderSource === 'payment_orders') {
      const { error: updateOrderError } = await supabaseClient
        .from('payment_orders')
        .update({
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', razorpay_order_id);

      if (updateOrderError) {
        console.error('⚠️ Failed to update payment_orders status:', updateOrderError);
      } else {
        console.log('✅ Payment orders status updated with payment ID');
      }
    } else {
      const { error: updateTrackingError } = await supabaseClient
        .from('payment_tracking')
        .update({
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', razorpay_order_id);

      if (updateTrackingError) {
        console.error('⚠️ Failed to update payment_tracking status:', updateTrackingError);
      } else {
        console.log('✅ Payment tracking status updated with payment ID');
      }
    }

    // Calculate dates (used for both rental_orders and subscription tracking)
    const startDate = new Date();
    const endDate = new Date();
    const subscriptionMonths = orderItems.planId === 'quarterly' ? 3 : 
                              orderItems.planId === '6_month' ? 6 : 1;
    endDate.setMonth(endDate.getMonth() + subscriptionMonths);

    // ✅ CRITICAL: Always create rental_orders for admin panel visibility (subscription AND ride_on / new customers)
    const allowedOrderTypes = ['subscription', 'one_time', 'trial', 'ride_on'];
    const rentalOrderTypeForDb = allowedOrderTypes.includes(order.order_type) ? order.order_type : 
      (orderItems.rideOnToyId ? 'ride_on' : 'subscription');
    try {
      console.log('📦 Creating rental order record for admin panel (order_type:', order.order_type, '-> db:', rentalOrderTypeForDb, ')');
      
      const shippingAddress = orderItems.shippingAddress || {};
      const hasShippingAddress = shippingAddress.address_line1 || shippingAddress.address1;
      let addressToUse = shippingAddress;
      if (!hasShippingAddress && userProfile) {
        console.log('🏠 Using profile address as fallback for shipping address');
        addressToUse = {
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          phone: userProfile.phone || '',
          email: userProfile.email || '',
          address_line1: userProfile.address_line1 || '',
          address_line2: userProfile.address_line2 || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          postcode: userProfile.zip_code || '',
          country: 'India'
        };
      }
      const standardizedAddress = {
        first_name: addressToUse.first_name || addressToUse.firstName || userProfile?.first_name || '',
        last_name: addressToUse.last_name || addressToUse.lastName || userProfile?.last_name || '',
        phone: addressToUse.phone || userProfile?.phone || '',
        email: addressToUse.email || userProfile?.email || '',
        address_line1: addressToUse.address_line1 || addressToUse.address1 || '',
        address_line2: addressToUse.address_line2 || addressToUse.address2 || addressToUse.apartment || '',
        city: addressToUse.city || '',
        state: addressToUse.state || '',
        postcode: addressToUse.postcode || addressToUse.zip_code || '',
        country: addressToUse.country || 'India',
        latitude: addressToUse.latitude,
        longitude: addressToUse.longitude,
        plus_code: addressToUse.plus_code,
        delivery_instructions: orderItems.deliveryInstructions || null
      };
      const totalAmountRupees = orderItems.totalAmount ?? order.total_amount ?? (typeof order.amount === 'number' && order.amount > 1000 ? order.amount / 100 : order.amount) ?? 0;
      const toysData = orderItems.rideOnToyId ?
        [{ toy_id: orderItems.rideOnToyId, name: 'Ride-on Toy', category: 'ride_on', quantity: 1, unit_price: totalAmountRupees, total_price: totalAmountRupees, returned: false }] :
        (orderItems.selectedToys || []).map((toy: any) => ({
          toy_id: toy.id, name: toy.name, category: toy.category, image_url: toy.image_url, quantity: 1,
          unit_price: toy.rental_price || 0, total_price: toy.rental_price || 0, returned: false
        }));
      const rentalOrderPayload = {
        user_id: userId,
        status: 'pending',
        order_type: rentalOrderTypeForDb,
        subscription_plan: orderItems.planId || 'basic',
        total_amount: totalAmountRupees,
        base_amount: orderItems.baseAmount ?? order.base_amount ?? 0,
        gst_amount: orderItems.gstAmount ?? order.gst_amount ?? 0,
        discount_amount: order.discount_amount || 0,
        coupon_code: orderItems.appliedCoupon || order.coupon_code || null,
        payment_status: 'paid',
        payment_method: 'razorpay',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        payment_amount: totalAmountRupees,
        payment_currency: order.currency || 'INR',
        cycle_number: 1,
        rental_start_date: startDate.toISOString().split('T')[0],
        rental_end_date: endDate.toISOString().split('T')[0],
        toys_data: toysData,
        toys_delivered_count: toysData.length,
        toys_returned_count: 0,
        shipping_address: standardizedAddress,
        age_group: orderItems.ageGroup || '3-5',
        subscription_category: orderItems.planId || 'basic',
        delivery_instructions: orderItems.deliveryInstructions || null,
        user_phone: orderItems.userPhone || orderItems.phone || userProfile?.phone || (order as any).user_phone || null,
        confirmed_at: null,
        shipped_at: null,
        delivered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { data: rentalOrder, error: rentalError } = await supabaseClient
        .from('rental_orders')
        .insert(rentalOrderPayload)
        .select()
        .single();
      if (rentalError) {
        console.error('❌ CRITICAL: Rental order creation failed:', rentalError.message, rentalError.details);
        throw new Error(`CRITICAL: Failed to create rental order: ${rentalError.message}. Payment: ${razorpay_payment_id}, User: ${userId}`);
      }
      if (!rentalOrder?.id) {
        throw new Error(`CRITICAL: Rental order creation returned no data. Payment: ${razorpay_payment_id}, User: ${userId}`);
      }
      console.log('✅ Rental order created for admin panel:', rentalOrder.id, rentalOrder.order_number);
    } catch (orderCreationError: any) {
      console.error('❌ CRITICAL: Rental order creation failed:', orderCreationError?.message);
      throw new Error(`CRITICAL FAILURE: Rental order creation failed - ${orderCreationError?.message}. Payment verification ABORTED.`);
    }

    // Create subscription tracking for subscription AND ride_on orders (rental_orders already created above)
    if (order.order_type === 'subscription' || order.order_type === 'ride_on') {
      console.log('🔄 Creating subscription tracking entry');
      try {
        // Create subscription in NEW tracking table
        const { data: subscriptionTracking, error: trackingError } = await supabaseClient
          .from('subscription_tracking')
          .insert({
            user_id: userId,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            plan_id: orderItems.planId || 'basic',
            subscription_type: orderItems.rideOnToyId ? 'ride_on' : 'monthly',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            current_period_start: startDate.toISOString().split('T')[0],
            current_period_end: endDate.toISOString().split('T')[0],
            selected_toys: orderItems.selectedToys || [],
            age_group: orderItems.ageGroup || '3-5',
            ride_on_toy_id: orderItems.rideOnToyId || null,
            payment_amount: totalAmountRupees,
            payment_currency: order.currency || 'INR',
            order_items: orderItems,
            shipping_address: orderItems.shippingAddress || {},
            delivery_instructions: orderItems.deliveryInstructions || null,
            status: 'active'
          })
          .select()
          .single();

        if (trackingError) {
          console.error('❌ Error creating subscription tracking:', trackingError);
          throw new Error('Failed to create subscription tracking');
        }

        console.log('✅ Subscription tracking created:', subscriptionTracking.id);

        // Create entitlements in NEW tracking table
        const { error: entitlementsError } = await supabaseClient
          .from('entitlements_tracking')
          .insert({
            user_id: userId,
            subscription_tracking_id: subscriptionTracking.id,
            toys_in_possession: false,
            current_cycle_toys: orderItems.selectedToys || [],
            selection_window_active: false,
            next_billing_date: endDate.toISOString()
          });

        if (entitlementsError) {
          console.error('❌ Error creating entitlements tracking:', entitlementsError);
          // Don't throw - subscription was created successfully
        } else {
          console.log('✅ Entitlements tracking created');
        }

        // ✅ CRITICAL FIX: Update user's subscription_active flag in custom_users table
        try {
          // Map planId to subscription_plan enum for consistency
          const planMapping = {
            'basic': 'basic',
            'monthly': 'basic',
            'quarterly': 'premium', 
            '6_month': 'premium',
            'premium': 'premium',
            'family': 'family'
          };
          
          const mappedPlan = planMapping[orderItems.planId] || 'basic';
          
          const { error: userUpdateError } = await supabaseClient
            .from('custom_users')
            .update({
              subscription_active: true,
              subscription_plan: mappedPlan,
              subscription_end_date: endDate.toISOString(),
            })
            .eq('id', userId);

          if (userUpdateError) {
            console.error('❌ Error updating user subscription status:', userUpdateError);
            // This is critical - throw error if user profile update fails
            throw new Error('Failed to update user subscription status');
          } else {
            console.log('✅ User subscription status updated - subscription_active=true');
          }

          // Sync to Zoho Marketing/CRM with plan tag (Trial / Silver plan / Gold plan) for cart abandonment journey
          const planId = orderItems?.planId || 'basic';
          const zohoTag = planIdToZohoTag(planId);
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
          if (supabaseUrl && serviceKey && userId) {
            fetch(`${supabaseUrl}/functions/v1/zoho-sync-contact`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ userId, tag: zohoTag }),
            }).catch((err) => console.warn('Zoho sync (subscription) failed:', err?.message));
          }
        } catch (userProfileError) {
          console.error('❌ Critical error updating user profile:', userProfileError);
          throw userProfileError;
        }

        // Also update legacy subscribers table for backward compatibility
        try {
          const { error: subUpdateError } = await supabaseClient
            .from('subscribers')
            .upsert({
              user_id: userId,
              email: orderItems.userEmail || '',
              subscribed: true,
              subscription_tier: orderItems.planId || 'basic',
              subscription_end: endDate.toISOString(),
              payment_status: 'completed',
              last_payment_date: new Date().toISOString(),
              razorpay_customer_id: razorpay_payment_id,
            }, {
              onConflict: 'user_id'
            });

          if (subUpdateError) {
            console.error('⚠️ Error updating subscribers table:', subUpdateError);
          } else {
            console.log('✅ Subscribers table updated for backward compatibility');
          }
        } catch (legacyError) {
          console.log('⚠️ Legacy subscribers table update failed (non-critical):', legacyError);
        }

      } catch (subscriptionError) {
        console.error('❌ Subscription creation failed:', subscriptionError);
        throw new Error('Failed to create subscription after payment verification');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription created successfully',
        razorpay_payment_id: razorpay_payment_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    const errMsg = error?.message || 'Unknown verification error';
    console.error('❌ Error verifying payment:', errMsg, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errMsg,
        code: error?.code || 'VERIFICATION_FAILED',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

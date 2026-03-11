import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay credentials not configured in environment variables');
}

function planIdToZohoTag(planId: string): 'Trial' | 'Silver plan' | 'Gold plan' {
  const id = (planId || '').toLowerCase();
  if (id.includes('gold') || id === 'family' || id === 'gold-pack' || id === 'gold-pack-pro') return 'Gold plan';
  if (id.includes('silver') || id === 'premium' || id === 'quarterly' || id === '6_month' || id === 'silver-pack') return 'Silver plan';
  return 'Trial';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing required fields');
      throw new Error('Missing required fields: order_id, payment_id, and signature are required');
    }

    console.log('📦 Verifying payment:', { razorpay_order_id, razorpay_payment_id });

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Invalid payment signature');
      throw new Error('Invalid payment signature');
    }

    console.log('✅ Payment signature verified');

    let order: any = null;
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
        console.error('❌ Order not found in either table');
        throw new Error('Order not found in database. Please contact support.');
      }
    }

    if (!order || !order.user_id) {
      throw new Error('Invalid order - missing user information');
    }

    const userId = order.user_id;
    const orderItems = order.order_items || {};

    let userProfile: any = null;
    try {
      const { data: profileData } = await supabaseClient
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();
      userProfile = profileData || null;
    } catch (_) {}

    if (orderSource === 'payment_orders') {
      await supabaseClient.from('payment_orders').update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('razorpay_order_id', razorpay_order_id);
    } else {
      await supabaseClient.from('payment_tracking').update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('razorpay_order_id', razorpay_order_id);
    }

    const startDate = new Date();
    const endDate = new Date();
    const subscriptionMonths = orderItems.planId === 'quarterly' ? 3 : orderItems.planId === '6_month' ? 6 : 1;
    endDate.setMonth(endDate.getMonth() + subscriptionMonths);

    const allowedOrderTypes = ['subscription', 'one_time', 'trial', 'ride_on'];
    const rentalOrderTypeForDb = allowedOrderTypes.includes(order.order_type) ? order.order_type : 
      (orderItems.rideOnToyId ? 'ride_on' : 'subscription');

    const shippingAddress = orderItems.shippingAddress || {};
    const hasShippingAddress = shippingAddress.address_line1 || shippingAddress.address1;
    let addressToUse = shippingAddress;
    if (!hasShippingAddress && userProfile) {
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

    const totalAmountRupees = orderItems.totalAmount ?? order.total_amount ?? order.amount ?? 
      (typeof (order.base_amount + order.gst_amount) === 'number' ? order.base_amount + order.gst_amount : 0) ?? 0;

    const toysData = orderItems.rideOnToyId ?
      [{ toy_id: orderItems.rideOnToyId, name: 'Ride-on Toy', category: 'ride_on', quantity: 1, unit_price: totalAmountRupees, total_price: totalAmountRupees, returned: false }] :
      (orderItems.selectedToys || []).map((toy: any) => ({
        toy_id: toy.id, name: toy.name, category: toy.category, image_url: toy.image_url, quantity: 1,
        unit_price: toy.rental_price || 0, total_price: toy.rental_price || 0, returned: false
      }));

    const { data: rentalOrder, error: rentalError } = await supabaseClient
      .from('rental_orders')
      .insert({
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
      })
      .select()
      .single();

    if (rentalError) {
      console.error('❌ CRITICAL: Rental order creation failed:', rentalError.message);
      throw new Error(`CRITICAL: Failed to create rental order: ${rentalError.message}`);
    }
    console.log('✅ Rental order created for admin panel:', rentalOrder?.id, rentalOrder?.order_number);

    if (order.order_type === 'subscription' || order.order_type === 'ride_on') {
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

      await supabaseClient.from('entitlements_tracking').insert({
        user_id: userId,
        subscription_tracking_id: subscriptionTracking.id,
        toys_in_possession: false,
        current_cycle_toys: orderItems.selectedToys || [],
        selection_window_active: false,
        next_billing_date: endDate.toISOString()
      });

      const planMapping: Record<string, string> = { basic: 'basic', monthly: 'basic', quarterly: 'premium', '6_month': 'premium', premium: 'premium', family: 'family' };
      await supabaseClient.from('custom_users').update({
        subscription_active: true,
        subscription_plan: planMapping[orderItems.planId] || 'basic',
        subscription_end_date: endDate.toISOString(),
      }).eq('id', userId);

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (supabaseUrl && serviceKey && userId) {
        fetch(`${supabaseUrl}/functions/v1/zoho-sync-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ userId, tag: planIdToZohoTag(orderItems?.planId || 'basic') }),
        }).catch((err) => console.warn('Zoho sync failed:', err?.message));
      }

      await supabaseClient.from('subscribers').upsert({
        user_id: userId,
        email: orderItems.userEmail || '',
        subscribed: true,
        subscription_tier: orderItems.planId || 'basic',
        subscription_end: endDate.toISOString(),
        payment_status: 'completed',
        last_payment_date: new Date().toISOString(),
        razorpay_customer_id: razorpay_payment_id,
      }, { onConflict: 'user_id' });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and subscription created successfully', razorpay_payment_id: razorpay_payment_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error verifying payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Verification failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

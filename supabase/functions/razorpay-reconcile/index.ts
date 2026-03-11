/**
 * Reconcile order when razorpay-verify failed (e.g. network) but payment succeeded.
 * Called from OrderSummary when user has payment_id/order_id but no rental_order found.
 * Verifies payment via Razorpay API, then creates/updates rental_order.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, userId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing razorpay_order_id, razorpay_payment_id, or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Reconcile request:', { razorpay_order_id, razorpay_payment_id, userId });

    // Find order in payment_orders or payment_tracking
    let order: any = null;
    const { data: paymentOrder } = await supabaseClient
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (paymentOrder) {
      order = paymentOrder;
    } else {
      const { data: trackingOrder } = await supabaseClient
        .from('payment_tracking')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();
      order = trackingOrder;
    }

    if (!order || order.user_id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found or user mismatch' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment via Razorpay API
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const paymentData = await paymentRes.json();

    if (!paymentRes.ok || paymentData.status !== 'captured') {
      console.error('❌ Payment not captured:', paymentData);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not captured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderItems = order.order_items || {};
    const userIdVal = order.user_id;

    // Check for existing rental_order
    const { data: existingRental } = await supabaseClient
      .from('rental_orders')
      .select('id, order_number')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    const { data: profileData } = await supabaseClient.from('custom_users').select('*').eq('id', userIdVal).maybeSingle();
    const userProfile = profileData || null;

    const shippingAddress = orderItems.shippingAddress || {};
    const hasAddr = shippingAddress?.address_line1 || shippingAddress?.address1;
    const addressToUse = hasAddr ? shippingAddress : (userProfile ? {
      first_name: userProfile.first_name || '', last_name: userProfile.last_name || '', phone: userProfile.phone || '',
      email: userProfile.email || '', address_line1: userProfile.address_line1 || '', address_line2: userProfile.address_line2 || '',
      city: userProfile.city || '', state: userProfile.state || '', postcode: userProfile.zip_code || '', country: 'India'
    } : {});
    const standardizedAddress = {
      first_name: addressToUse.first_name || addressToUse.firstName || userProfile?.first_name || '',
      last_name: addressToUse.last_name || addressToUse.lastName || userProfile?.last_name || '',
      phone: addressToUse.phone || userProfile?.phone || '',
      email: addressToUse.email || userProfile?.email || '',
      address_line1: addressToUse.address_line1 || addressToUse.address1 || '',
      address_line2: addressToUse.address_line2 || addressToUse.address2 || addressToUse.apartment || '',
      city: addressToUse.city || '', state: addressToUse.state || '',
      postcode: addressToUse.postcode || addressToUse.zip_code || '',
      country: addressToUse.country || 'India',
      delivery_instructions: orderItems.deliveryInstructions || null
    };

    const totalAmountRupees = orderItems.totalAmount ?? order.total_amount ?? (typeof order.amount === 'number' && order.amount > 1000 ? order.amount / 100 : order.amount) ?? 0;
    const toysData = orderItems.rideOnToyId ?
      [{ toy_id: orderItems.rideOnToyId, name: 'Ride-on Toy', category: 'ride_on', quantity: 1, unit_price: totalAmountRupees, total_price: totalAmountRupees, returned: false }] :
      (orderItems.selectedToys || []).map((toy: any) => ({
        toy_id: toy.id, name: toy.name, category: toy.category, image_url: toy.image_url, quantity: 1,
        unit_price: toy.rental_price || 0, total_price: toy.rental_price || 0, returned: false
      }));

    const rentalType = ['subscription', 'one_time', 'trial', 'ride_on'].includes(order.order_type) ? order.order_type : (orderItems.rideOnToyId ? 'ride_on' : 'subscription');
    const startDate = new Date();
    const endDate = new Date();
    const subMonths = orderItems.planId === 'quarterly' ? 3 : orderItems.planId === '6_month' ? 6 : 1;
    endDate.setMonth(endDate.getMonth() + subMonths);

    if (existingRental?.id) {
      const { error: updateErr } = await supabaseClient
        .from('rental_orders')
        .update({
          payment_status: 'paid',
          razorpay_payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRental.id);
      if (updateErr) {
        console.error('❌ Reconcile update failed:', updateErr);
        throw new Error(updateErr.message);
      }
      console.log('✅ Reconcile: Updated pending order to paid:', existingRental.order_number);
    } else {
      const { data: rentalOrder, error: rentalErr } = await supabaseClient.from('rental_orders').insert({
        user_id: userIdVal,
        status: 'pending',
        order_type: rentalType,
        subscription_plan: orderItems.planId || 'basic',
        total_amount: totalAmountRupees,
        base_amount: orderItems.baseAmount ?? order.base_amount ?? 0,
        gst_amount: orderItems.gstAmount ?? order.gst_amount ?? 0,
        discount_amount: 0,
        coupon_code: orderItems.appliedCoupon || null,
        payment_status: 'paid',
        payment_method: 'razorpay',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
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
        user_phone: orderItems.userPhone || orderItems.phone || userProfile?.phone || null,
      }).select().single();

      if (rentalErr) {
        console.error('❌ Reconcile insert failed:', rentalErr);
        throw new Error(rentalErr.message);
      }
      console.log('✅ Reconcile: Created rental order:', rentalOrder?.order_number);
    }

    // Create subscription tracking for subscription/ride_on orders (idempotent - check if exists)
    if (order.order_type === 'subscription' || order.order_type === 'ride_on') {
      const { data: existingTracking } = await supabaseClient
        .from('subscription_tracking')
        .select('id')
        .eq('razorpay_order_id', razorpay_order_id)
        .maybeSingle();
      if (!existingTracking) {
        const { data: subscriptionTracking, error: trackingErr } = await supabaseClient.from('subscription_tracking').insert({
          user_id: userIdVal,
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
        }).select().single();
        if (!trackingErr && subscriptionTracking?.id) {
          await supabaseClient.from('entitlements_tracking').insert({
            user_id: userIdVal,
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
          }).eq('id', userIdVal);
          console.log('✅ Reconcile: Subscription tracking created');
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Order reconciled' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ Reconcile error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Reconcile failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  console.log('🔄 Razorpay order creation request received');

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
    const body = await req.json();
    const { amount, currency = 'INR', orderType, orderItems = {}, userId, userEmail, userPhone } = body;
    const effectiveEmail = userEmail || orderItems?.userEmail;
    const effectivePhone = userPhone || orderItems?.userPhone;

    if (!amount || !orderType || !userId) {
      console.error('❌ Missing required fields:', { amount, orderType, userId });
      throw new Error('Missing required fields: amount, orderType, and userId are required');
    }

    console.log('📦 Request data:', { amount, currency, orderType, userId });

    // Extract GST information from orderItems if available
    // amount is in paise from frontend; totalAmount for DB should be in rupees
    const amountRupees = typeof amount === 'number' && amount >= 100 ? amount / 100 : amount;
    const baseAmount = orderItems?.baseAmount ?? amountRupees;
    const gstAmount = orderItems?.gstAmount ?? 0;
    const totalAmount = orderItems?.totalAmount ?? amountRupees;

    console.log('💰 Payment breakdown:', { baseAmount, gstAmount, totalAmount });

    // Create Razorpay order first
    const razorpayOrderData = {
      amount: Math.round(amount), // Amount is already in paise from frontend
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        order_type: orderType,
        user_id: userId,
      },
    };

    console.log('🔄 Creating Razorpay order:', razorpayOrderData);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(razorpayOrderData),
    });

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('❌ Razorpay error:', razorpayOrder);
      throw new Error(razorpayOrder.error?.description || 'Failed to create Razorpay order');
    }

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    // Ensure user exists in custom_users (required for payment_orders FK)
    const phoneValue = effectivePhone || `pay_${userId.replace(/-/g, '')}`;
    try {
      const { error: upsertError } = await supabaseClient
        .from('custom_users')
        .upsert({
          id: userId,
          email: effectiveEmail || null,
          phone: phoneValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: true  // Don't overwrite existing user data
        });
      if (upsertError) {
        console.error('⚠️ User upsert failed:', upsertError.message);
        throw new Error(`User setup failed. Please complete your profile before payment.`);
      }
      console.log('✅ User ensured in custom_users');
    } catch (userError: any) {
      console.error('❌ User setup failed:', userError?.message);
      throw userError;
    }

    // Store payment order data so razorpay-verify can find it (payment_orders first, then payment_tracking)
    let orderStored = false;
    try {
      const { data: paymentRecord, error: paymentError } = await supabaseClient
        .from('payment_orders')
        .insert({
          razorpay_order_id: razorpayOrder.id,
          user_id: userId,
          amount: totalAmount,
          currency: currency,
          status: 'created',
          order_type: orderType,
          order_items: orderItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        console.error('⚠️ Payment orders insert failed:', paymentError.message, paymentError.code);
        try {
          const { data: backupRecord, error: backupError } = await supabaseClient
            .from('payment_tracking')
            .insert({
              razorpay_order_id: razorpayOrder.id,
              user_id: userId,
              base_amount: baseAmount,
              gst_amount: gstAmount,
              total_amount: totalAmount,
              currency: currency,
              status: 'created',
              order_type: orderType,
              order_items: orderItems,
              user_email: effectiveEmail,
              user_phone: effectivePhone,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          if (backupError) {
            console.error('❌ Backup payment_tracking also failed:', backupError.message);
          } else {
            orderStored = true;
            console.log('✅ Payment stored in payment_tracking:', backupRecord?.id);
          }
        } catch (backupException: any) {
          console.error('❌ Backup payment_tracking exception:', backupException?.message);
        }
      } else {
        orderStored = true;
        console.log('✅ Payment order record created:', paymentRecord?.id);
      }
    } catch (orderError: any) {
      console.error('❌ Payment order storage exception:', orderError?.message);
    }

    if (!orderStored) {
      console.error('❌ Order not stored in payment_orders or payment_tracking – verification would fail after payment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unable to save order. Please try again or contact support.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Create rental_orders with payment_status=pending (reserves inventory; verify will update to paid)
    try {
      const { data: profileData } = await supabaseClient.from('custom_users').select('*').eq('id', userId).maybeSingle();
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
      const startDate = new Date();
      const endDate = new Date();
      const subMonths = orderItems.planId === 'quarterly' ? 3 : orderItems.planId === '6_month' ? 6 : 1;
      endDate.setMonth(endDate.getMonth() + subMonths);
      const toysData = orderItems.rideOnToyId ?
        [{ toy_id: orderItems.rideOnToyId, name: 'Ride-on Toy', category: 'ride_on', quantity: 1, unit_price: totalAmount, total_price: totalAmount, returned: false }] :
        (orderItems.selectedToys || []).map((toy: any) => ({
          toy_id: toy.id, name: toy.name, category: toy.category, image_url: toy.image_url, quantity: 1,
          unit_price: toy.rental_price || 0, total_price: toy.rental_price || 0, returned: false
        }));
      const rentalType = ['subscription', 'one_time', 'trial', 'ride_on'].includes(orderType) ? orderType : (orderItems.rideOnToyId ? 'ride_on' : 'subscription');
      const { error: rentalErr } = await supabaseClient.from('rental_orders').insert({
        user_id: userId,
        status: 'pending',
        order_type: rentalType,
        subscription_plan: orderItems.planId || 'basic',
        total_amount: totalAmount,
        base_amount: baseAmount,
        gst_amount: gstAmount,
        discount_amount: 0,
        coupon_code: orderItems.appliedCoupon || null,
        payment_status: 'pending',
        payment_method: 'razorpay',
        razorpay_order_id: razorpayOrder.id,
        razorpay_payment_id: null,
        razorpay_signature: null,
        payment_amount: totalAmount,
        payment_currency: currency,
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
        user_phone: effectivePhone || orderItems.userPhone || userProfile?.phone || null,
      });
      if (rentalErr) {
        console.error('⚠️ Pending rental_order creation failed (verify will create):', rentalErr.message);
      } else {
        console.log('✅ Pending rental_order created (inventory reserved); verify will update to paid');
      }
    } catch (rentalEx: any) {
      console.warn('⚠️ Pending rental_order creation exception:', rentalEx?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: RAZORPAY_KEY_ID,
        message: 'Order created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { amount, currency = 'INR', orderType, orderItems = {}, userId, userEmail, userPhone } = body;

    if (!amount || !orderType || !userId) {
      console.error('❌ Missing required fields:', { amount, orderType, userId });
      throw new Error('Missing required fields: amount, orderType, and userId are required');
    }

    // Amount: frontend sends paise; DB stores rupees
    const amountRupees = typeof amount === 'number' && amount >= 100 ? amount / 100 : amount;
    const baseAmount = orderItems?.baseAmount ?? amountRupees;
    const gstAmount = orderItems?.gstAmount ?? 0;
    const totalAmount = orderItems?.totalAmount ?? amountRupees;

    console.log('📦 Request data:', { amount, currency, orderType, userId });

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency: currency,
        receipt: `receipt_${Date.now()}`,
        notes: { order_type: orderType, user_id: userId },
      }),
    });

    const razorpayOrder = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      console.error('❌ Razorpay error:', razorpayOrder);
      throw new Error(razorpayOrder.error?.description || 'Failed to create Razorpay order');
    }

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    const phoneValue = userPhone || orderItems?.userPhone || `temp_${userId.slice(0, 8)}`;
    try {
      await supabaseClient.from('custom_users').upsert({
        id: userId,
        email: userEmail || orderItems?.userEmail || null,
        phone: phoneValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      console.log('✅ User created/updated in custom_users');
    } catch (userError) {
      console.log('⚠️ User creation failed, continuing:', userError);
    }

    let orderStored = false;
    try {
      const { error: paymentError } = await supabaseClient.from('payment_orders').insert({
        razorpay_order_id: razorpayOrder.id,
        user_id: userId,
        amount: totalAmount,
        currency: currency,
        status: 'created',
        order_type: orderType,
        order_items: orderItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();

      if (paymentError) {
        console.error('⚠️ Payment orders insert failed:', paymentError.message);
        const { error: backupError } = await supabaseClient.from('payment_tracking').insert({
          razorpay_order_id: razorpayOrder.id,
          user_id: userId,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          currency: currency,
          status: 'created',
          order_type: orderType,
          order_items: orderItems,
          user_email: userEmail || orderItems?.userEmail,
          user_phone: userPhone || orderItems?.userPhone,
          created_at: new Date().toISOString()
        }).select().single();
        if (!backupError) {
          orderStored = true;
          console.log('✅ Payment stored in payment_tracking');
        }
      } else {
        orderStored = true;
        console.log('✅ Payment order record created');
      }
    } catch (orderError: any) {
      console.error('❌ Payment order storage exception:', orderError?.message);
    }

    if (!orderStored) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to save order. Please try again or contact support.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

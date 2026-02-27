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
    const { amount, currency = 'INR', orderType, orderItems, userId, userEmail, userPhone } = await req.json();

    if (!amount || !orderType || !userId) {
      console.error('❌ Missing required fields:', { amount, orderType, userId });
      throw new Error('Missing required fields: amount, orderType, and userId are required');
    }

    console.log('📦 Request data:', { amount, currency, orderType, userId });

    // Extract GST information from orderItems if available
    const baseAmount = orderItems?.baseAmount || amount;
    const gstAmount = orderItems?.gstAmount || 0;
    const totalAmount = orderItems?.totalAmount || amount;

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

    // Try to create the user in custom_users (ignore if it fails)
    const phoneValue = userPhone || `temp_${userId.slice(0, 8)}`;
    
    try {
      await supabaseClient
        .from('custom_users')
        .upsert({
          id: userId,
          email: userEmail || null,
          phone: phoneValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      console.log('✅ User created/updated in custom_users');
    } catch (userError) {
      console.log('⚠️ User creation failed, continuing with order:', userError);
    }

    // Store payment order data in payment_orders table (for admin panel visibility)
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
        console.log('⚠️ Payment orders insert failed:', paymentError);
        
        // Try backup storage in payment_tracking table if it exists
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
              user_email: userEmail,
              user_phone: userPhone,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (backupError) {
            console.log('⚠️ Backup payment tracking also failed:', backupError);
          } else {
            console.log('✅ Payment stored in backup tracking table:', backupRecord.id);
          }
        } catch (backupException) {
          console.log('⚠️ Backup tracking exception:', backupException);
        }
      } else {
        console.log('✅ Payment order record created:', paymentRecord.id);
      }
    } catch (orderError) {
      console.log('⚠️ Payment order exception:', orderError);
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

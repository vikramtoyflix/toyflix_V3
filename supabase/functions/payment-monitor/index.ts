import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔍 Payment Monitor: Checking payment-order consistency');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Payment ID required');
    }

    console.log('🔍 Monitoring payment:', payment_id);

    // Wait 10 seconds for order creation to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check if rental order exists
    const { data: rentalOrder, error: orderError } = await supabaseClient
      .from('rental_orders')
      .select('id, order_number, status')
      .eq('razorpay_payment_id', payment_id)
      .single();

    if (orderError || !rentalOrder) {
      // CRITICAL: Order missing after payment!
      console.error('🚨 CRITICAL: Payment without order detected:', payment_id);
      
      // Try to recover immediately
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payment_tracking')
        .select('*')
        .eq('razorpay_payment_id', payment_id)
        .single();

      if (payment && !paymentError) {
        console.log('🔧 Attempting immediate recovery...');
        
        const orderItems = payment.order_items || {};
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const rentalOrderData = {
          user_id: payment.user_id,
          status: 'pending',
          order_type: payment.order_type || 'subscription',
          subscription_plan: orderItems.planId || 'basic',
          total_amount: payment.total_amount || 0,
          payment_status: 'paid',
          payment_method: 'razorpay',
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: 'monitor-recovered',
          payment_amount: payment.total_amount || 0,
          payment_currency: payment.currency || 'INR',
          cycle_number: 1,
          rental_start_date: startDate.toISOString().split('T')[0],
          rental_end_date: endDate.toISOString().split('T')[0],
          toys_data: (orderItems.selectedToys || []).map((toy: any) => ({
            toy_id: toy.id,
            name: toy.name,
            category: toy.category,
            image_url: toy.image_url,
            quantity: 1,
            unit_price: toy.rental_price || 0,
            total_price: toy.rental_price || 0,
            returned: false
          })),
          toys_delivered_count: (orderItems.selectedToys || []).length,
          toys_returned_count: 0,
          shipping_address: orderItems.shippingAddress || {},
          age_group: orderItems.ageGroup || '3-5',
          created_at: payment.created_at,
          updated_at: new Date().toISOString()
        };

        const { data: recoveredOrder, error: recoveryError } = await supabaseClient
          .from('rental_orders')
          .insert(rentalOrderData)
          .select()
          .single();

        if (recoveryError) {
          console.error('❌ CRITICAL: Recovery failed:', recoveryError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'CRITICAL: Payment successful but order creation failed and recovery failed',
              payment_id: payment_id 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        console.log('✅ Order recovered by monitor:', recoveredOrder.order_number);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          recovered: true, 
          message: 'Order was missing but has been recovered',
          payment_id: payment_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('✅ Order exists:', rentalOrder.order_number);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_exists: true, 
        order_number: rentalOrder.order_number,
        payment_id: payment_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Payment monitor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 
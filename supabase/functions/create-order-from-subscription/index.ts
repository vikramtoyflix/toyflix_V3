import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔄 Create order from subscription request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('📦 Creating order for user:', userId);

    // Find the most recent subscription for this user
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscription_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.error('❌ No active subscription found:', subError);
      throw new Error('No active subscription found for this user');
    }

    console.log('✅ Found subscription:', subscription.id);

    // Check if order already exists for this subscription
    const { data: existingOrder, error: existingOrderError } = await supabaseClient
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', subscription.created_at)
      .limit(1)
      .single();

    if (existingOrder) {
      console.log('✅ Order already exists:', existingOrder.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order already exists',
          orderId: existingOrder.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create order from subscription data
    const { data: orderRecord, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total_amount: subscription.payment_amount || 0,
        order_type: 'subscription',
        base_amount: Math.round((subscription.payment_amount || 0) / 1.18), // Remove GST
        gst_amount: Math.round((subscription.payment_amount || 0) * 0.18 / 1.18), // 18% GST
        discount_amount: 0,
        created_at: subscription.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      throw new Error('Failed to create order record');
    }

    console.log('✅ Order created:', orderRecord.id);

    // Create order items from subscription data
    if (subscription.selected_toys && subscription.selected_toys.length > 0) {
      console.log('📦 Creating order items for selected toys...');
      
      const orderItemsData = subscription.selected_toys.map((toy: any) => ({
        order_id: orderRecord.id,
        toy_id: toy.id || toy,
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        subscription_category: subscription.plan_id,
        age_group: subscription.age_group,
        created_at: subscription.created_at
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('⚠️ Error creating order items:', itemsError);
      } else {
        console.log('✅ Order items created:', orderItemsData.length);
      }
    }

    // Handle ride-on toy if present
    if (subscription.ride_on_toy_id) {
      console.log('🏍️ Adding ride-on toy to order items...');
      
      const { error: rideOnError } = await supabaseClient
        .from('order_items')
        .insert({
          order_id: orderRecord.id,
          toy_id: subscription.ride_on_toy_id,
          quantity: 1,
          unit_price: subscription.payment_amount || 0,
          total_price: subscription.payment_amount || 0,
          subscription_category: 'ride_on',
          age_group: subscription.age_group,
          ride_on_toy_id: subscription.ride_on_toy_id,
          created_at: subscription.created_at
        });

      if (rideOnError) {
        console.error('⚠️ Error creating ride-on order item:', rideOnError);
      } else {
        console.log('✅ Ride-on toy order item created');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order created successfully from subscription data',
        orderId: orderRecord.id,
        subscriptionId: subscription.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error creating order from subscription:', error);
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
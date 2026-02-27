import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request body
    const { orderData, orderItems = [] } = await req.json()

    console.log('🔄 Admin creating rental order:', orderData)
    console.log('🔄 Order items:', orderItems)

    // Validate required fields
    if (!orderData.user_id) {
      return new Response(
        JSON.stringify({ 
          error: 'User ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user details for phone number
    const { data: userData, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('phone, first_name, last_name')
      .eq('id', orderData.user_id)
      .single()

    if (userError) {
      console.error('❌ Error fetching user data:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch user data' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate rental dates
    const startDate = new Date(orderData.rental_start_date || new Date())
    const endDate = new Date(orderData.rental_end_date || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)) // 30 days later

    // 🔍 CRITICAL: Validate toy stock availability before creating admin order
    console.log('🔍 Validating toy stock for admin order creation...');
    
    if (orderItems && orderItems.length > 0) {
      const toyIds = orderItems.map((item: any) => item.toy_id).filter(Boolean);
      
      if (toyIds.length > 0) {
        // Check each toy's stock individually
        for (const toyId of toyIds) {
          const { data: toyStock, error: stockError } = await supabaseAdmin
            .from('toys')
            .select('id, name, available_quantity, inventory_status')
            .eq('id', toyId)
            .single();
          
          if (stockError || !toyStock) {
            console.error('❌ Toy not found:', toyId, stockError);
            return new Response(
              JSON.stringify({ 
                error: `Toy not found: ${toyId}`,
                details: stockError?.message || 'Toy does not exist'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          const available = toyStock.available_quantity || 0;
          const isInStock = available > 0 && toyStock.inventory_status !== 'discontinued';
          
          if (!isInStock) {
            console.error('❌ Admin order validation failed - Out of stock toy:', toyStock.name);
            return new Response(
              JSON.stringify({ 
                error: `Cannot create admin order: ${toyStock.name} is currently out of stock`,
                details: `Available quantity: ${available}, Status: ${toyStock.inventory_status}`
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }
        
        console.log('✅ All selected toys are in stock for admin order');
      }
    }

    // Prepare toys data for JSONB storage
    const toysData = orderItems.map((item: any) => ({
      toy_id: item.toy_id,
      name: item.toy_name || 'Unknown Toy',
      category: item.category || 'unknown',
      image_url: item.image_url || null,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      returned: false,
      age_group: item.age_group || orderData.age_group || null,
      subscription_category: item.subscription_category || orderData.subscription_plan || null
    }))

    console.log('📦 Prepared toys data:', toysData)

    // Prepare shipping address for JSONB storage
    const shippingAddress = orderData.shipping_address || {}
    const standardizedAddress = {
      first_name: shippingAddress.first_name || userData.first_name || '',
      last_name: shippingAddress.last_name || userData.last_name || '',
      phone: shippingAddress.phone || userData.phone || '',
      email: shippingAddress.email || '',
      address_line1: shippingAddress.address_line1 || shippingAddress.address1 || '',
      address_line2: shippingAddress.address_line2 || shippingAddress.address2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postcode: shippingAddress.postcode || shippingAddress.zip_code || '',
      country: shippingAddress.country || 'India',
      latitude: shippingAddress.latitude || null,
      longitude: shippingAddress.longitude || null,
      plus_code: shippingAddress.plus_code || null,
      delivery_instructions: orderData.delivery_instructions || null
    }

    console.log('📦 Prepared shipping address:', standardizedAddress)

    // Calculate amounts
    const totalAmount = orderData.total_amount || 0
    const baseAmount = orderData.base_amount || Math.round(totalAmount / 1.18) // Remove GST
    const gstAmount = orderData.gst_amount || Math.round(totalAmount - baseAmount) // 18% GST
    const discountAmount = orderData.discount_amount || 0

    // Prepare rental order data for insertion
    const newOrderData = {
      user_id: orderData.user_id,
      status: orderData.status || 'pending',
      order_type: orderData.order_type || 'subscription',
      subscription_plan: orderData.subscription_plan || orderData.plan_id || 'basic',
      subscription_category: orderData.subscription_category || orderData.plan_id || 'basic',
      age_group: orderData.age_group || '3-5',
      total_amount: totalAmount,
      base_amount: baseAmount,
      gst_amount: gstAmount,
      discount_amount: discountAmount,
      payment_amount: totalAmount,
      payment_currency: orderData.payment_currency || 'INR',
      payment_status: orderData.payment_status || 'pending',
      payment_method: orderData.payment_method || 'admin',
      coupon_code: orderData.coupon_code || null,
      cycle_number: orderData.cycle_number || 1,
      rental_start_date: startDate.toISOString().split('T')[0],
      rental_end_date: endDate.toISOString().split('T')[0],
      toys_data: toysData,
      toys_delivered_count: toysData.length,
      toys_returned_count: 0,
      shipping_address: standardizedAddress,
      delivery_instructions: orderData.delivery_instructions || null,
      pickup_instructions: orderData.pickup_instructions || null,
      user_phone: userData.phone || null,
      admin_notes: orderData.admin_notes || 'Created by admin',
      internal_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📋 Final rental order data:', newOrderData)

    // Insert rental order using service role (bypasses RLS)
    const { data: orderResult, error: orderError } = await supabaseAdmin
      .from('rental_orders')
      .insert([newOrderData])
      .select()
      .single()

    if (orderError) {
      console.error('❌ Error creating rental order:', orderError)
      console.error('❌ Order data that failed:', newOrderData)
      return new Response(
        JSON.stringify({ 
          error: orderError.message || 'Failed to create rental order',
          details: orderError.details || null,
          hint: orderError.hint || null,
          code: orderError.code || null
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Rental order created successfully:', orderResult)

    // Create subscription record for subscription orders
    if (orderData.order_type === 'subscription' && orderData.plan_id) {
      console.log('🔔 Creating subscription record for plan:', orderData.plan_id)
      
      try {
        // Calculate subscription dates
        const subscriptionStart = startDate
        const subscriptionEnd = new Date(endDate)
        
        // Set subscription duration based on plan
        const planDurations: { [key: string]: number } = {
          'discovery-delight': 1,
          'silver-pack': 6,
          'gold-pack': 6,
          'ride_on_fixed': 1
        }
        
        const duration = planDurations[orderData.plan_id] || 1
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + duration)

        const subscriptionData = {
          user_id: orderData.user_id,
          plan_id: orderData.plan_id,
          status: 'active',
          start_date: subscriptionStart.toISOString().split('T')[0],
          end_date: subscriptionEnd.toISOString().split('T')[0],
          current_period_start: subscriptionStart.toISOString().split('T')[0],
          current_period_end: new Date(subscriptionStart.getFullYear(), subscriptionStart.getMonth() + 1, subscriptionStart.getDate()).toISOString().split('T')[0],
          auto_renew: orderData.plan_id === 'discovery-delight', // Only monthly plans auto-renew
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log('🔔 Subscription data:', subscriptionData)

        const { data: subscriptionResult, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert([subscriptionData])
          .select()
          .single()

        if (subError) {
          console.error('⚠️ Error creating subscription (non-critical):', subError)
          // Don't fail the order creation if subscription fails
        } else {
          console.log('✅ Subscription created successfully:', subscriptionResult.id)
        }
      } catch (subscriptionError) {
        console.error('⚠️ Subscription creation failed (non-critical):', subscriptionError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: orderResult,
        message: 'Rental order created successfully and will appear in the order management list'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
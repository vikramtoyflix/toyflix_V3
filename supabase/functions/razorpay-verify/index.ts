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

/**
 * Freshworks CRM Integration for Order Completion
 * Handles contact update with subscription details and confirmation messages
 */
async function handleFreshworksOrderCompletion(
  user: any, 
  orderData: any, 
  orderItems: any
): Promise<{ success: boolean; errors?: string[] }> {
  const FRESHWORKS_DOMAIN = Deno.env.get('VITE_FRESHWORKS_DOMAIN') || 'https://toyflix-team.myfreshworks.com';
  const FRESHWORKS_API_KEY = Deno.env.get('VITE_FRESHWORKS_API_KEY') || '6E4UMQZXl21gF_h5KwmUxQ';
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('VITE_WHATSAPP_ACCESS_TOKEN') || 'EAAKqaQXUICYBACJHCpLiuGui8WggYbB34HIs8elyg3P4ZCeq8VEeMvPm2cM9HPZAZAnhSDl5cQxdT9OOSPgX8h3qQCDGvx25XERd42CJIbZAy3OUUtMuZANEsGMo5a7Hj38aUDZBBEIy1NKVE6xS9fN1wZAn4GuM8XWxjGW9qvOy7fWjEPctQZD';
  const WHATSAPP_PHONE_ID = Deno.env.get('VITE_WHATSAPP_PHONE_ID') || '108801041898772';

  const errors: string[] = [];
  
  try {
    console.log('🔧 Starting Freshworks order completion integration for user:', user.id);

    // Step 1: Search for existing contact by phone/email
    let contactId = null;
    try {
      const searchUrl = `${FRESHWORKS_DOMAIN}/crm/sales/api/search?q=${encodeURIComponent(user.phone)}&include=contact`;
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${FRESHWORKS_API_KEY}`,
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.length > 0) {
          contactId = searchData[0].id;
          console.log('✅ Found existing Freshworks contact:', contactId);
        }
      }
    } catch (searchError: any) {
      console.warn('⚠️ Contact search failed:', searchError.message);
    }

    // Step 2: Update contact with subscription details
    try {
      // Map plan to product tag
      const productTagMapping: { [key: string]: string } = {
        'discovery-delight': 'Trail plan deal',
        'silver-pack': '6 Months plan deal',
        'gold-pack': '6 Months pro plan deal',
        'ride_on_fixed': 'Car plan deal',
        'trial': 'Trail plan deal',
        'basic': 'Trail plan deal',
        'quarterly': '6 Months plan deal',
        '6_month': '6 Months pro plan deal'
      };

      // Map age group
      const ageGroupMapping: { [key: string]: string } = {
        '1-2': '6m-2 years',
        '2-3': '2-3 years',
        '3-4': '3-4 years',
        '4-6': '4-6 years',
        '6-8': '6-8 years',
        'all': '1-8 years'
      };

      const productTag = productTagMapping[orderItems.planId] || 'ToyFlix Subscriber';
      const ageGroupText = ageGroupMapping[orderItems.ageGroup] || orderItems.ageGroup;
      
      // Calculate subscription end date (1 year from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

      const contactUpdateData = {
        contact: {
          tags: [productTag],
          custom_field: {
            cf_kids_age_group: ageGroupText,
            cf_subscription_end_date: subscriptionEndDate.toISOString().split('T')[0]
          }
        }
      };

      if (contactId) {
        // Update existing contact
        const updateUrl = `${FRESHWORKS_DOMAIN}/crm/sales/api/contacts/${contactId}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token token=${FRESHWORKS_API_KEY}`,
          },
          body: JSON.stringify(contactUpdateData),
        });

        if (updateResponse.ok) {
          console.log('✅ Freshworks contact updated with subscription data');
        } else {
          const errorText = await updateResponse.text();
          console.error('❌ Freshworks contact update failed:', updateResponse.status, errorText);
          errors.push(`CRM Update: HTTP ${updateResponse.status}`);
        }
      } else {
        // Create new contact with subscription data
        const createData = {
          contact: {
            first_name: user.first_name || 'Customer',
            last_name: user.last_name || '',
            email: user.email || '',
            mobile_number: user.phone,
            tags: [productTag],
            custom_field: {
              cf_kids_age_group: ageGroupText,
              cf_subscription_end_date: subscriptionEndDate.toISOString().split('T')[0]
            }
          }
        };

        const createUrl = `${FRESHWORKS_DOMAIN}/crm/sales/api/contacts`;
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token token=${FRESHWORKS_API_KEY}`,
          },
          body: JSON.stringify(createData),
        });

        if (createResponse.ok) {
          const createResult = await createResponse.json();
          console.log('✅ Freshworks contact created with subscription data:', createResult.contact?.id);
        } else {
          const errorText = await createResponse.text();
          console.error('❌ Freshworks contact creation failed:', createResponse.status, errorText);
          errors.push(`CRM Create: HTTP ${createResponse.status}`);
        }
      }
    } catch (crmError: any) {
      console.error('❌ CRM integration error:', crmError.message);
      errors.push(`CRM: ${crmError.message}`);
    }

    // Step 3: Send subscription confirmation WhatsApp message
    try {
      if (user.first_name && user.phone) {
        // Format phone number for WhatsApp
        let formattedPhone = user.phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
          // Already has country code
        } else if (formattedPhone.length === 10) {
          formattedPhone = `91${formattedPhone}`;
        }

        const planName = orderItems.planId || 'subscription plan';
        const confirmationMessage = `Thank you ${user.first_name}! 🎉\n\nYour ${planName} subscription payment was successful! Your toys will be delivered to you soon.\n\nGet ready for an amazing toy rental experience! We can't wait for your little one to start playing! 🧸`;

        const whatsappData = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'toyflix_promotion',
            language: { code: 'en_US' },
            components: [
              {
                type: 'header',
                parameters: [
                  {
                    type: 'image',
                    image: { link: 'https://i.ibb.co/hFVFrvC/TFwhatsapp1.jpg' }
                  }
                ]
              },
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: confirmationMessage
                  }
                ]
              }
            ]
          }
        };

        console.log('📱 Sending subscription confirmation WhatsApp message...');
        const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(whatsappData),
        });

        if (whatsappResponse.ok) {
          const whatsappResult = await whatsappResponse.json();
          console.log('✅ WhatsApp confirmation message sent successfully:', whatsappResult.messages?.[0]?.id);
        } else {
          const errorText = await whatsappResponse.text();
          console.error('❌ WhatsApp confirmation message failed:', whatsappResponse.status, errorText);
          errors.push(`WhatsApp: HTTP ${whatsappResponse.status}`);
        }
      }
    } catch (whatsappError: any) {
      console.error('❌ WhatsApp integration error:', whatsappError.message);
      errors.push(`WhatsApp: ${whatsappError.message}`);
    }

    const success = errors.length === 0;
    console.log(`🔧 Order completion integration ${success ? 'completed successfully' : 'completed with errors'}. Errors: ${errors.length}`);
    
    return { success, errors: errors.length > 0 ? errors : undefined };

  } catch (error: any) {
    console.error('❌ Freshworks order completion integration failed:', error.message);
    return { success: false, errors: [`Integration failed: ${error.message}`] };
  }
}

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

    // Create subscription in NEW tracking table
    if (order.order_type === 'subscription') {
      console.log('🔄 Creating subscription tracking entry');
      
      const orderItems = order.order_items || {};
      const userId = order.user_id;
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      const subscriptionMonths = orderItems.planId === 'quarterly' ? 3 : 
                                orderItems.planId === '6_month' ? 6 : 1;
      endDate.setMonth(endDate.getMonth() + subscriptionMonths);

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
            payment_amount: order.total_amount || order.amount || (order.base_amount + order.gst_amount) || 0,
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
        } catch (userProfileError) {
          console.error('❌ Critical error updating user profile:', userProfileError);
          throw userProfileError;
        }

        // ✅ CRITICAL: Create order record for admin panel visibility
        try {
          console.log('📦 Creating unified rental order record...');
          console.log('📦 Order items data:', JSON.stringify(orderItems, null, 2));
          console.log('📦 User ID:', userId);
          console.log('📦 Payment amount:', order.total_amount || order.amount || (order.base_amount + order.gst_amount) || 0);
          
          // Prepare standardized shipping address with fallback to user profile
          const shippingAddress = orderItems.shippingAddress || {};
          
          // Check if shipping address is empty or incomplete
          const hasShippingAddress = shippingAddress.address_line1 || shippingAddress.address1;
          
          // Use profile address as fallback if shipping address is missing
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

          console.log('📦 Prepared shipping address:', JSON.stringify(standardizedAddress, null, 2));

          // Prepare toys data for JSONB storage
          const toysData = orderItems.rideOnToyId ? 
            [{ 
              toy_id: orderItems.rideOnToyId, 
              name: 'Ride-on Toy', 
              category: 'ride_on',
              quantity: 1, 
              unit_price: order.total_amount || order.amount || 0,
              total_price: order.total_amount || order.amount || 0,
              returned: false 
            }] :
            (orderItems.selectedToys || []).map((toy: any) => ({
              toy_id: toy.id,
              name: toy.name,
              category: toy.category,
              image_url: toy.image_url,
              quantity: 1,
              unit_price: toy.rental_price || 0,
              total_price: toy.rental_price || 0,
              returned: false
            }));

          console.log('📦 Prepared toys data:', JSON.stringify(toysData, null, 2));
          console.log('📦 Toys count:', toysData.length);

          // Prepare the complete rental order data with validation
          const rentalOrderPayload = {
            user_id: userId,
            status: 'pending',
            order_type: order.order_type,
            subscription_plan: orderItems.planId || 'basic',
            total_amount: order.total_amount || order.amount || (order.base_amount + order.gst_amount) || 0,
            base_amount: order.base_amount || 0,
            gst_amount: order.gst_amount || 0,
            discount_amount: order.discount_amount || 0,
            coupon_code: orderItems.appliedCoupon || order.coupon_code || null,
            payment_status: 'paid',
            payment_method: 'razorpay',
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,
            payment_amount: order.total_amount || order.amount || (order.base_amount + order.gst_amount) || 0,
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
            confirmed_at: null,
            shipped_at: null,
            delivered_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('📦 Final rental order payload prepared');
          console.log('📦 Payload keys:', Object.keys(rentalOrderPayload));
          console.log('📦 Attempting database insert...');

          // ✅ UNIFIED APPROACH - Single INSERT to rental_orders with detailed error handling
          const { data: rentalOrder, error: rentalError } = await supabaseClient
            .from('rental_orders')
            .insert(rentalOrderPayload)
            .select()
            .single();

          if (rentalError) {
            console.error('❌ CRITICAL: Rental order creation failed with detailed error:');
            console.error('❌ Error code:', rentalError.code);
            console.error('❌ Error message:', rentalError.message);
            console.error('❌ Error details:', rentalError.details);
            console.error('❌ Error hint:', rentalError.hint);
            console.error('❌ Error payload:', JSON.stringify(rentalOrderPayload, null, 2));
            
            // Log the specific error type for debugging
            if (rentalError.message?.includes('permission')) {
              console.error('❌ PERMISSION ERROR: Edge function may not have INSERT permission on rental_orders table');
            }
            if (rentalError.message?.includes('column')) {
              console.error('❌ COLUMN ERROR: Database schema mismatch - rental_orders table structure issue');
            }
            if (rentalError.message?.includes('constraint')) {
              console.error('❌ CONSTRAINT ERROR: Database constraint violation');
            }
            if (rentalError.message?.includes('foreign key')) {
              console.error('❌ FOREIGN KEY ERROR: Referenced data does not exist');
            }
            
            // This is CRITICAL - if rental order creation fails, the entire payment verification should fail
            throw new Error(`CRITICAL: Failed to create rental order: ${rentalError.message}. Payment: ${razorpay_payment_id}, User: ${userId}`);
          }

          if (!rentalOrder || !rentalOrder.id) {
            console.error('❌ CRITICAL: Rental order creation returned no data');
            throw new Error(`CRITICAL: Rental order creation returned no data. Payment: ${razorpay_payment_id}, User: ${userId}`);
          }

          console.log('✅ SUCCESS: Unified rental order created successfully');
          console.log('✅ Order ID:', rentalOrder.id);
          console.log('✅ Order Number:', rentalOrder.order_number);
          console.log('✅ Status:', rentalOrder.status);
          console.log('✅ Amount:', rentalOrder.total_amount);
          console.log('✅ User ID:', rentalOrder.user_id);
          console.log('✅ Payment ID:', rentalOrder.razorpay_payment_id);

          // 📊 Log purchase data for Meta Signals Gateway tracking
          // This will be picked up by client-side tracking systems
          console.log('📊 PURCHASE_EVENT_DATA:', JSON.stringify({
            event: 'Purchase',
            payment_id: razorpay_payment_id,
            order_id: rentalOrder.id,
            order_number: rentalOrder.order_number,
            user_id: userId,
            plan_id: orderItems.planId,
            value: order.total_amount || order.amount || 0,
            currency: 'INR',
            content_ids: toysData.map((toy: any) => toy.toy_id),
            content_names: toysData.map((toy: any) => toy.name),
            num_items: toysData.length,
            content_type: 'product',
            content_category: 'subscription',
            subscription_plan: orderItems.planId,
            order_type: order.order_type,
            timestamp: new Date().toISOString()
          }));

          // 🎯 NEW: Freshworks CRM & WhatsApp Integration for Order Completion
          try {
            // Get user data for integration
            const { data: userData, error: userError } = await supabaseClient
              .from('custom_users')
              .select('*')
              .eq('id', userId)
              .single();

            if (userData && !userError) {
              const integrationResult = await handleFreshworksOrderCompletion(
                userData,
                order,
                orderItems
              );
              
              if (integrationResult.success) {
                console.log('✅ Freshworks order completion integration successful');
              } else {
                console.warn('⚠️ Freshworks order completion integration had errors:', integrationResult.errors);
                // Don't fail payment verification if CRM integration fails
              }
            } else {
              console.warn('⚠️ Could not get user data for Freshworks integration:', userError);
            }
          } catch (integrationError: any) {
            console.error('⚠️ Freshworks order completion integration failed (non-critical):', integrationError.message);
            // Continue with payment verification even if integration fails
          }

        } catch (orderCreationError) {
          console.error('❌ CRITICAL: Rental order creation failed with exception:');
          console.error('❌ Exception message:', orderCreationError.message);
          console.error('❌ Exception stack:', orderCreationError.stack);
          console.error('❌ Payment ID:', razorpay_payment_id);
          console.error('❌ User ID:', userId);
          console.error('❌ Order source:', orderSource);
          
          // Log detailed error for debugging
          if (orderCreationError.code) {
            console.error('❌ Database error code:', orderCreationError.code);
            console.error('❌ Database error details:', orderCreationError.details);
          }
          
          // This is CRITICAL - rental order creation failure should cause the entire payment verification to fail
          // This prevents the scenario where subscription is created but no order exists
          throw new Error(`CRITICAL FAILURE: Rental order creation failed - ${orderCreationError.message}. Payment verification ABORTED to prevent data inconsistency.`);
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

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
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

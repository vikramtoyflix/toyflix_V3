import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

const generateJWT = async (userId: string, phone: string) => {
  const payload = {
    sub: userId,
    phone: phone,
    iss: "toyflix",
    exp: getNumericDate(60 * 60), // 1 hour expiration
  };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
};

interface FreshworksIntegrationResult {
  success: boolean;
  crmResult?: any;
  whatsappResult?: any;
  errors?: string[];
}

/**
 * Freshworks CRM Integration for User Registration
 * Handles contact creation and welcome message sending
 */
async function handleFreshworksIntegration(user: any): Promise<FreshworksIntegrationResult> {
  const FRESHWORKS_DOMAIN = Deno.env.get('VITE_FRESHWORKS_DOMAIN') || 'https://toyflix-team.myfreshworks.com';
  const FRESHWORKS_API_KEY = Deno.env.get('VITE_FRESHWORKS_API_KEY') || '';
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('VITE_WHATSAPP_ACCESS_TOKEN') || '';
  const WHATSAPP_PHONE_ID = Deno.env.get('VITE_WHATSAPP_PHONE_ID') || '';

  const result: FreshworksIntegrationResult = { success: true, errors: [] };

  try {
    console.log('🔧 Starting Freshworks CRM integration for user:', user.id);

    // Step 1: Create/Update contact in Freshworks CRM
    try {
      const crmUrl = `${FRESHWORKS_DOMAIN}/crm/sales/api/contacts`;
      const contactData = {
        contact: {
          first_name: user.first_name,
          last_name: user.last_name || '',
          email: user.email || '',
          mobile_number: user.phone,
          tags: ['leads', 'new_registration']
        }
      };

      console.log('📝 Creating Freshworks contact...');
      const crmResponse = await fetch(crmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${FRESHWORKS_API_KEY}`,
        },
        body: JSON.stringify(contactData),
      });

      if (crmResponse.ok) {
        const crmData = await crmResponse.json();
        result.crmResult = crmData;
        console.log('✅ Freshworks contact created successfully:', crmData.contact?.id);
      } else {
        const errorText = await crmResponse.text();
        console.error('❌ Freshworks CRM error:', crmResponse.status, errorText);
        result.errors?.push(`CRM: HTTP ${crmResponse.status}`);
      }
    } catch (crmError: any) {
      console.error('❌ CRM integration error:', crmError.message);
      result.errors?.push(`CRM: ${crmError.message}`);
    }

    // Step 2: Send welcome WhatsApp message
    try {
      // Format phone number for WhatsApp (ensure it has India country code)
      let formattedPhone = user.phone.replace(/\D/g, '');
      if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
        // Already has country code
      } else if (formattedPhone.length === 10) {
        formattedPhone = `91${formattedPhone}`;
      }

      const welcomeMessage = `Welcome to ToyFlix, ${user.first_name}! 🎉\n\nThank you for joining us! Get ready for an amazing toy rental experience. We'll have exciting toys delivered to your doorstep soon.\n\nStart exploring our toy collection and create your first subscription! 🧸`;

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
                  text: welcomeMessage
                }
              ]
            }
          ]
        }
      };

      console.log('📱 Sending welcome WhatsApp message...');
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
        result.whatsappResult = whatsappResult;
        console.log('✅ WhatsApp welcome message sent successfully:', whatsappResult.messages?.[0]?.id);
      } else {
        const errorText = await whatsappResponse.text();
        console.error('❌ WhatsApp API error:', whatsappResponse.status, errorText);
        result.errors?.push(`WhatsApp: HTTP ${whatsappResponse.status}`);
      }
    } catch (whatsappError: any) {
      console.error('❌ WhatsApp integration error:', whatsappError.message);
      result.errors?.push(`WhatsApp: ${whatsappError.message}`);
    }

    // Overall success if at least one integration worked
    result.success = (result.errors?.length || 0) < 2;

    console.log(`🔧 Freshworks integration completed. Success: ${result.success}, Errors: ${result.errors?.length || 0}`);
    return result;

  } catch (error: any) {
    console.error('❌ Freshworks integration failed:', error.message);
    return {
      success: false,
      errors: [`Integration failed: ${error.message}`]
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Complete Profile Function Started ===');
  console.log('Request method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, firstName, lastName, email, pincode } = await req.json();
    console.log('Received profile completion request for userId:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 1. Find the user by ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify that the user's phone is verified (OTP was completed)
    if (!user.phone_verified) {
      console.error('Phone not verified for user:', userId);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Phone number not verified. Please complete OTP verification first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Update user profile with provided information
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('custom_users')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        zip_code: pincode || null,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update profile' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 User profile completed successfully:', {
      userId: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email
    });

    // 4. 🎯 NEW: Freshworks CRM Integration
    try {
      const integrationResult = await handleFreshworksIntegration(updatedUser);
      
      if (integrationResult.success) {
        console.log('✅ Freshworks integration completed successfully');
      } else {
        console.warn('⚠️ Freshworks integration had errors:', integrationResult.errors);
        // Don't fail profile completion if CRM integration fails
      }
    } catch (integrationError: any) {
      console.error('⚠️ Freshworks integration failed (non-critical):', integrationError.message);
      // Continue with profile completion even if integration fails
    }

    // 5. Generate session for the now-complete user
    const accessToken = await generateJWT(updatedUser.id, updatedUser.phone);
    const refreshToken = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 days

    await supabaseAdmin.from('user_sessions').insert({
      user_id: updatedUser.id,
      session_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      refresh_expires_at: new Date(refreshExpiresAt * 1000).toISOString(),
    });

    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: updatedUser,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
    };

    console.log('🔍 Session created successfully for completed profile:', updatedUser.id);

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser,
      session: session,
      message: 'Profile completed and user authenticated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('🔍 Profile completion error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to complete profile'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler); 
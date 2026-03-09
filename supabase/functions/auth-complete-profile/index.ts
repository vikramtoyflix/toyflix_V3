import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const generateJWT = async (userId: string, phone: string) => {
  const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'super-secret-jwt-token-with-at-least-32-characters-long';
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

// Freshworks/WhatsApp integration removed – not in use. Profile completion uses Supabase only.

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

    // 4. Generate session for the now-complete user
    const accessToken = await generateJWT(updatedUser.id, updatedUser.phone);
    const refreshToken = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 days

    const { error: sessionInsertError } = await supabaseAdmin.from('user_sessions').insert({
      user_id: updatedUser.id,
      session_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      refresh_expires_at: new Date(refreshExpiresAt * 1000).toISOString(),
    });
    if (sessionInsertError) {
      console.error('Failed to persist user_session:', sessionInsertError.message);
      // Non-fatal: return session anyway so user can still complete registration
    }

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
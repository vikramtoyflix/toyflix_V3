import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

interface SignupRequest {
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  pincode?: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone, email, firstName, lastName, pincode, otp }: SignupRequest = await req.json();

    console.log('Signup request for phone:', phone, 'with pincode:', pincode);

    // Verify OTP first
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', phone)
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('custom_users')
        .update({
          email: email || existingUser.email,
          first_name: firstName || existingUser.first_name,
          last_name: lastName || existingUser.last_name,
          pincode: pincode || existingUser.pincode,
          phone_verified: true,
          last_login: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update user');
      }
      userId = updatedUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone,
          email,
          first_name: firstName,
          last_name: lastName,
          pincode,
          phone_verified: true,
          last_login: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user');
      }
      userId = newUser.id;
    }

    // Generate session tokens
    const sessionToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        device_info: { userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // Get user data for response
    const { data: userData } = await supabase
      .from('custom_users')
      .select('id, phone, email, first_name, last_name, pincode, phone_verified')
      .eq('id', userId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        user: userData,
        session: {
          access_token: sessionToken,
          refresh_token: refreshToken,
          expires_at: expiresAt.toISOString(),
          token_type: 'bearer'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);

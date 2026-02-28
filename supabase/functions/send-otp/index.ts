
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

interface SendOTPRequest {
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Send OTP Function Started v5 ===');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: SendOTPRequest = await req.json();
    const { phone } = requestData;

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone to +91XXXXXXXXXX consistently
    const formattedPhone = phone.startsWith('+91') ? phone :
                           phone.startsWith('91') ? `+${phone}` :
                           `+91${phone.replace(/^0/, '')}`;

    console.log('Processing OTP for:', formattedPhone);

    const twoFactorApiKey = Deno.env.get('TWOFACTOR_API_KEY');

    if (!twoFactorApiKey) {
      // Dev mode: generate and store OTP locally, return it in response
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from('otp_verifications').insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_verified: false,
        provider: 'dev',
        session_id: 'dev-mode',
      });

      return new Response(
        JSON.stringify({ success: true, development_mode: true, otp_code: otpCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Production: use 2Factor AUTOGEN — they generate AND send the OTP
    // We do NOT generate our own OTP; we use their session_id for verification
    const twoFactorUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${formattedPhone}/AUTOGEN/OTP1`;
    console.log('Calling 2Factor AUTOGEN API...');

    const smsResponse = await fetch(twoFactorUrl, { method: 'GET' });
    const responseData = await smsResponse.json();
    console.log('2Factor API response:', responseData);

    if (responseData.Status !== 'Success') {
      console.error('2Factor API error:', responseData);
      throw new Error(`2Factor API error: ${JSON.stringify(responseData)}`);
    }

    const sessionId = responseData.Details;
    if (!sessionId) {
      throw new Error('No session ID received from 2Factor');
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store OTP record with session_id immediately (awaited — no race condition)
    const { error: dbError } = await supabase.from('otp_verifications').insert({
      phone_number: formattedPhone,
      otp_code: 'autogen',      // placeholder — actual OTP is managed by 2Factor
      expires_at: expiresAt,
      is_verified: false,
      provider: '2factor',
      session_id: sessionId,    // saved synchronously — critical for verification
    });

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error('Failed to store OTP session');
    }

    console.log('OTP sent and session stored. sessionId:', sessionId);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== Send OTP Error ===', error?.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to send OTP',
        message: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

console.log('Starting send-otp function server v5...');
serve(handler);


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
  console.log('=== Send OTP Function Started v4 (2Factor integrated) ===');
  console.log('Request method:', req.method);
  console.log('Timestamp:', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');

    console.log('Parsing request body...');
    const requestData: SendOTPRequest = await req.json();
    const { phone } = requestData;
    console.log('Received phone number:', phone);
    
    if (!phone) {
      console.log('No phone number provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing OTP request for phone:', phone);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const twoFactorApiKey = Deno.env.get('TWOFACTOR_API_KEY');

    if (!twoFactorApiKey) {
      // No API key — store OTP and return dev mode response
      await supabase.from('otp_verifications').insert({
        phone_number: phone, otp_code: otpCode, expires_at: expiresAt,
        is_verified: false, provider: '2factor'
      });
      return new Response(
        JSON.stringify({ success: true, development_mode: true, otp_code: otpCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = phone.startsWith('+91') ? phone :
                           phone.startsWith('91') ? `+${phone}` :
                           `+91${phone.replace(/^0/, '')}`;

    const twoFactorUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${formattedPhone}/AUTOGEN/OTP1`;

    // Run DB insert and SMS send in parallel — saves one full round-trip
    const [dbResult, smsResponse] = await Promise.all([
      supabase.from('otp_verifications').insert({
        phone_number: phone, otp_code: otpCode, expires_at: expiresAt,
        is_verified: false, provider: '2factor'
      }),
      fetch(twoFactorUrl, { method: 'GET' }),
    ]);

    if (dbResult.error) {
      console.error('Database error:', dbResult.error);
      throw new Error('Failed to store OTP');
    }

    const responseData = await smsResponse.json();
    console.log('2Factor API response:', responseData);

    if (responseData.Status === 'Success' && responseData.Details?.toLowerCase().includes('voice')) {
      throw new Error('Received voice OTP response instead of SMS. Please check template configuration.');
    }
    if (responseData.Status !== 'Success') {
      throw new Error(`2Factor API error: ${JSON.stringify(responseData)}`);
    }

    const sessionId = responseData.Details;
    if (!sessionId) throw new Error('No session ID received from 2Factor');

    // Fire session ID update without awaiting — user doesn't need to wait for this
    supabase.from('otp_verifications')
      .update({ provider: '2factor', session_id: sessionId })
      .eq('phone_number', phone)
      .eq('is_verified', false)
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ error }) => {
        if (error) console.error('Non-blocking session ID update failed:', error);
      });

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully', sessionId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== Send OTP Function Error v4 ===');
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

console.log('Starting send-otp function server v4 (2Factor integrated)...');
serve(handler);

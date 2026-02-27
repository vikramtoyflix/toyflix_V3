import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Verify OTP Function Started ===');
  console.log('Request method:', req.method);
  console.log('Timestamp:', new Date().toISOString());

  if (req.method === 'OPTIONS') {
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

    const requestData: VerifyOTPRequest = await req.json();
    const { phone, otp } = requestData;
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number consistently
    const formattedPhone = phone.startsWith('+91') ? phone : 
                          phone.startsWith('91') ? `+${phone}` : 
                          `+91${phone.replace(/^0/, '')}`;

    console.log('Verifying OTP for phone:', formattedPhone);

    // Check our database for the OTP
    const { data: otpRecords, error: dbError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to verify OTP');
    }

    // Check if we found any valid OTP
    if (!otpRecords || otpRecords.length === 0) {
      console.log('No valid OTP found for phone:', formattedPhone);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired OTP',
          details: 'No valid OTP found for this phone number'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpRecord = otpRecords[0];
    console.log('Found valid OTP record:', {
      id: otpRecord.id,
      created_at: otpRecord.created_at,
      expires_at: otpRecord.expires_at
    });

    // Mark OTP as verified in our database
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      throw new Error('Failed to update verification status');
    }

    console.log('OTP verified successfully for phone:', formattedPhone);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP verified successfully',
        phone: formattedPhone
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== Verify OTP Function Error ===');
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

console.log('Starting verify-otp function server...');
serve(handler);


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
    console.log('Generated OTP code:', otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    console.log('Storing OTP in database...');
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phone,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_verified: false,
        provider: '2factor'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }
    console.log('OTP stored in database successfully');

    // --- 2Factor SMS Sending Logic ---
    console.log('Attempting to send OTP via 2Factor...');
    const twoFactorApiKey = Deno.env.get('TWOFACTOR_API_KEY');

    if (!twoFactorApiKey) {
      console.error('Missing 2Factor API key');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP generated but SMS not sent due to missing configuration.',
          development_mode: true,
          otp_code: otpCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (ensure it has +91 prefix)
    const formattedPhone = phone.startsWith('+91') ? phone : 
                          phone.startsWith('91') ? `+${phone}` : 
                          `+91${phone.replace(/^0/, '')}`;
    
    console.log('Preparing 2Factor request...', {
      to: formattedPhone,
      template: 'OTP1',
      mode: 'AUTOGEN'
    });

    // Use V1 API endpoint with AUTOGEN/OTP1 template
    const twoFactorUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${formattedPhone}/AUTOGEN/OTP1`;

    try {
      console.log('Sending 2Factor request...');
      const smsResponse = await fetch(twoFactorUrl, {
        method: 'GET'
      });
      
      const responseData = await smsResponse.json();
      console.log('2Factor API response:', responseData);

      // Check if this is a voice OTP response
      if (responseData.Status === 'Success' && responseData.Details?.toLowerCase().includes('voice')) {
        throw new Error('Received voice OTP response instead of SMS. Please check template configuration.');
      }

      if (responseData.Status !== 'Success') {
        throw new Error(`2Factor API error: ${JSON.stringify(responseData)}`);
      }
      
      console.log('OTP SMS sent successfully via 2Factor');

      // Extract session ID - it's directly in Details for AUTOGEN mode
      const sessionId = responseData.Details;
      console.log('Extracted session ID:', sessionId);

      if (!sessionId) {
        throw new Error('No session ID received from 2Factor');
      }

      try {
        // Update the OTP record with 2Factor's session ID
        console.log('Updating OTP record with session ID:', sessionId);
        const { error: updateError } = await supabase
          .from('otp_verifications')
          .update({ 
            provider: '2factor',
            session_id: sessionId
          })
          .eq('phone_number', phone)
          .eq('is_verified', false)
          .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
          .order('created_at', { ascending: false })
          .limit(1);

        if (updateError) {
          console.error('Failed to update OTP details:', updateError);
          throw new Error(`Failed to update OTP record: ${updateError.message}`);
        } else {
          console.log('Successfully updated OTP record with 2Factor session ID');
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
        throw new Error('Failed to update OTP record with session ID');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'OTP sent successfully',
          sessionId: sessionId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (smsError) {
      console.error('2Factor request failed:', smsError);
      throw smsError;
    }

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

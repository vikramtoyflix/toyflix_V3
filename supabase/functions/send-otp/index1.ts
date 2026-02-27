
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface SendOTPRequest {
  phone: string;
}

// Send OTP via 2Factor
async function send2FactorOTP(phone: string, otpCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const twoFactorApiKey = Deno.env.get('TWOFACTOR_API_KEY');
    const twoFactorSenderId = Deno.env.get('TWOFACTOR_SENDER_ID') || 'TOYFLX';
    const templateName = Deno.env.get('TWOFACTOR_TEMPLATE_NAME') || 'TOYFLIX_OTP'; // Add template name
    const messageTemplate = Deno.env.get('TWOFACTOR_MESSAGE_TEMPLATE') || 
      'Your Toyflix verification code is: XXXX. Valid for 10 minutes.';

    if (!twoFactorApiKey) {
      console.error('Missing 2Factor API key');
      return { success: false, error: 'Missing 2Factor configuration' };
    }

    // Clean the phone number to 10 digits only
    const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');
    console.log('Cleaned phone number for 2Factor:', cleanPhone);

    const message = messageTemplate.replace('{otp}', otpCode);

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('module', 'TRANS_SMS');
    formData.append('apikey', twoFactorApiKey);
    formData.append('to', cleanPhone);
    formData.append('from', twoFactorSenderId);
    formData.append('templatename', templateName); // Add template name parameter
    formData.append('var1', otpCode); // Use template variable instead of msg
    
    // Optional DLT parameters
    const peid = Deno.env.get('TWOFACTOR_PE_ID');
    const ctid = Deno.env.get('TWOFACTOR_CT_ID');
    if (peid) formData.append('peid', peid);
    if (ctid) formData.append('ctid', ctid);

    console.log('2Factor request payload:', {
      to: cleanPhone,
      from: twoFactorSenderId,
      module: 'TRANS_SMS',
      templatename: templateName,
      var1: otpCode
    });

    const response = await fetch('https://2factor.in/API/R1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    console.log('2Factor raw response:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse 2Factor response:', e);
      return { success: false, error: 'Invalid response from 2Factor' };
    }

    if (result.Status === 'Success') {
      console.log('✅ 2Factor SMS sent successfully:', result.Details);
      return { success: true };
    } else {
      console.error('❌ 2Factor API error:', result.Details);
      return { success: false, error: result.Details };
    }
  } catch (error: any) {
    console.error('❌ 2Factor service error:', error);
    return { success: false, error: error.message };
  }
}

// Send OTP via Twilio (fallback)
async function sendTwilioOTP(phone: string, otpCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return { success: false, error: 'Missing Twilio configuration' };
    }

    const message = `Your Toyflix verification code is: ${otpCode}`;
    // Ensure proper Twilio format (+91XXXXXXXXXX)
    const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');
    const formattedPhone = `+91${cleanPhone}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const body = new URLSearchParams();
    body.append('To', formattedPhone);
    body.append('From', twilioPhoneNumber);
    body.append('Body', message);

    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio error: ${JSON.stringify(errorData)}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
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

    const { phone }: SendOTPRequest = await req.json();
    console.log('Received OTP request for phone:', phone);
    
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate and store OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phone,
        otp_code: otpCode,
        expires_at: expiresAt,
        is_verified: false,
        provider: '2factor' // Track which provider was used
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }

    // Try 2Factor first
    console.log('Attempting to send OTP via 2Factor...');
    const twoFactorResult = await send2FactorOTP(phone, otpCode);
    
    if (twoFactorResult.success) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'OTP sent successfully via 2Factor',
          provider: '2factor',
          ...(Deno.env.get('APP_ENV') === 'development' && { otp_code: otpCode })
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to Twilio if enabled
    const enableFallback = Deno.env.get('ENABLE_SMS_FALLBACK') === 'true';
    if (enableFallback) {
      console.log('2Factor failed, attempting Twilio fallback...');
      const twilioResult = await sendTwilioOTP(phone, otpCode);
      
      if (twilioResult.success) {
        // Update provider in database
        await supabase
          .from('otp_verifications')
          .update({ provider: 'twilio' })
          .eq('phone_number', phone)
          .eq('otp_code', otpCode);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'OTP sent successfully via Twilio (fallback)',
            provider: 'twilio',
            ...(Deno.env.get('APP_ENV') === 'development' && { otp_code: otpCode })
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Both providers failed
    throw new Error('Failed to send OTP via both providers');

  } catch (error: any) {
    console.error('Send OTP function error:', error);
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

serve(handler);


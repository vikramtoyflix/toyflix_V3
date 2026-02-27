import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Check User Status Function Started ===');
  console.log('Request method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone');
    
    if (!phone) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Phone parameter is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Checking status for phone:', phone);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Enhanced phone format variations to handle ALL possible storage patterns
    const phoneVariations = [
      phone,                                      // Original input
      phone.replace(/^\+91/, ''),                // Remove +91 prefix
      phone.replace(/^91/, ''),                  // Remove 91 prefix  
      phone.replace(/^\+?91/, ''),               // Remove any 91 prefix
      phone.startsWith('+91') ? phone : `+91${phone}`, // Add +91 prefix
      phone.startsWith('91') ? phone : `91${phone}`,   // Add 91 prefix
      phone.replace(/[^\d]/g, ''),               // Only digits
      phone.replace(/[^\d]/g, '').slice(-10),    // Last 10 digits only
      phone.trim(),                              // Remove whitespace
      phone.replace(/\s+/g, ''),                 // Remove all spaces
    ];

    // Also try with common spacing patterns that might exist in old data
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length >= 10) {
      const last10 = cleanPhone.slice(-10);
      phoneVariations.push(
        last10,                                   // Clean 10 digits
        `+91${last10}`,                          // +91 + 10 digits
        `91${last10}`,                           // 91 + 10 digits
        `+91 ${last10}`,                         // With space
        `91 ${last10}`,                          // With space
      );
    }

    // Remove duplicates
    const uniquePhoneFormats = [...new Set(phoneVariations)];
    console.log('🔍 Checking phone variations:', uniquePhoneFormats);

    let user = null;
    let userError = null;

    // Try each phone format until we find a user
    for (const phoneFormat of uniquePhoneFormats) {
      const { data: foundUser, error: checkError } = await supabaseAdmin
        .from('custom_users')
        .select('id, phone, first_name, last_name, phone_verified, created_at')
        .eq('phone', phoneFormat)
        .maybeSingle();

      if (checkError) {
        console.error(`🔍 Database error checking phone format "${phoneFormat}":`, checkError);
        userError = checkError;
        continue;
      }

      if (foundUser) {
        console.log(`🔍 User found with phone format "${phoneFormat}"`);
        user = foundUser;
        break;
      }
    }

    if (userError && !user) {
      console.error('🔍 Database error during user check:', userError);
      throw new Error('Error checking user status');
    }

    const exists = !!user;
    const isComplete = exists && !!(user?.first_name && user?.last_name);
    const isPhoneVerified = exists && !!user?.phone_verified;

    console.log('🔍 User status check result:', {
      inputPhone: phone,
      foundPhone: user?.phone || null,
      exists,
      isComplete,
      isPhoneVerified,
      hasFirstName: !!user?.first_name,
      hasLastName: !!user?.last_name
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      exists,
      isComplete,
      isPhoneVerified,
      userId: user?.id || null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Check User Status Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler); 
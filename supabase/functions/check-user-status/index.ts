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

    // Build all phone format variations, then query once with IN — much faster than looping
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const uniquePhoneFormats = [...new Set([
      phone,
      phone.trim(),
      last10,
      `+91${last10}`,
      `91${last10}`,
    ])];

    const { data: users, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('id, phone, first_name, last_name, phone_verified, created_at')
      .in('phone', uniquePhoneFormats)
      .limit(1);

    if (userError) {
      console.error('🔍 Database error during user check:', userError);
      throw new Error('Error checking user status');
    }

    const user = users && users.length > 0 ? users[0] : null;

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
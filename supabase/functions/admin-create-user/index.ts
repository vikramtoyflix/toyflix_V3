import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Create a Supabase client with service role key for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('✅ Supabase admin client initialized');

    // Get the request body with timeout protection
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { userData } = body;

    console.log('🔄 Admin creating user:', {
      phone: userData?.phone ? '***' + userData.phone.slice(-4) : 'missing',
      email: userData?.email || 'none',
      first_name: userData?.first_name || 'missing',
      role: userData?.role || 'user'
    });

    // Validate required fields
    if (!userData?.phone || !userData?.first_name) {
      console.warn('⚠️ Validation failed: missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Phone and first name are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format phone number
    let formattedPhone = userData.phone.trim()
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10 && /^\d+$/.test(formattedPhone)) {
        formattedPhone = `+91${formattedPhone}`
      } else if (formattedPhone.length > 10) {
        formattedPhone = `+${formattedPhone}`
      }
    }

    console.log('📞 Formatted phone:', '***' + formattedPhone.slice(-4));

    // Prepare user data
    const newUserData = {
      phone: formattedPhone,
      email: userData.email?.trim() || null,
      first_name: userData.first_name?.trim(),
      last_name: userData.last_name?.trim() || null,
      role: userData.role || 'user',
      city: userData.city?.trim() || null,
      state: userData.state?.trim() || null,
      address_line1: userData.address_line1?.trim() || null,
      address_line2: userData.address_line2?.trim() || null,
      zip_code: userData.zip_code?.trim() || null,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      phone_verified: userData.phone_verified !== undefined ? userData.phone_verified : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Attempting database insert...');

    // Insert user using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('custom_users')
      .insert([newUserData])
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific error cases
      if (error.code === '23505') {
        let message = 'A user with these details already exists'
        if (error.message.includes('phone')) {
          message = 'A user with this phone number already exists'
        } else if (error.message.includes('email')) {
          message = 'A user with this email already exists'
        }
        
        console.warn('⚠️ Duplicate entry:', message);
        
        return new Response(
          JSON.stringify({ error: message }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to create user',
          code: error.code,
          details: error.details 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const duration = Date.now() - startTime;
    console.log('✅ User created successfully:', {
      user_id: data?.id,
      phone: '***' + formattedPhone.slice(-4),
      duration_ms: duration
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data,
        message: 'User created successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Function error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration
    });
    
    // Determine if this is a timeout or network issue
    const isTimeout = error instanceof Error && 
      (error.name === 'AbortError' || error.message.includes('timeout'));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: isTimeout ? 'timeout' : 'server_error',
        duration_ms: duration
      }),
      { 
        status: isTimeout ? 504 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
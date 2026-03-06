import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-user-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get the request body
    const { userId, userData } = await req.json()

    console.log('🔄 Admin updating user:', userId, userData)

    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          error: 'User ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!userData.phone || !userData.first_name) {
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

    // Prepare user data for update
    const updateData = {
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
      updated_at: new Date().toISOString()
    }

    // Update user using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('custom_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating user:', error)
      
      // Handle specific error cases
      if (error.code === '23505') {
        let message = 'A user with these details already exists'
        if (error.message.includes('phone')) {
          message = 'A user with this phone number already exists'
        } else if (error.message.includes('email')) {
          message = 'A user with this email already exists'
        }
        
        return new Response(
          JSON.stringify({ error: message }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to update user' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User updated successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data,
        message: 'User updated successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
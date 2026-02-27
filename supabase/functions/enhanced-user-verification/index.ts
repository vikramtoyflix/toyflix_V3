import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerificationRequest {
  action: 'verify_otp' | 'complete_signup' | 'fix_verification' | 'get_stats';
  phone?: string;
  otp?: string;
  userId?: string;
  profileData?: {
    firstName: string;
    lastName: string;
    email?: string;
    pincode?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, phone, otp, userId, profileData }: VerificationRequest = await req.json()

    switch (action) {
      case 'verify_otp':
        return await handleOTPVerification(supabase, phone!, otp!)
      
      case 'complete_signup':
        return await handleSignupCompletion(supabase, userId!, profileData!)
      
      case 'fix_verification':
        return await handleVerificationFix(supabase, phone!, userId)
      
      case 'get_stats':
        return await handleGetStats(supabase)
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error: any) {
    console.error('Enhanced verification function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Handle OTP verification with proper phone_verified update
 */
async function handleOTPVerification(supabase: any, phone: string, otp: string) {
  console.log('🔍 Enhanced OTP verification for:', phone)
  
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
  
  // 1. Verify OTP exists and is valid
  const { data: otpRecord, error: otpError } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone_number', formattedPhone)
    .eq('otp_code', otp)
    .eq('is_verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (otpError || !otpRecord) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid or expired OTP' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Mark OTP as verified
  await supabase
    .from('otp_verifications')
    .update({ 
      is_verified: true,
      verified_at: new Date().toISOString()
    })
    .eq('id', otpRecord.id)

  // 3. Find or create user
  let { data: user, error: userError } = await supabase
    .from('custom_users')
    .select('*')
    .eq('phone', formattedPhone)
    .maybeSingle()

  if (userError) {
    console.error('Error finding user:', userError)
    return new Response(
      JSON.stringify({ success: false, error: 'Database error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!user) {
    // Create new user with phone verification
    const { data: newUser, error: createError } = await supabase
      .from('custom_users')
      .insert({
        phone: formattedPhone,
        phone_verified: true, // CRITICAL: Mark as verified immediately
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    user = newUser
    console.log('✅ New user created with phone verification:', user.id)
  } else {
    // Update existing user phone verification
    const { data: updatedUser, error: updateError } = await supabase
      .from('custom_users')
      .update({ 
        phone_verified: true, // CRITICAL: Always update on OTP verification
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user verification:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    user = updatedUser
    console.log('✅ Existing user phone verification updated:', user.id)
  }

  // 4. Check profile completeness
  const isProfileComplete = user.first_name && user.last_name && 
                           user.first_name.trim() && user.last_name.trim()

  return new Response(
    JSON.stringify({
      success: true,
      otpVerified: true,
      phoneVerified: true, // Always true after OTP verification
      profileComplete: isProfileComplete,
      user: {
        id: user.id,
        phone: user.phone,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_verified: user.phone_verified
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handle signup completion with validation
 */
async function handleSignupCompletion(supabase: any, userId: string, profileData: any) {
  console.log('🔍 Enhanced signup completion for user:', userId)

  // Validate required fields
  if (!profileData.firstName || !profileData.lastName) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'First name and last name are required' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update user with complete profile
  const { data: updatedUser, error: updateError } = await supabase
    .from('custom_users')
    .update({
      first_name: profileData.firstName.trim(),
      last_name: profileData.lastName.trim(),
      email: profileData.email?.trim() || null,
      zip_code: profileData.pincode?.trim() || null,
      phone_verified: true, // Ensure verification is maintained
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error completing signup:', updateError)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to complete signup' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('✅ Signup completed successfully:', updatedUser.id)

  return new Response(
    JSON.stringify({
      success: true,
      profileComplete: true,
      user: updatedUser
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Fix verification issues for existing users
 */
async function handleVerificationFix(supabase: any, phone: string, userId?: string) {
  console.log('🔧 Fixing verification for:', phone)

  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`

  // Check if OTP was verified for this phone
  const { data: otpRecord } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone_number', formattedPhone)
    .eq('is_verified', true)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otpRecord) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'No verified OTP found for this phone' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update user verification
  const updateQuery = userId 
    ? supabase.from('custom_users').update({ phone_verified: true }).eq('id', userId)
    : supabase.from('custom_users').update({ phone_verified: true }).eq('phone', formattedPhone)

  const { data: updatedUser, error: updateError } = await updateQuery.select().single()

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fix verification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      fixed: true,
      user: updatedUser
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Get signup funnel statistics
 */
async function handleGetStats(supabase: any) {
  const { data: stats, error } = await supabase
    .from('custom_users')
    .select('phone_verified, first_name, last_name, is_active, created_at')

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to get stats' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const total = stats.length
  const phoneVerified = stats.filter(u => u.phone_verified).length
  const profileComplete = stats.filter(u => u.first_name && u.last_name).length
  const adminVisible = stats.filter(u => u.phone_verified && u.first_name && u.is_active).length

  return new Response(
    JSON.stringify({
      success: true,
      stats: {
        total_signups: total,
        phone_verified: phoneVerified,
        phone_verified_rate: Math.round((phoneVerified / total) * 100),
        profile_complete: profileComplete,
        profile_complete_rate: Math.round((profileComplete / total) * 100),
        admin_visible: adminVisible,
        admin_visible_rate: Math.round((adminVisible / total) * 100)
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

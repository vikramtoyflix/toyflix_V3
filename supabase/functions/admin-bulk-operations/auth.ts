
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function validateCustomSession(token: string, supabaseAdmin: any): Promise<AuthResult> {
  console.log('🔐 Validating custom session token...')
  
  try {
    // Query the user_sessions table to validate the token
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('user_id, expires_at, is_active')
      .eq('session_token', token)
      .eq('is_active', true)
      .single()

    if (sessionError || !sessionData) {
      console.error('❌ Session validation failed:', sessionError)
      return { success: false, error: 'Invalid session token' }
    }

    // Check if session is expired
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    
    if (expiresAt <= now) {
      console.error('❌ Session expired:', { expiresAt, now })
      return { success: false, error: 'Session expired' }
    }

    console.log('✅ Session validated successfully for user:', sessionData.user_id)
    return { success: true, userId: sessionData.user_id }

  } catch (error) {
    console.error('❌ Error validating session:', error)
    return { success: false, error: 'Session validation error' }
  }
}

export async function checkAdminRole(userId: string, supabaseAdmin: any): Promise<{ isAdmin: boolean; error?: string }> {
  console.log('👑 Checking admin role for user:', userId)
  
  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ User lookup failed:', userError)
      return { isAdmin: false, error: 'User not found' }
    }

    const isAdmin = userData.role === 'admin'
    console.log(`${isAdmin ? '✅' : '❌'} Admin check result:`, { userId, role: userData.role, isAdmin })
    
    return { isAdmin, error: isAdmin ? undefined : 'Admin privileges required' }

  } catch (error) {
    console.error('❌ Error checking admin role:', error)
    return { isAdmin: false, error: 'Admin role check error' }
  }
}

export async function authenticateAndAuthorize(authHeader: string | null, supabaseAdmin: any): Promise<AuthResult> {
  console.log('🚀 Starting authentication and authorization...')
  
  if (!authHeader) {
    console.error('❌ No authorization header provided')
    return { success: false, error: 'Authorization header required' }
  }

  const token = authHeader.replace('Bearer ', '')
  console.log('🔑 Token extracted, length:', token.length)
  
  // Validate custom session
  const { success: sessionValid, userId, error: authError } = await validateCustomSession(token, supabaseAdmin)
  
  if (!sessionValid || !userId) {
    console.error('❌ Authentication failed:', authError)
    return { success: false, error: authError || 'Invalid authentication token' }
  }

  console.log('✅ User authenticated:', userId)

  // Check if user is admin
  const { isAdmin, error: roleError } = await checkAdminRole(userId, supabaseAdmin)

  if (roleError || !isAdmin) {
    console.error('❌ Admin check failed:', roleError)
    return { success: false, error: roleError || 'Admin privileges required' }
  }

  console.log('✅ Admin privileges verified')
  return { success: true, userId }
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function validateCustomSession(token: string, supabaseAdmin: any): Promise<AuthResult> {
  console.log('🔐 Validating custom session token...')
  console.log('🔑 Token length:', token.length)
  console.log('🔑 Token type:', typeof token)
  
  try {
    // Query the user_sessions table to validate the token
    console.log('📊 Querying user_sessions table...')
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('user_id, expires_at, is_active')
      .eq('session_token', token)
      .eq('is_active', true)
      .single()

    console.log('📊 Session query result:')
    console.log('  - Error:', sessionError)
    console.log('  - Data exists:', !!sessionData)
    console.log('  - User ID:', sessionData?.user_id)

    if (sessionError || !sessionData) {
      console.error('❌ Session validation failed:', sessionError)
      return { success: false, error: 'Invalid session token' }
    }

    // Check if session is expired
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    
    console.log('⏰ Time check:')
    console.log('  - Current time:', now.toISOString())
    console.log('  - Expires at:', expiresAt.toISOString())
    console.log('  - Is expired:', expiresAt <= now)
    
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

    console.log('👑 User role query result:')
    console.log('  - Error:', userError)
    console.log('  - Data exists:', !!userData)
    console.log('  - Role:', userData?.role)

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
  console.log('🔑 Token type:', typeof token)
  
  // Use custom session validation (UUID tokens)
  const { success: tokenValid, userId, error: authError } = await validateCustomSession(token, supabaseAdmin)
  
  if (!tokenValid || !userId) {
    console.error('❌ Custom session authentication failed:', authError)
    return { success: false, error: authError || 'Authentication failed' }
  }

  console.log('✅ Custom session authentication successful:', userId)

  // Check admin role
  const { isAdmin, error: roleError } = await checkAdminRole(userId, supabaseAdmin)

  if (roleError || !isAdmin) {
    console.error('❌ Admin check failed:', roleError)
    return { success: false, error: roleError || 'Admin privileges required' }
  }

  console.log('✅ Admin privileges verified')
  return { success: true, userId }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Delete user request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

    // Get environment variables
    console.log('🔧 Initializing Supabase admin client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey
      })
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('✅ Supabase admin client initialized')

    // Get the request body
    const { userIds } = await req.json()

    console.log('🗑️ Admin deleting users:', { count: userIds?.length })

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.warn('⚠️ Validation failed: missing or invalid userIds')
      return new Response(
        JSON.stringify({ 
          error: 'User IDs array is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete users using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('custom_users')
      .delete()
      .in('id', userIds)
      .select()

    if (error) {
      console.error('❌ Error deleting users:', error)
      
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to delete users',
          code: error.code 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Users deleted successfully:', {
      count: data?.length || 0,
      user_ids: data?.map(u => u.id) || []
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: data?.length || 0,
        deletedUsers: data,
        message: `Successfully deleted ${data?.length || 0} user(s)` 
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
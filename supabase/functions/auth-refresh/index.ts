
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface RefreshRequest {
  refresh_token: string;
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

    const { refresh_token }: RefreshRequest = await req.json();

    console.log('Token refresh request');

    // Find active session with refresh token
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active, role
        )
      `)
      .eq('refresh_token', refresh_token)
      .eq('is_active', true)
      .gt('refresh_expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired refresh token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is still active
    if (!session.custom_users.is_active) {
      return new Response(
        JSON.stringify({ error: 'User account is inactive' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate new session tokens
    const newSessionToken = crypto.randomUUID();
    const newRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update session
    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        session_token: newSessionToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        last_used: new Date().toISOString()
      })
      .eq('id', session.id);

    if (updateError) {
      throw new Error('Failed to update session');
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: session.custom_users,
        session: {
          access_token: newSessionToken,
          refresh_token: newRefreshToken,
          expires_at: expiresAt.toISOString(),
          token_type: 'bearer'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);

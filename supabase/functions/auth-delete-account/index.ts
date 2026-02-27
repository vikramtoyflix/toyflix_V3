import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface DeleteAccountRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId }: DeleteAccountRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing user ID.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    // Delete user sessions first
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessionError) {
      console.error('Error deleting user sessions:', sessionError);
    }

    // Delete user record
    const { error: userError } = await supabaseAdmin
      .from('custom_users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('Error deleting user:', userError);
      throw new Error('Failed to delete user account');
    }
    
    console.log(`User account deleted successfully: ${userId}`);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete Account Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler); 
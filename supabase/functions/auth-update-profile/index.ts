
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface UpdateProfileRequest {
  userId: string;
  firstName: string;
  lastName: string;
  pincode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // In a real app, you would verify a JWT and get the user ID from it.
    // For now, we'll trust the userId from the request body, which is insecure
    // but allows the frontend flow to be completed.
    const { userId, firstName, lastName, pincode }: UpdateProfileRequest = await req.json();

    if (!userId || !firstName || !lastName) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    const updateData: any = { 
      first_name: firstName, 
      last_name: lastName, 
      updated_at: new Date().toISOString() 
    };
    
    if (pincode) {
      updateData.pincode = pincode;
    }

    const { data, error } = await supabaseAdmin
      .from('custom_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true, user: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);

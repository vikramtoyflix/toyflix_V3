import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminUserId = req.headers.get("x-admin-user-id");
    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: "Admin user ID required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminUser } = await supabaseAdmin
      .from("custom_users")
      .select("role")
      .eq("id", adminUserId)
      .single();

    if (!adminUser || adminUser.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const toyId = body.toyId ?? body.toy_id;
    const images: string[] = Array.isArray(body.images) ? body.images : [];
    const primaryImageIndex = typeof body.primaryImageIndex === "number" ? body.primaryImageIndex : 0;

    if (!toyId || typeof toyId !== "string") {
      return new Response(
        JSON.stringify({ error: "toyId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("toy_images")
      .delete()
      .eq("toy_id", toyId);

    if (deleteError) {
      console.warn("admin-save-toy-images delete warning:", deleteError);
    }

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ deleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageInserts = images.map((imageUrl: string, index: number) => ({
      toy_id: toyId,
      image_url: imageUrl,
      display_order: index,
      is_primary: index === primaryImageIndex,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from("toy_images")
      .insert(imageInserts)
      .select();

    if (error) {
      console.error("admin-save-toy-images insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-save-toy-images error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

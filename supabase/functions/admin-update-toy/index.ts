import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_FIELDS = [
  "name", "description", "category", "subscription_category", "age_range",
  "brand", "retail_price", "rental_price", "total_quantity", "available_quantity",
  "image_url", "is_featured", "updated_at"
];

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
    const id = body.id;
    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Toy id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of ALLOWED_FIELDS) {
      if (field === "updated_at") continue;
      if (body[field] !== undefined) cleanData[field] = body[field];
    }
    if (body.subscription_category === undefined && body.category) {
      cleanData.subscription_category = body.category;
    }

    const { data, error } = await supabaseAdmin
      .from("toys")
      .update(cleanData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("admin-update-toy error:", error);
      return new Response(
        JSON.stringify({ error: error.message, code: error.code, details: error.details }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-update-toy error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

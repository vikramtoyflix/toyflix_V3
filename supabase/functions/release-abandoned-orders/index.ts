import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Release abandoned pending orders: payment_status=pending, created_at > 25 mins ago.
 * Sets status to 'cancelled' so handle_inventory_return trigger restores inventory. */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const cutoff = new Date(Date.now() - 25 * 60 * 1000).toISOString();

    const { data: pending, error: fetchErr } = await supabaseClient
      .from("rental_orders")
      .select("id, order_number, razorpay_order_id, created_at")
      .eq("payment_status", "pending")
      .lt("created_at", cutoff);

    if (fetchErr) {
      console.error("❌ Failed to fetch pending orders:", fetchErr.message);
      return new Response(
        JSON.stringify({ success: false, error: fetchErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const ids = (pending || []).map((r) => r.id);
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ success: true, released: 0, message: "No abandoned orders to release" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { error: updateErr } = await supabaseClient
      .from("rental_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", ids)
      .eq("payment_status", "pending");

    if (updateErr) {
      console.error("❌ Failed to cancel abandoned orders:", updateErr.message);
      return new Response(
        JSON.stringify({ success: false, error: updateErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Released abandoned orders:", ids.length, ids);
    return new Response(
      JSON.stringify({
        success: true,
        released: ids.length,
        order_ids: ids,
        message: `Released ${ids.length} abandoned order(s); inventory restored via trigger`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    console.error("❌ release-abandoned-orders error:", e?.message);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

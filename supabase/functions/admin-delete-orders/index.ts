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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminUserId = req.headers.get("x-admin-user-id");
    if (!adminUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin user ID required" }),
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
        JSON.stringify({ success: false, error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderIds, isQueueOrders } = body as { orderIds: string[]; isQueueOrders?: boolean[] };

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "orderIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // isQueueOrders: optional array matching orderIds - true = queue_orders, false = rental_orders
    const queueFlags = Array.isArray(isQueueOrders) && isQueueOrders.length === orderIds.length
      ? isQueueOrders
      : orderIds.map(() => false); // default to rental_orders if not specified

    let deletedRental = 0;
    let deletedQueue = 0;
    const errors: string[] = [];

    for (let i = 0; i < orderIds.length; i++) {
      const id = orderIds[i];
      const isQueue = queueFlags[i];

      try {
        if (isQueue) {
          const { error } = await supabaseAdmin
            .from("queue_orders")
            .delete()
            .eq("id", id);

          if (error) {
            errors.push(`Queue order ${id}: ${error.message}`);
          } else {
            deletedQueue++;
          }
        } else {
          const { error } = await supabaseAdmin
            .from("rental_orders")
            .delete()
            .eq("id", id);

          if (error) {
            errors.push(`Rental order ${id}: ${error.message}`);
          } else {
            deletedRental++;
          }
        }
      } catch (e) {
        errors.push(`${id}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    const totalDeleted = deletedRental + deletedQueue;
    const success = errors.length === 0;

    return new Response(
      JSON.stringify({
        success,
        deletedRental,
        deletedQueue,
        totalDeleted,
        errors: errors.length ? errors : undefined,
        message: success
          ? `Deleted ${totalDeleted} order(s)`
          : `Deleted ${totalDeleted}, ${errors.length} failed`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-delete-orders error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

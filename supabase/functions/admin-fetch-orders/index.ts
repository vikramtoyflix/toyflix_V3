import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // CORS preflight – must return 2xx so browser passes access control
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin: require X-Admin-User-Id header from logged-in admin
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

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const filters = body.filters || {};
    const BATCH_SIZE = 1000;

    // Fetch rental_orders
    let rentalQuery = supabaseAdmin
      .from("rental_orders")
      .select("id, order_number, user_id, status, total_amount, created_at, rental_start_date, rental_end_date, order_type, payment_status, user_phone, subscription_plan, coupon_code, discount_amount, toys_data");

    if (filters.orderNumber) rentalQuery = rentalQuery.ilike("order_number", `%${filters.orderNumber}%`);
    if (filters.customerPhone) rentalQuery = rentalQuery.ilike("user_phone", `%${filters.customerPhone}%`);
    if (filters.statuses?.length) rentalQuery = rentalQuery.in("status", filters.statuses);
    if (filters.paymentStatuses?.length) rentalQuery = rentalQuery.in("payment_status", filters.paymentStatuses);
    if (filters.subscriptionPlans?.length) rentalQuery = rentalQuery.in("subscription_plan", filters.subscriptionPlans);
    if (filters.orderTypes?.length) rentalQuery = rentalQuery.in("order_type", filters.orderTypes);
    if (filters.dateFrom) rentalQuery = rentalQuery.gte("created_at", filters.dateFrom);
    if (filters.dateTo) rentalQuery = rentalQuery.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
    if (filters.userIds?.length) rentalQuery = rentalQuery.in("user_id", filters.userIds);

    const sortAsc = filters.sortDirection === "asc";
    let allRental: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await rentalQuery
        .order("created_at", { ascending: sortAsc })
        .range(offset, offset + BATCH_SIZE - 1);
      if (error) throw error;
      if (!batch?.length) break;
      allRental = allRental.concat(batch);
      hasMore = batch.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    // Fetch queue_orders
    let queueQuery = supabaseAdmin
      .from("queue_orders")
      .select("id, order_number, user_id, status, total_amount, created_at, estimated_delivery_date, queue_order_type, queue_cycle_number, payment_status, current_plan_id, selected_toys, delivery_address, applied_coupon, coupon_discount");

    if (filters.orderNumber) queueQuery = queueQuery.ilike("order_number", `%${filters.orderNumber}%`);
    if (filters.statuses?.length) queueQuery = queueQuery.in("status", filters.statuses);
    if (filters.paymentStatuses?.length) queueQuery = queueQuery.in("payment_status", filters.paymentStatuses);
    if (filters.dateFrom) queueQuery = queueQuery.gte("created_at", filters.dateFrom);
    if (filters.dateTo) queueQuery = queueQuery.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
    if (filters.userIds?.length) queueQuery = queueQuery.in("user_id", filters.userIds);

    allRental = allRental.map((r) => ({ ...r, isQueueOrder: false }));
    let allQueue: any[] = [];
    offset = 0;
    hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await queueQuery
        .order("created_at", { ascending: sortAsc })
        .range(offset, offset + BATCH_SIZE - 1);
      if (error) throw error;
      if (!batch?.length) break;
      allQueue = allQueue.concat(batch.map((q) => ({ ...q, isQueueOrder: true })));
      hasMore = batch.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    const allOrders = [...allRental, ...allQueue];
    const userIds = [...new Set(allOrders.map((o) => o.user_id).filter(Boolean))];

    let users: any[] = [];
    if (userIds.length > 0) {
      for (let i = 0; i < userIds.length; i += 100) {
        const batch = userIds.slice(i, i + 100);
        const { data: userBatch } = await supabaseAdmin
          .from("custom_users")
          .select("id, email, first_name, last_name, phone, subscription_plan")
          .in("id", batch);
        if (userBatch) users = users.concat(userBatch);
      }
    }

    return new Response(
      JSON.stringify({ rentalOrders: allRental, queueOrders: allQueue, users }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-fetch-orders error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

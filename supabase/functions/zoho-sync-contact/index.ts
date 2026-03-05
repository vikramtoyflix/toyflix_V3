/**
 * Zoho Marketing / CRM sync for Toy Joy Box Club
 *
 * Syncs signed-up and subscribed customers to Zoho Contacts and tags them
 * for cart abandonment and lifecycle journeys in Zoho Marketing:
 * - Sign up (no subscription yet)
 * - Trial (Discovery Delight)
 * - Silver plan
 * - Gold plan
 *
 * Env: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
 *      ZOHO_ACCOUNTS_DOMAIN (optional, default zoho.in),
 *      ZOHO_CAMPAIGNS_ACCESS_TOKEN (optional, for tagging in Campaigns)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export type ZohoContactTag = "Sign up" | "Trial" | "Silver plan" | "Gold plan";

interface ZohoSyncPayload {
  userId?: string;
  tag: ZohoContactTag;
}

interface CustomUserRow {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  zip_code?: string | null;
  pincode?: string | null;
}

async function getZohoAccessToken(): Promise<string> {
  const clientId = Deno.env.get("ZOHO_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET");
  const refreshToken = Deno.env.get("ZOHO_REFRESH_TOKEN");
  const domain = Deno.env.get("ZOHO_ACCOUNTS_DOMAIN") || "zoho.in";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Zoho OAuth not configured (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)");
  }

  const url = `https://accounts.${domain}/oauth/v2/token`;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("Zoho response missing access_token");
  return data.access_token;
}

async function upsertZohoCrmContact(
  accessToken: string,
  user: CustomUserRow,
  tag: ZohoContactTag,
  domain: string
): Promise<void> {
  const baseUrl = domain === "zoho.com" ? "https://www.zohoapis.com" : "https://www.zohoapis.in";
  const email = (user.email && user.email.trim()) || `phone-${(user.phone || "").replace(/\D/g, "")}@toyjoybox.placeholder`;
  const lastName = (user.last_name && user.last_name.trim()) || "Customer";
  const firstName = (user.first_name && user.first_name.trim()) || "";

  const record: Record<string, string> = {
    Last_Name: lastName,
    First_Name: firstName,
    Email: email,
    Lead_Source: `Website - ${tag}`,
  };
  if (user.phone) record.Mobile = user.phone;
  const zip = user.zip_code || user.pincode;
  if (zip) record.Mailing_Zip = String(zip);

  const res = await fetch(`${baseUrl}/crm/v2/Contacts/upsert`, {
    method: "POST",
    headers: {
      "Authorization": `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [record],
      duplicate_check_fields: ["Email"],
      trigger: ["workflow", "blueprint"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho CRM upsert failed: ${res.status} ${text}`);
  }
}

async function associateZohoCampaignsTag(
  email: string,
  tag: ZohoContactTag
): Promise<void> {
  const token = Deno.env.get("ZOHO_CAMPAIGNS_ACCESS_TOKEN");
  if (!token || !email || email.includes("@toyjoybox.placeholder")) return;

  const url = `https://campaigns.zoho.com/api/v1.1/tag/associate?resfmt=JSON&tagName=${encodeURIComponent(tag)}&lead_email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    console.warn("Zoho Campaigns tag associate failed (non-fatal):", res.status, await res.text());
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as ZohoSyncPayload;
    let userId: string | undefined = payload.userId;
    const tag = payload.tag;
    if (!tag) {
      return new Response(
        JSON.stringify({ error: "Missing tag" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!userId && tag === "Sign up") {
      const authHeader = req.headers.get("Authorization");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (authHeader?.startsWith("Bearer ") && anonKey) {
        const token = authHeader.slice(7);
        const authClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user: authUser } } = await authClient.auth.getUser(token);
        if (authUser?.id) userId = authUser.id;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId (or valid Bearer token for Sign up tag)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: user, error: userError } = await supabase
      .from("custom_users")
      .select("id, email, phone, first_name, last_name, zip_code, pincode")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found", detail: userError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = Deno.env.get("ZOHO_ACCOUNTS_DOMAIN") || "zoho.in";
    const accessToken = await getZohoAccessToken();
    await upsertZohoCrmContact(accessToken, user as CustomUserRow, tag, domain);

    const email = (user as CustomUserRow).email?.trim();
    if (email && !email.includes("@toyjoybox.placeholder")) {
      await associateZohoCampaignsTag(email, tag);
    }

    return new Response(
      JSON.stringify({ success: true, tag, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Zoho sync error:", message);
    return new Response(
      JSON.stringify({ error: "Zoho sync failed", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

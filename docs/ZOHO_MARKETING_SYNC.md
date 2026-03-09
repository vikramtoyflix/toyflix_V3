# Zoho Marketing / CRM Sync

Signed-up and subscribed customers are synced to **Zoho CRM Contacts** and tagged for **Zoho Marketing** (e.g. cart abandonment and lifecycle journeys).

## Tags

| Stage | Zoho tag / Lead Source |
|--------|-------------------------|
| Just signed up (no subscription) | **Sign up** |
| Trial (Discovery Delight / monthly) | **Trial** |
| Silver plan (Silver Pack) | **Silver plan** |
| Gold plan (Gold Pack PRO) | **Gold plan** |

## Flow

1. **Sign up**  
   When a user signs up (new user created), they are synced to Zoho with tag **Sign up** and Lead Source `Website - Sign up`.  
   - Triggered from: `auth-signup` Edge Function (when a **new** user is created).

2. **Subscription**  
   When a user completes payment and gets a plan, they are synced with the plan tag.  
   - Triggered from: `razorpay-verify` Edge Function after updating `custom_users.subscription_active` and `subscription_plan`.

## Zoho setup

### 1. Zoho CRM (Contacts)

- Contacts are **upserted** by **Email** (or a placeholder email when only phone is present).
- Standard fields used: `First_Name`, `Last_Name`, `Email`, `Mobile`, `Lead_Source`, `Mailing_Zip`.
- `Lead_Source` is set to `Website - Sign up`, `Website - Trial`, `Website - Silver plan`, or `Website - Gold plan`.  
  If your CRM uses a different field or picklist, add a custom field or adjust the function.

### 2. Zoho Marketing (Campaigns) – optional

- If **ZOHO_CAMPAIGNS_ACCESS_TOKEN** is set, the same tag (Sign up / Trial / Silver plan / Gold plan) is associated with the contact in Zoho Campaigns by email.
- Use these tags in Zoho Marketing to build **cart abandonment** and other journeys.

### 3. OAuth (CRM)

Use OAuth 2.0 with a **refresh token** so the Edge Function can get access tokens.

1. In [Zoho API Console](https://api-console.zoho.in/) (or `.zoho.com` for non-India), create a **Server-based Application**.
2. Scopes: include **Zoho CRM** (e.g. `ZohoCRM.modules.contacts.ALL` or `ZohoCRM.modules.contacts.CREATE`, `ZohoCRM.modules.contacts.UPDATE`).
3. Generate a **refresh token** (one-time; use the OAuth “Generate token” flow with the chosen scopes).
4. Store the **Client ID**, **Client Secret**, and **Refresh token** in your environment (see below).

For **Zoho Campaigns** tagging, use either:

- The same Zoho account and add Campaigns scopes to the same app and refresh token, or  
- A separate Campaigns OAuth app and set **ZOHO_CAMPAIGNS_ACCESS_TOKEN** (access token) in the environment.  
  (Campaigns access tokens expire; refresh as needed or use a server that refreshes and updates the secret.)

## Environment variables

Set these in **Supabase** → **Project settings** → **Edge Functions** → **Secrets** (or your deployment env):

| Variable | Required | Description |
|----------|----------|-------------|
| `ZOHO_CLIENT_ID` | Yes (for CRM) | Zoho OAuth Client ID |
| `ZOHO_CLIENT_SECRET` | Yes (for CRM) | Zoho OAuth Client Secret |
| `ZOHO_REFRESH_TOKEN` | Yes (for CRM) | Zoho OAuth Refresh token (CRM scopes) |
| `ZOHO_ACCOUNTS_DOMAIN` | No | `zoho.in` (India) or `zoho.com` (global). Default: `zoho.in` |
| `ZOHO_CAMPAIGNS_ACCESS_TOKEN` | No | Access token for Zoho Campaigns (for tagging). Optional. |
| `SUPABASE_ANON_KEY` | No | Only if you want client-triggered “Sign up” sync with user JWT (see below). |

## Cart abandonment in Zoho Marketing

1. In Zoho Marketing (Campaigns), create a **list** or use an existing one that receives website contacts.
2. Create **tags**: e.g. `Sign up`, `Trial`, `Silver plan`, `Gold plan` (same names as above).
3. Build a **journey** that:
   - Starts when a contact has tag **Sign up** (and optionally no subscription).
   - Sends cart abandonment / nurture emails and, when they convert, you can update them to Trial / Silver / Gold (handled by this sync when they pay).

Contacts are updated on subscription, so the same contact can move from “Sign up” to “Trial” or “Silver plan” / “Gold plan” after payment.

## Client-side sign up (optional)

If signup is done **only** on the client (e.g. direct insert into `custom_users` without calling the `auth-signup` Edge Function), Zoho will not get the “Sign up” event unless you:

- Prefer having the app call the **auth-signup** Edge Function for signup (recommended), so “Sign up” is always synced, or  
- Call the **zoho-sync-contact** Edge Function from the client **after** signup with body `{ "tag": "Sign up" }` and header `Authorization: Bearer <user_jwt>`.  
  For this, the function resolves the user from the JWT. You must set **SUPABASE_ANON_KEY** in the function’s environment and use Supabase Auth (not only custom session) for that user.

## Edge Function

- **Name:** `zoho-sync-contact`
- **Invocation:**  
  - **Server-side:** `auth-signup` and `razorpay-verify` call it with `{ userId, tag }`.  
  - **Client-side (optional):** POST with `{ tag: "Sign up" }` and `Authorization: Bearer <user_jwt>`.

Sync is **fire-and-forget** from signup and payment so that failures in Zoho do not block signup or payment.

---

## How to deploy (Supabase Edge Functions)

### 1. Install Supabase CLI (if needed)

```bash
npm install -g supabase
```

Or use without installing: `npx supabase <command>`.

### 2. Log in and link the project

```bash
supabase login
supabase link --project-ref wucwpyitzqjukcphczhr
```

Use the **Project ref** from [Supabase Dashboard](https://supabase.com/dashboard) → your project → Settings → General if different.

### 3. Set secrets (Zoho + domain)

Set these in Supabase so the functions can call Zoho:

```bash
supabase secrets set ZOHO_CLIENT_ID="your_client_id"
supabase secrets set ZOHO_CLIENT_SECRET="your_client_secret"
supabase secrets set ZOHO_REFRESH_TOKEN="your_refresh_token"
supabase secrets set ZOHO_ACCOUNTS_DOMAIN="zoho.in"
```

Optional (for Zoho Campaigns tagging):

```bash
supabase secrets set ZOHO_CAMPAIGNS_ACCESS_TOKEN="your_campaigns_token"
```

You can also set secrets in the dashboard: **Project Settings → Edge Functions → Secrets**.

### 4. Deploy the functions

Deploy the Zoho sync and the functions that call it:

```bash
supabase functions deploy zoho-sync-contact
supabase functions deploy auth-signup
supabase functions deploy razorpay-verify
```

Or deploy all Edge Functions in the project:

```bash
supabase functions deploy
```

### 5. Verify

- Do a **new signup** on your site and check **Zoho CRM → Contacts** for a contact with Lead Source `Website - Sign up`.
- Complete a **subscription payment** and confirm the contact’s Lead Source updates to `Website - Trial` / `Silver plan` / `Gold plan`.

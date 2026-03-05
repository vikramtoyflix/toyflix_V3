# Exact steps: Fix OTP “Cannot reach server” / “Failed to fetch”

Use these in order. Your app is at **https://www.toyflix.in**; the OTP function is **send-otp** (and optionally **check-user-status**).

---

## "Invalid JWT" when sending OTP

If the app shows **Invalid JWT** (or the request reaches the server but is rejected), the Edge Function gateway is rejecting the Bearer token. Fix:

1. **Recommended:** Set `verify_jwt = false` for the OTP functions so unauthenticated users can request OTP. This repo’s `supabase/config.toml` already has:
   - `[functions.send-otp]` and `[functions.check-user-status]` with `verify_jwt = false`.
2. **Redeploy** the functions so the config is applied:
   ```bash
   npx supabase functions deploy send-otp
   npx supabase functions deploy check-user-status
   ```
3. Alternatively, ensure the **production** app has the correct `VITE_SUPABASE_ANON_KEY` (Azure Static Web Apps → Configuration → Application settings) so the client sends a valid anon key for this project.

---

## OTP first (priority order)

1. **Backend (Supabase)** – Do these first so OTP can work:
   - Resolve **EXCEEDING USAGE LIMITS** (Step 1 below) so Edge Functions are not blocked.
   - **Redeploy** `send-otp` and `check-user-status` (Step 3 below).
2. **Frontend** – Already deployed: 2Factor-only flow, no WooCommerce, clearer errors. No extra deploy needed for OTP.
3. **Verify** – On https://www.toyflix.in, send OTP and check Network tab + Console for `[sendOTP] request failed:` if it still fails.

---

## 1. Resolve Supabase “EXCEEDING USAGE LIMITS”

When the project is over limit, Supabase can return 429/503 **without CORS headers**, so the browser only shows “Failed to fetch”.

1. Go to **https://supabase.com/dashboard** and sign in.
2. Select the **organization** that owns the project (e.g. your team/account).
3. Open **Billing** or **Usage**:
   - **Left sidebar** → **Organization Settings** (gear) → **Billing**, or  
   - Direct: **https://supabase.com/dashboard/org/_/billing** (replace `_` with your org slug if needed).
4. On the **Usage** / **Billing** page:
   - See which quota is over (e.g. **Edge Function invocations**, **Database**, **Egress**).
   - **Option A – Upgrade:** Change plan so limits are higher.
   - **Option B – Stay on plan:** If “Spend cap” is on, wait for the next billing cycle or reduce usage (e.g. fewer function calls, less egress) until you’re under the cap.
5. Wait a few minutes after usage is back under limit, then try OTP again.

---

## 2. CORS / “allowed origins” (no dashboard setting)

Supabase **does not** have a dashboard setting for “allowed origins” for Edge Functions. CORS is **only** what your function returns in its response.

- Your **send-otp** (and **check-user-status**) code already sends CORS headers and handles `OPTIONS`.
- So you don’t need to “allow” `https://www.toyflix.in` in the dashboard; you only need to **deploy** the version that has CORS (step 3).

If you ever change the function and remove CORS, that would cause “Failed to fetch” from the browser.

---

## 3. Redeploy send-otp (and check-user-status) — do this for OTP fix first

Deploy so production uses the same CORS/OPTIONS logic as in your repo. Run from repo root:

```bash
cd /Users/vikrama.m/Documents/toy-joy-box-club-main

# One-time: log in (opens browser)
npx supabase login

# One-time: link project (ref from dashboard URL)
npx supabase link --project-ref wucwpyitzqjukcphczhr

# OTP fix: deploy these two functions
npx supabase functions deploy send-otp
npx supabase functions deploy check-user-status
```

Then in Supabase dashboard: **Edge Functions** → **send-otp** → **Invocations** / **Logs**. Trigger OTP from https://www.toyflix.in and confirm you see **OPTIONS** and **POST** with status **200**.

---

## 4. If you still see “Failed to fetch”

Do these checks in order.

### 4.1 Browser Network tab (exact failure)

1. Open **https://www.toyflix.in**.
2. Open DevTools → **Network** tab.
3. Trigger **Send OTP** (enter phone, click send).
4. Find the request to `.../functions/v1/send-otp`:
   - If you see **two** requests (one **OPTIONS**, one **POST**):
     - Click **OPTIONS**. If status is **0** or red, the preflight is failing (CORS or gateway).
     - Click **POST**. If status is **429** or **503**, it’s limits; if **0**, often CORS/network.
   - If you see **no** request to `send-otp`, the frontend might be calling the wrong URL or failing before fetch (check console for `[sendOTP] request failed:`).
5. In **Console**, check for the log we added: `[sendOTP] request failed: ...` — the second part (e.g. `TypeError`, `Failed to fetch`) helps confirm it’s a network/CORS issue.

### 4.2 Supabase dashboard – function and logs

1. **Edge Functions** → **send-otp** → **Logs**.
   - If there are **no** log lines when you tap “Send OTP”, the request is **not** reaching the function (blocked by limits, CORS, or network before Supabase).
2. **Edge Functions** → **send-otp** → **Invocations** (or **Overview**).
   - Check if recent invocations show **200** or **4xx/5xx**. If you see **429/503**, go back to step 1 (usage limits).

### 4.3 URL and env (frontend)

1. In the repo, confirm the frontend uses the same Supabase URL as the project:
   - `.env` or `.env.production`: `VITE_SUPABASE_URL=https://wucwpyitzqjukcphczhr.supabase.co` (or your real project URL).
2. OTP is sent to: `{VITE_SUPABASE_URL}/functions/v1/send-otp`. If the project ref in the URL is wrong, the request goes to the wrong project and can fail or hit limits of another project.

### 4.4 Quick test from same origin (optional)

To rule out CORS:

1. Open **https://supabase.com/dashboard** → your project → **Edge Functions** → **send-otp** → **Test** (or “Run”).
2. Send a test request with body `{"phone": "+91XXXXXXXXXX"}`.
3. If that returns **200** but the browser from https://www.toyflix.in still shows “Failed to fetch”, the problem is almost certainly **CORS** or **gateway/limits** affecting browser requests (e.g. OPTIONS or POST not getting CORS headers).

---

## Summary checklist

- [ ] **Step 1:** Billing/Usage in Supabase dashboard – resolve “EXCEEDING USAGE LIMITS” (upgrade or reduce usage).
- [ ] **Step 2:** No CORS “allowed origins” to set in dashboard; CORS is in the function code.
- [ ] **Step 3:** Run `npx supabase functions deploy send-otp` (and optionally `check-user-status`) from repo root.
- [ ] **Step 4:** If still failing: check Network (OPTIONS + POST status), Function Logs/Invocations, and `VITE_SUPABASE_URL`; use dashboard “Test” to confirm the function itself works.

After step 1 and 3, retry OTP on https://www.toyflix.in and check the console for `[sendOTP] request failed:` only if it still fails.

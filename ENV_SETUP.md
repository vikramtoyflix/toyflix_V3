# Where to set secrets (Supabase, Razorpay)

Secrets are **no longer in the code** so the repo is safe to push. Set them where needed.

**Note:** Freshworks/WhatsApp integration has been removed from the app. The following only covers what the app uses now.

---

## 1. Azure Static Web App (production site)

1. Azure Portal → your **Static Web App** → **Settings** → **Configuration**.
2. Under **Application settings**, add:

| Name | Where to get the value |
|------|------------------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_RAZORPAY_KEY_ID` | Razorpay key ID (for checkout UI) |

Save. Redeploy if needed.

---

## 2. Local development (.env file)

In the project root create (or edit) **.env** (see `.env.example` for full list). At minimum:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

**.env is gitignored** — never commit real values.

---

## 3. Supabase Edge Functions (razorpay-order, razorpay-verify)

In **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**, set:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (usually set by default)

---

## 4. Cursor MCP (optional, local only)

**.cursor/mcp.json** is gitignored. Your local file with the Supabase access token stays only on your machine and is used by Cursor. No action needed for GitHub or Azure.

---

**Summary:** The app uses Supabase and Razorpay only. Set the variables above in Azure, .env locally, and in Supabase for Edge Functions as needed.

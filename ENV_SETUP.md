# Where to set secrets (Facebook, Supabase, Freshworks)

Secrets are **no longer in the code** so the repo is safe to push. Set them here so the app still works.

---

## 1. Azure Static Web App (production site)

1. Azure Portal → your **Static Web App** → **Settings** → **Configuration**.
2. Under **Application settings**, add these (name + value):

| Name | Where to get the value |
|------|------------------------|
| `VITE_FRESHWORKS_DOMAIN` | Your Freshworks URL, e.g. `https://toyflix-team.myfreshworks.com` |
| `VITE_FRESHWORKS_API_KEY` | Freshworks CRM → Settings → API key |
| `VITE_WHATSAPP_PHONE_ID` | Meta Business → WhatsApp → Phone number ID |
| `VITE_WHATSAPP_ACCESS_TOKEN` | Meta Business → WhatsApp → Temporary or permanent token |

Save. Redeploy if needed so the build picks them up.

---

## 2. Local development (.env file)

In the project root create (or edit) **.env** with the same names:

```
VITE_FRESHWORKS_DOMAIN=https://toyflix-team.myfreshworks.com
VITE_FRESHWORKS_API_KEY=your_api_key_here
VITE_WHATSAPP_PHONE_ID=your_phone_id_here
VITE_WHATSAPP_ACCESS_TOKEN=your_facebook_token_here
```

**.env is gitignored** — it never gets committed. Use your real values only here and in Azure.

---

## 3. Supabase Edge Functions (auth-complete-profile)

If you use the `auth-complete-profile` function:

- In **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**, add:
  - `VITE_FRESHWORKS_DOMAIN`
  - `VITE_FRESHWORKS_API_KEY`
  - `VITE_WHATSAPP_ACCESS_TOKEN`
  - `VITE_WHATSAPP_PHONE_ID`

---

## 4. Cursor MCP (optional, local only)

**.cursor/mcp.json** is gitignored. Your local file with the Supabase access token stays only on your machine and is used by Cursor. No action needed for GitHub or Azure.

---

**Summary:** The app reads these from **environment variables**. Set them in Azure (and in .env locally, and in Supabase for Edge Functions). Facebook and Supabase keep working; only the way we store the secrets changed.

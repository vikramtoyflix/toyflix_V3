# E2E admin setup – do these 3 things

You have to do these yourself (Supabase and GitHub are in your account). Follow in order.

---

## 1. Supabase: enable Email provider

1. Open **Supabase Dashboard** → your project.
2. Go to **Authentication** → **Providers**.
3. Find **Email** and turn it **ON** (enable “Confirm email” if you want; the script creates users with `email_confirm: true`).
4. Save.

---

## 2. Create the admin user (run script once)

In your project folder, set your real values and run (password is only in your terminal, not saved anywhere):

```bash
cd /Users/vikrama.m/Documents/toy-joy-box-club-main

export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
export E2E_ADMIN_EMAIL="vikram@toyflix.in"
export E2E_ADMIN_PASSWORD='[YOUR_SECURE_PASSWORD]'

node scripts/create-e2e-admin-user.js
```

- Get **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** from Supabase: **Project Settings** → **API** (Project URL and `service_role` key).
- Replace the placeholders with your real values. Keep the password in the terminal only; don’t commit it.

You should see: `Done. E2E admin user created: <uuid>` or `Done. E2E admin custom_users row ensured.`

---

## 3. GitHub: add secrets (for E2E workflow)

1. Open your repo on GitHub.
2. Go to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and add:

| Name                | Value             |
|---------------------|-------------------|
| `E2E_ADMIN_EMAIL`   | `vikram@toyflix.in` |
| `E2E_ADMIN_PASSWORD`| The same secure password you used in step 2 (do not commit this value) |

After this, the **E2E Admin (optional)** workflow can log in with this account when it runs.

---

Done. After 1–3, the E2E admin account exists and (if you added the secrets) CI can use it.

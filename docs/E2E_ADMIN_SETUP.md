# E2E admin account setup (email + password)

The app’s normal login is **OTP-based**. For automated E2E tests we use a dedicated **admin account with email + password** so Playwright can log in without OTP.

---

## 1. Create the admin user in Supabase (one-time)

Use the script with **your** Supabase URL and **service role** key. The password is only in env (never commit it).

```bash
# From project root. Get SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API.
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export E2E_ADMIN_EMAIL="vikram@toyflix.in"
export E2E_ADMIN_PASSWORD='Admin123$'   # or your chosen password

node scripts/create-e2e-admin-user.js
```

- Creates a user in **Supabase Auth** (email + password, email confirmed).
- Inserts a row in **custom_users** with the same `id`, `role = 'admin'`, `phone_verified = true`.
- If the auth user already exists (e.g. “already been registered”), the script only ensures the **custom_users** row.

**Supabase:** In **Authentication → Providers**, ensure **Email** is enabled so email/password sign-in works.

---

## 2. OTP auth is never disabled

Customer login stays **OTP-based** (phone → OTP). The email/password form is **additive only** and is shown only when the app is built with `VITE_E2E_LOGIN_ENABLED=true`. Production builds must **not** set this variable, so in production customers only see the OTP flow.

---

## 3. Enable E2E login in the app (only for E2E/staging)

The email/password form on `/auth` is shown only when:

- `VITE_E2E_LOGIN_ENABLED=true` at **build time**.

So:

- **Production:** Do **not** set this (or set it to `false`). Production build will not show the E2E form.
- **E2E / staging:** Build with `VITE_E2E_LOGIN_ENABLED=true` (e.g. in CI or when running E2E locally).

Example local E2E run:

```bash
VITE_E2E_LOGIN_ENABLED=true npm run build && npm run preview
# In another terminal:
E2E_ADMIN_EMAIL=vikram@toyflix.in E2E_ADMIN_PASSWORD='Admin123$' npx playwright test e2e/admin-login.spec.ts
```

---

## 4. GitHub Actions (optional)

To run E2E with admin login in CI:

1. **Secrets** (Settings → Secrets and variables → Actions):
   - `E2E_ADMIN_EMAIL` = `vikram@toyflix.in`
   - `E2E_ADMIN_PASSWORD` = the same password you used in step 1 (e.g. `Admin123$`)

2. The workflow **E2E Admin (optional)** (`.github/workflows/e2e-admin.yml`) will:
   - Build with `VITE_E2E_LOGIN_ENABLED=true`
   - Start `npm run preview`
   - Run Playwright (including `e2e/admin-login.spec.ts`) using those secrets.

Admin credentials stay in GitHub Secrets only; they are not stored in the repo or in code.

---

## 5. Summary

| Item              | Where it lives / how it’s used                    |
|-------------------|----------------------------------------------------|
| Email             | `vikram@toyflix.in` (script default; can override with `E2E_ADMIN_EMAIL`) |
| Password          | Only in env when running the script and when running E2E; in CI, only in GitHub Secrets |
| E2E login form    | Shown only when `VITE_E2E_LOGIN_ENABLED=true` at build time |
| Production build  | Do not set `VITE_E2E_LOGIN_ENABLED` (or set `false`) so the form never appears in prod |

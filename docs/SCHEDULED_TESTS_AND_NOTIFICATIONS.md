# Scheduled tests and notifications

The repo is set up so **tests run automatically** and you can get notified when the site has issues. You don’t need to run them yourself.

---

## What runs automatically

- **Workflow:** `Smoke tests (production health)` (`.github/workflows/smoke-and-notify.yml`)
- **When it runs:**
  - Every **6 hours** (0:00, 6:00, 12:00, 18:00 UTC)
  - On every **push to `main`**
  - Manually: **Actions** tab → **Smoke tests (production health)** → **Run workflow**
- **What it does:** Runs smoke tests against **https://toyflix.in**. If any check fails (e.g. homepage or toys page down or wrong content), the workflow fails.

---

## How you get notified

### 1. Email from GitHub (no setup)

- If **“Send email notifications for failed workflows”** is on (check **Settings → Notifications** for the repo or your account), GitHub will email you when this workflow fails.
- Ensure your email is correct in GitHub **Settings → Emails**.

### 2. Slack / Discord (optional)

- Create an **incoming webhook** in Slack or Discord.
- In the repo: **Settings → Secrets and variables → Actions** → **New repository secret**:
  - Name: `NOTIFY_WEBHOOK_URL`
  - Value: your webhook URL (e.g. `https://hooks.slack.com/services/...` or Discord webhook).
- When the smoke workflow **fails**, it will POST a short message to that URL with a link to the failed run.

---

## Admin / E2E with login (you control credentials)

We **do not** put your admin login in code or in this doc. To run E2E tests that need login (e.g. admin panel, dashboard):

1. **Store credentials as GitHub Secrets** (e.g. `E2E_ADMIN_PHONE`, `E2E_TEST_OTP` or a test account token if you use one). Never commit these.
2. Use them only in workflow `env:` or `run:` so they are available to the job but not visible in logs.
3. You can add a second workflow (e.g. `e2e-with-login.yml`) that runs less often (e.g. daily), installs Playwright, runs E2E with `PLAYWRIGHT_BASE_URL=https://toyflix.in` and the secrets, and uses the same `NOTIFY_WEBHOOK_URL` on failure.

**E2E admin account (email + password):** There is a dedicated admin account for E2E so tests can log in without OTP. Setup: **docs/E2E_ADMIN_SETUP.md**. Use email `vikram@toyflix.in` and a password you set once; store the password only in env or GitHub Secrets (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`). The workflow **E2E Admin (optional)** runs daily and on demand and uses those secrets.

---

## Summary

- **Smoke tests** run on a schedule and on push to `main`; you get notified by **email** (if enabled) and/or **Slack/Discord** (if you set `NOTIFY_WEBHOOK_URL`).
- **Admin/E2E** can be added later using secrets; no need to share credentials in chat or code.

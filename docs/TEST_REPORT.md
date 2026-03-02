# Toyflix – Test Report

**Last automated run:** (see below)  
**Report date:** Fill when you run tests.  
**Environment:** Production (https://toyflix.in) or Staging (fill URL).

---

## 1. Automated Results (CI / Local)

### Build

| Check | Status | Notes |
|-------|--------|--------|
| Production build (`npm run build`) | ✅ Pass | Last run: build completes; no build errors. |

### Unit Tests (`npm test`)

| Metric | Value |
|--------|--------|
| Total tests | 34 |
| Passed | 31 |
| Skipped | 3 |
| Failed | 0 |
| Duration | ~1s |

**Passing suites**

- `SubscriptionCycleProgress` (component): cycle display, selection window status, edge cases, error handling, loading, accessibility, visual feedback (including urgent-action warning).
- `SubscriptionCycleService`: cycle calculations, scenarios, edge cases, UX validation, error handling. Mocks use `.single()` and `mockGetCurrentCycle` / `toCycleRow` to match the real API.

**Skipped (intentional)**

- Three tests in `subscriptionCycleService.test.ts`: selection window timing, plan-change mid-cycle, and “selection windows open/close” — they call `getSelectionWindows` or `createSubscriptionCycle`, which are not on the current service.

### Smoke tests (no browser – `npm run test:smoke:prod`)

| Check | TEST_PLAN ID | Status | Notes |
|-------|--------------|--------|--------|
| Homepage | H1 | ✅ Pass | 200, content: Toyflix, toys, Rent |
| Toys page | T1 | ✅ Pass | 200, Premium, Toys |
| Pricing | P1 | ✅ Pass | 200, subscription |
| Auth page | A1 | ✅ Pass | 200, Sign, auth |
| About | H5 | ✅ Pass | 200, Toyflix, play |
| Dashboard (unauthenticated) | D1 | ✅ Pass | 200, app shell |
| 404 route | E4 | ✅ Pass | 200, app shell |

Run against production: `npm run test:smoke:prod`. Run against local: start app then `npm run test:smoke`.

### E2E tests (Playwright – browser required)

- **Location:** `e2e/*.spec.ts` (homepage, toys, pricing, product, auth, dashboard, about, 404).
- **Run:** `npm run test:e2e`. Against production: `PLAYWRIGHT_BASE_URL=https://toyflix.in npm run test:e2e`.
- **First-time setup:** Install browser for your OS: `npx playwright install chromium`. On Apple Silicon Mac use the arch-specific install (Playwright will prompt or use `npx playwright install`).

---

## 2. Manual / E2E Results (Fill after running TEST_PLAN.md)

Run the test cases in `docs/TEST_PLAN.md` and record results here. Use: **P** = Pass, **F** = Fail, **B** = Blocked, **-** = Not run.

### Authentication & OTP

| ID | Result | Notes |
|----|--------|--------|
| A1 | P | Smoke: auth page 200, Sign/auth. |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |
| A9 | | |

### Homepage & Public

| ID | Result | Notes |
|----|--------|--------|
| H1 | P | Smoke: homepage loads (Toyflix, toys, Rent). |
| H2 | | |
| H3 | | |
| H4 | | |
| H5 | P | Smoke: About page 200. |
| H6 | | |
| H7 | | |

### Toys Page

| ID | Result | Notes |
|----|--------|--------|
| T1 | P | Smoke: Toys page 200, Premium/Toys. |
| T2 | | |
| T3 | | |
| T4 | | |
| T5 | | |
| T6 | | |

### Dashboard

| ID | Result | Notes |
|----|--------|--------|
| D1 | P | Smoke: dashboard route returns app shell. |
| D2 | | |
| D3 | | |
| D4 | | |
| D5 | | |

### Select Toys

| ID | Result | Notes |
|----|--------|--------|
| S1 | | |
| S2 | | |
| S3 | | |
| S4 | | |

### Pricing & Subscription

| ID | Result | Notes |
|----|--------|--------|
| P1 | P | Smoke: pricing page 200, subscription. |
| P2 | | |
| P3 | | |

### Admin Panel

| ID | Result | Notes |
|----|--------|--------|
| AD1 | | |
| AD2 | | |
| AD3 | | |
| AD4 | | |
| AD5 | | |
| AD6 | | |
| AD7 | | |

### Product Detail

| ID | Result | Notes |
|----|--------|--------|
| PD1 | | |
| PD2 | | |

### Error Handling

| ID | Result | Notes |
|----|--------|--------|
| E1 | | |
| E2 | | |
| E3 | | |
| E4 | P | Smoke: 404 route returns app shell. |

### Performance (optional)

| ID | Result | Notes |
|----|--------|--------|
| PERF1 | | |
| PERF2 | | |
| PERF3 | | |

---

## 3. Summary (fill after manual run)

- **Total run:** _ / _ (e.g. 45 / 52)
- **Critical (P0) failures:** (list IDs)
- **Next actions:** (e.g. fix OTP timeout, fix admin edit toy)

---

## 4. How to Re-run All Tests (you can run these)

```bash
# 1. Build
npm run build

# 2. Unit tests
npm test

# 3. Smoke tests (no browser – hits URLs and checks content)
npm run test:smoke:prod          # against https://toyflix.in
# Or with app running locally:
npm run test:smoke               # against http://localhost:5173

# 4. E2E tests (browser required – install once: npx playwright install chromium)
PLAYWRIGHT_BASE_URL=https://toyflix.in npm run test:e2e   # against production
npm run test:e2e                 # starts dev server and runs E2E
```

- Unit + smoke cover: homepage, toys, pricing, auth, about, dashboard route, 404.
- Full TEST_PLAN (OTP, payment, admin, etc.) still needs manual checks or real E2E with login; see `docs/TEST_PLAN.md`.
- JSON unit results: `test-reports/results.json` after `npm test`.

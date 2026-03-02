# Toyflix Website – Test Plan

Use this plan for manual testing or as a checklist for automated E2E tests. Base URL: **https://toyflix.in** (or your staging URL).

---

## 1. Authentication & OTP

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| A1 | Send OTP – valid phone | Enter 10-digit Indian phone → Send OTP | OTP sent toast; loading stops within ~15s; next step (sign-in or sign-up form) appears | P0 |
| A2 | Send OTP – invalid phone | Enter &lt;10 digits or non-numeric | Validation error; no API call | P1 |
| A3 | Resend OTP cooldown | Send OTP → try Resend before 30s | Resend disabled or “wait Xs” message | P2 |
| A4 | Verify OTP – correct code | Enter valid 6-digit OTP → Verify | Sign-in/sign-up success; redirect to dashboard or next step | P0 |
| A5 | Verify OTP – wrong code | Enter wrong 6-digit OTP → Verify | Error toast; stay on OTP step | P0 |
| A6 | New user sign-up flow | New phone → OTP → Sign-up form (name, pincode) → Verify OTP | Account created; redirect | P0 |
| A7 | Returning user sign-in | Existing phone → OTP → Verify | Redirect to dashboard/pricing | P0 |
| A8 | Session persistence | Sign in → refresh page | Still signed in | P1 |
| A9 | Sign out | Sign in → Sign out | Redirect to auth/home; session cleared | P1 |

---

## 2. Homepage & Public Pages

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| H1 | Homepage load | Open `/` | Hero, carousels, no console errors | P0 |
| H2 | Toys carousel | Scroll to “Rent premium toys” / similar | Toys load; images visible | P0 |
| H3 | Ride-on carousel | Scroll to ride-on section | Ride-on toys load | P1 |
| H4 | Navigation – Pricing | Click Pricing in nav | `/pricing` loads; plans visible | P0 |
| H5 | Navigation – About | Click About | About page loads | P2 |
| H6 | Navigation – Toys | Click Toys/Browse | `/toys` loads | P0 |
| H7 | Footer / contact | Click WhatsApp or phone | Correct link opens | P2 |

---

## 3. Toys Page

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| T1 | Toys page load | Open `/toys` | Catalog loads (Premium + Ride-On tabs) | P0 |
| T2 | Tab switch | Switch between Premium Toys and Ride-On | Content updates; no flash of wrong data | P1 |
| T3 | Search | Type in search box | List filters by name | P1 |
| T4 | Product click | Click a toy card | Navigate to `/toys/:id` product page | P0 |
| T5 | Error + retry | Simulate failure (e.g. offline) → Retry | Error message shown; “Try again” refetches and recovers | P1 |
| T6 | No address prefill popup | Open `/toys` (or select-toys) as logged-in user | No “Address prefilled from your profile” toast blocking UI | P1 |

---

## 4. Dashboard (Logged-in Customer)

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| D1 | Dashboard load | Sign in → go to Dashboard | Dashboard loads; orders/cycle info or empty state | P0 |
| D2 | Dashboard with orders | User with orders → Dashboard | Orders/cycle/subscription info visible | P0 |
| D3 | Session expired handling | Clear session / use invalid token → open Dashboard | “Session expired” or redirect to auth; no generic “Dashboard Error” only | P1 |
| D4 | Retry on error | Force error (e.g. network) → Retry Dashboard | Retry button refetches; success or clear error message | P1 |
| D5 | Payment success banner | Land with `?payment_success=true` | Success banner shown; dashboard data refreshed | P2 |

---

## 5. Select Toys (Subscription Flow)

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| S1 | Select toys page load | From dashboard → Select Toys (or `/select-toys`) | Steps load; no address prefill popup blocking Next | P0 |
| S2 | Step 1 – choose toys | Select required toys per step → Next | Moves to next step or address | P0 |
| S3 | Address step | Complete address if shown | Can proceed to confirmation | P0 |
| S4 | Confirmation / submit | Submit selection | Success or clear error | P0 |

---

## 6. Pricing & Subscription

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| P1 | Pricing page | Open `/pricing` | Plans visible; CTA works | P0 |
| P2 | Start subscription | Click plan → start flow | Redirect to subscription/signup or auth as needed | P1 |
| P3 | Subscription flow (happy path) | Plan → auth → payment (test mode if available) | Order created; success page or dashboard update | P1 |

---

## 7. Admin Panel

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| AD1 | Admin access | Log in as admin → `/admin` | Admin layout; tabs visible | P0 |
| AD2 | Orders tab | Admin → Orders | Orders load (via Edge Function); no 401 | P0 |
| AD3 | Inventory / toys list | Admin → Inventory | Toy list loads | P0 |
| AD4 | Edit toy – save | Admin → Edit Toy → change fields → Save | “Toy updated successfully” (no “Failed to update toy”) | P0 |
| AD5 | Edit toy – images | Edit Toy → change images → Save | “Toy updated successfully” (no “Partially Updated” due to images) | P0 |
| AD6 | Non-admin redirect | Log in as customer → open `/admin` | Redirect to dashboard | P0 |
| AD7 | Impersonation | Admin → impersonate user → browse | Banner “Viewing as customer”; actions as customer | P2 |

---

## 8. Product Detail & Cart / Checkout

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| PD1 | Product page | Open `/toys/:id` | Toy details and images load | P0 |
| PD2 | Add to selection / rent CTA | Click rent/select (if applicable) | Correct flow starts (e.g. select-toys or subscription) | P1 |

---

## 9. Error Handling & Resilience

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| E1 | Network error – Toys | Offline → open `/toys` → go online → Retry | Error state with “Try again”; retry loads data | P1 |
| E2 | Network error – Dashboard | Offline → Dashboard → Retry | Retry refetches; message clear | P1 |
| E3 | Toasts visible | Trigger any success/error toast (e.g. Edit Toy, OTP) | Toast appears (no missing toasters) | P0 |
| E4 | 404 | Open `/nonexistent` | 404 page or redirect | P2 |

---

## 10. Performance & UX (Optional – e.g. Lighthouse)

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|--------|----------|----------|
| PERF1 | LCP (Largest Contentful Paint) | Run Lighthouse on `/` | LCP &lt; 2.5s (target) | P2 |
| PERF2 | TBT (Total Blocking Time) | Run Lighthouse | TBT reduced vs baseline | P2 |
| PERF3 | No long “Sending OTP…” | Send OTP | Button unblocks when send completes; toast soon | P1 |

---

## How to Use This Plan

1. **Manual run:** For each test case, run the steps on https://toyflix.in (or staging), note **Pass / Fail / Blocked** and any notes in `docs/TEST_REPORT.md`.
2. **Automation:** Map each ID to an E2E test (e.g. Playwright) and run in CI; export results into the same report format.
3. **Regression:** Before each release, run at least all P0 and P1 cases.

---

## Test Data Notes

- Use a dedicated test phone number for OTP if 2Factor allows.
- For admin tests, use an account with `role = 'admin'` in `custom_users`.
- For subscription/payment tests, use Razorpay test mode if configured.

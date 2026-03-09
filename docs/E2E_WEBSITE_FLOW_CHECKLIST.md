# End-to-end website flow checklist

One complete pass of the main user journeys. Use this to verify the site stays working after changes.

---

## 1. Entry and config

| Step | What | Status / Notes |
|------|------|----------------|
| App bootstrap | `main.tsx` → `App.tsx` → `BrowserRouter`, `CustomAuthProvider`, `QueryClientProvider` | ✅ Build passes |
| Supabase client | `src/integrations/supabase/client.ts` – `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or fallback) | Set in Azure / env for production |
| Auth state | `CustomAuthProvider` reads from storage; no WooCommerce in OTP flow | ✅ 2Factor only |

---

## 2. Public pages (no login)

| Route | Page | Main data / API | Verify |
|------|------|------------------|--------|
| `/` | Index (home) | `fetchHomepageToys` (toys), `TestimonialsCarousel` (testimonials table or fallback) | Home loads; toys and carousels show |
| `/toys` | Toys list | `supabase.from('toys')`, `toy_images`, `imageService` (no transform URLs) | Grid loads; images from object/public or S3 |
| `/toys/:id` | Product detail | `toys` + `toy_images` | Detail loads; images work |
| `/auth` | Sign in / Sign up | N/A (form only) | Auth page loads |
| `/pricing` | Pricing | Static / config | Page loads |
| `/about` | About | Static | Page loads |

**Known:** `rest/v1/testimonials` may 404 if the table doesn’t exist; `testimonialsService` falls back to default video list.

---

## 3. Auth flow (OTP)

| Step | Action | API / Function | Verify |
|------|--------|----------------|--------|
| 1 | User enters phone → “Get OTP” | `sendOTP(phone)` → `POST …/functions/v1/send-otp` | OTP sent; no CORS/JWT error |
| 2 | User enters OTP → “Verify” | `verifyOTP(phone, otp)` → `POST …/functions/v1/verify-otp-custom` | Success or clear error message |
| 3 | After verify | `useHybridAuth` → `setAuth`, redirect (e.g. dashboard or profile) | Redirect and session persist |

**Deployed (verify_jwt = false):** `send-otp`, `check-user-status`, `verify-otp-custom`.

---

## 4. Protected routes (logged-in user)

| Route | Page | Main data / API | Verify |
|------|------|------------------|--------|
| `/dashboard` | Dashboard | User + subscriptions / orders (Supabase tables) | Loads after login |
| `/subscription-flow` | Subscription flow | Toys, subscription creation | Can start flow |
| `/select-toys` | Toy selection | Toys, selection state | Selection works |
| `/order-summary` | Order summary | Order data | Summary shows |
| `/order-tracking` | Order tracking | Order status | Tracking shows |

All wrapped in `ProtectedRoute` (redirect to `/auth` if not logged in).

---

## 5. Admin routes

| Route | Page | Main API | Verify |
|------|------|----------|--------|
| `/admin` | Admin home | Various admin tables | Loads for admin user |
| `/admin/inventory/edit/:toyId` | Edit toy | `PATCH` toy fields → `POST …/functions/v1/admin-update-toy` | Save succeeds; no network error |
| Toy images save | Save images on edit | `POST …/functions/v1/admin-save-toy-images` | Saves; no CORS error |

**Deployed (verify_jwt = false):** `admin-update-toy`, `admin-save-toy-images`. Admin auth is enforced inside the function via `x-admin-user-id` and `custom_users.role`.

---

## 6. Data and images summary

| Source | Used for | Notes |
|--------|----------|--------|
| `toys` | Catalog, detail, admin | Supabase table |
| `toy_images` | Toy images | Supabase table; URLs should be object/public or S3 (no /render/image to avoid transform quota) |
| `custom_users` | Auth, profile, admin checks | Supabase table |
| `imageService.getImageUrl()` | All toy/carousel/product images | Returns raw object URL or S3; no Supabase image transforms |
| Testimonials | Homepage carousel | Table `testimonials` if present; else fallback list |

---

## 7. Quick verification commands

```bash
# From repo root
npm run build    # Must succeed
npm run test     # Must pass (e.g. 31 passed)
```

---

## 8. If something breaks

- **OTP / auth:** Check Supabase Edge Functions → `send-otp`, `verify-otp-custom` → Logs and Invocations; ensure both deployed with `verify_jwt = false`.
- **Admin “Network error”:** Check Network tab for which function (e.g. `admin-update-toy`, `admin-save-toy-images`); redeploy that function so config (verify_jwt = false) is applied.
- **Images:** Ensure no code path uses `.../render/image/public/...`; use `scripts/rollback-image-urls-run-in-supabase.sql` if DB still has transform URLs.
- **Testimonials 404:** Optional: create `testimonials` table and expose via PostgREST, or rely on built-in fallback.

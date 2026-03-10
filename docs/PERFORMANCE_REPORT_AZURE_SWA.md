# Performance Report: Toyflix on Azure Static Web Apps (Happy Island)

**Date:** March 10, 2026  
**Target:** https://toyflix.in (new Azure Static Web App deployment)

---

## Executive Summary

| Metric | Status | Notes |
|--------|--------|------|
| **HTML response time** | ✅ Good | ~0.33–0.38s |
| **Compression** | ✅ Good | Brotli (br) enabled for JS/CSS |
| **Code splitting** | ✅ Good | Lazy routes + manual chunks |
| **Cache headers** | ⚠️ Issue | Assets getting max-age=30 instead of long cache |
| **Bundle sizes** | ⚠️ Review | CSS ~199KB (large) |
| **Security headers** | ✅ Good | HSTS, X-Content-Type-Options, etc. |

---

## 1. Response Times (measured via curl)

| Page | Time |
|------|------|
| `/` (homepage) | 0.38s |
| `/toys` | 0.38s |
| `/pricing` | 0.35s |
| `/auth` | 0.33s |

**Verdict:** Server response times are good (< 400ms).

---

## 2. Asset Sizes (uncompressed)

| Asset | Size | Notes |
|-------|------|-------|
| HTML (index.html) | 6.2 KB | Good |
| Main JS bundle | 86 KB | Good |
| Main CSS bundle | 199 KB | Large – consider purging unused styles |
| LCP hero image | 37 KB | Good |

---

## 3. Cache Headers – Issue

**Expected (from `staticwebapp.config.json`):**
- `/js/*`, `/css/*`, `/assets/*`: `max-age=31536000, immutable`
- Images: `max-age=86400, stale-while-revalidate=604800`
- `index.html`: `no-cache, no-store, must-revalidate`

**Observed (all assets):**
```
cache-control: public, must-revalidate, max-age=30
```

**Impact:** Repeat visitors re-download JS/CSS on every visit instead of using long-term cache. This hurts performance and increases bandwidth.

**Possible causes:**
1. Custom domain (toyflix.in) behind Azure Application Gateway or another proxy that overrides headers
2. Route matching in `staticwebapp.config.json` not applying as expected
3. CDN or edge layer stripping/overriding cache headers

**Action:** Check Azure Portal → Static Web App → Custom domains and any Application Gateway / CDN in front. Ensure `staticwebapp.config.json` is deployed and that no upstream layer overrides cache headers.

---

## 4. What’s Working Well

### Compression
- Brotli (`content-encoding: br`) is used for JS/CSS.

### Critical path
- LCP image preloaded: `/lovable-uploads/2dfe92ac-e423-4160-88e2-2261bb2cf3c9.webp`
- Preconnect for: `fonts.googleapis.com`, `fonts.gstatic.com`, `supabase.co`
- Non-blocking font load (media=print trick)

### Code splitting
- Route-level lazy loading (Index, Auth, Dashboard, Admin, etc.)
- Manual chunks: React, Supabase, Radix UI, charts, forms, etc.
- Admin-heavy chunks (e.g. AdminOrders, AdminUsers) loaded only when needed

### Security
- `strict-transport-security: max-age=10886400; includeSubDomains; preload`
- `x-content-type-options: nosniff`
- `x-xss-protection: 1; mode=block`

### Build optimizations (Vite)
- Target: modern browsers only (Chrome 89+, Firefox 89+, Safari 15+, Edge 89+)
- Gzip and Brotli pre-compression
- Tree shaking, minification

---

## 5. Recommendations

### High priority
1. **Fix cache headers**  
   Confirm `staticwebapp.config.json` is applied and that no proxy/CDN overrides headers. JS/CSS should use `max-age=31536000, immutable`.

### Medium priority
2. **Reduce CSS size**  
   - Use PurgeCSS or Tailwind’s purge to remove unused styles.  
   - Consider splitting critical above-the-fold CSS from the rest.

3. **Verify Core Web Vitals**  
   Run Lighthouse (Chrome DevTools or CLI) on mobile and desktop to measure LCP, FID, CLS.

### Low priority
4. **Image optimization**  
   - Ensure toy images from Supabase use `?width=`, `?quality=`, `?format=webp` where applicable.  
   - Use `loading="lazy"` for below-the-fold images.

5. **Third-party scripts**  
   - Madgicx (signals.madgicx.cc) loads on every page. Consider loading after user interaction or using a tag manager with delayed loading.

---

## 6. Quick Checks You Can Run

```bash
# Smoke test
BASE_URL=https://toyflix.in node scripts/smoke-test-urls.js

# Check cache headers for a JS file
curl -sI "https://toyflix.in/js/index-BE_LTVjW.js" | grep -i cache

# Lighthouse (requires Chrome)
npx lighthouse https://toyflix.in --view --preset=desktop
```

---

## 7. Files Referenced

- `staticwebapp.config.json` – routing and cache headers
- `vite.config.ts` – build, chunks, compression
- `src/utils/seo/performance.ts` – Core Web Vitals monitoring
- `src/App.tsx` – lazy route loading

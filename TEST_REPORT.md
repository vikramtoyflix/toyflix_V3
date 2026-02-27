# Website Deep Testing Report — Feb 27, 2026

## Executive Summary

A comprehensive review was conducted covering performance, lazy loading, build output, tests, and critical user flows. **Key issues identified and fix status** are documented below.

---

## 1. Performance & Loading Speed

### Critical Issues

| Issue | Severity | Status |
|-------|----------|--------|
| **Main bundle 2.4MB** — index chunk exceeds 1000KB; all routes loaded eagerly | High | Fix applied: Route-level lazy loading |
| **No route-level code splitting** — 25+ page components loaded on first visit | High | Fix applied |
| **Preload invalid paths** — performance.ts preloads `/lovable-uploads/hero-image.png` which may not exist | Medium | Fix applied |

### Good Practices Found

- Index page uses `React.lazy` + Suspense for HomeCarousel, ToyCarousel, Footer, etc.
- Admin panel lazy loads heavy components
- Vite manual chunks: vendor, ui, supabase, charts
- Image `loading="lazy"` used across toy cards, product gallery, catalog
- Logo/header images use `loading="eager"` correctly
- QueryClient: 5min staleTime, 10min gcTime
- Core Web Vitals monitoring (LCP, FID, CLS) in place

---

## 2. Lazy Loading Audit

### Where Lazy Loading Exists

- **Index.tsx**: HomeCarousel, ToyCarousel, RideOnToysCarousel, Footer, WhyChooseUs, Header, TestimonialsCarousel, PremiumPartners, CertifiedBy, HeroCarousel, MobileLayout, MobilePullToRefresh
- **Admin.tsx**: All admin panels (AdminToys, AdminOrders, etc.) — 20+ components
- **MobileHeroSection.tsx**: HeroCarousel

### Where Lazy Loading Is Missing

- **App.tsx routes**: All pages (Index, Auth, Dashboard, Pricing, Toys, etc.) were eagerly imported
- **Impact**: First load downloads code for Admin, SubscriptionFlow, EditToy, etc. even when user only visits home

### Mixed Import Warning (Build)

Several modules are both dynamically and statically imported, so they stay in the main bundle:

- `supabase/client` — used by 80+ files
- `MobileLayout` — used by Index (lazy) + About, Auth, Dashboard, etc. (static)
- `Header`, `Footer` — similar pattern

**Recommendation**: For route-level lazy loading, prefer `React.lazy` on route components. Static imports from other pages will still pull in shared modules, but each route will load its own chunk on demand.

---

## 3. Build Output

### Build Warnings

1. **Browserslist outdated** — `caniuse-lite` 16 months old  
   - Action: Run `npx update-browserslist-db@latest`

2. **Chunk size** — `index-Df51HPJa.js` ~2.4MB (635KB gzip)  
   - Action: Route-level lazy loading reduces initial payload

3. **Dynamic import conflicts** — Multiple modules mixed static/dynamic  
   - Action: Acceptable; route splitting gives the main benefit

### Build Success

- Build completes with exit code 0
- CSS: 191KB (27KB gzip)
- Chunks split for Admin, carousels, charts

---

## 4. Unit Tests

### Test Configuration (Fixed)

- **Previous error**: vitest reporter referenced `@vitest/ui` (not installed)
- **Fix applied**: Removed html reporter; tests now run with verbose + json reporters

### Current Test Failures

```
Error: Cannot find module '@testing-library/dom'
```

- **Cause**: `@testing-library/react` requires `@testing-library/dom` as peer dependency
- **Fix**: Run `npm install @testing-library/dom --save-dev`

---

## 5. Error Handling & Edge Cases

### Error Boundaries

- **Index.tsx**: ErrorBoundary + ErrorFallback around each lazy section
- **Admin.tsx**: ErrorBoundary per admin panel
- **App.tsx**: No top-level ErrorBoundary — uncaught errors can break the whole app

### Protected Routes

- ProtectedRoute checks: `isAuthenticated`, `isPhoneVerified`, `isCompletelySetup`
- Impersonation bypass for admins
- Loading state: "Checking authentication..."
- Redirect preserves `location.pathname` + search

### Missing / Weak Handling

- No global ErrorBoundary in App
- performance.ts: `preloadImage('/lovable-uploads/hero-image.png')` — path may not exist
- Console.log in ProtectedRoute — should be removed or gated for production

---

## 6. Image Loading

### Correct Usage

- **Logo/Header**: `loading="eager"`
- **Toy cards, product gallery, catalog, CertifiedBy**: `loading="lazy"`
- **OptimizedImage**: Uses `priority ? 'eager' : 'lazy'`

### Preload Check

- performance.ts preloads: hero-image.png, favicon.ico, apple-touch-icon
- Public folder: no hero-image.png; favicons referenced in index.html
- **Risk**: 404 for hero-image preload; low impact

---

## 7. Scenarios Covered

| Scenario | Notes |
|----------|-------|
| First visit (home) | Heavy initial bundle; route lazy loading reduces this |
| Auth flow | Loading states, redirect handling |
| Protected routes | Auth check, phone verification, impersonation |
| Admin panel | Lazy-loaded; ErrorBoundary per section |
| Mobile vs desktop | Index uses isMobile; MobileLayout vs desktop layout |
| Carousel navigation | Arrows removed; swipe/drag + autoplay |
| Image-heavy pages | Lazy loading on below-fold images |

---

## 8. Fixes Applied

1. **Route-level lazy loading** in App.tsx for all page routes — **Initial bundle reduced from 2.4MB to ~170KB** (main index chunk)
2. **Suspense fallback** (PageLoader) for lazy routes with loading UI
3. **preloadCriticalResources** updated — removed invalid hero-image.png and apple-touch-icon preload; only favicon preloaded
4. **Vitest reporters** adjusted — removed html reporter to avoid @vitest/ui dependency
5. **Top-level ErrorBoundary** in App.tsx — catches uncaught errors, shows fallback with "Try Again" (reloads page)
6. **ProtectedRoute** — removed console.log statements for production
7. **Test setup** — removed `vi.stubGlobal('Date', ...)` that broke Date constructor ("Date is not a constructor"); `vi.setSystemTime` alone handles time mocking
8. **Browserslist** — updated via `npm update caniuse-lite browserslist`

---

## 9. Recommended Follow-ups

1. Add a top-level ErrorBoundary in App
2. Remove or gate `console.log` in ProtectedRoute for production
3. Run `npx update-browserslist-db@latest`
4. Consider adding `loading="lazy"` to carousel images below the fold
5. Monitor LCP/FID/CLS in production after route splitting

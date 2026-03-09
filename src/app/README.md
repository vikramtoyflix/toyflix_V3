# Standalone app UI

This folder contains the **native-only** UI used when you build with `npm run build:app`. It is a completely different experience from the website:

- **Dark theme**, bottom tab navigation (Home, Toys, Dashboard, Account)
- **Same backend**: Supabase + custom auth (same as website)
- **No website dependency**: the app talks directly to Supabase, so it keeps working even when toyflix.in is down
- **No analytics or third-party scripts** in the app entry (`index-app.html`)

## Build and run

```bash
npm run build:app   # Output: dist/ (includes index.html for Capacitor)
npx cap sync
npx cap open ios    # or cap open android
```

## Structure

- `AppShell.tsx` — Router, bottom nav, auth gate; lazy-loads app pages
- `pages/` — AppHome, AppToys, AppToyDetail, AppDashboard, AppAccount, AppAuth

Shared hooks and services (`useCustomAuth`, `useToysWithAgeBands`, Supabase client, etc.) are reused from `@/hooks` and `@/integrations`.

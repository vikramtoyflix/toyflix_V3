# Android App: Run Locally & Check Performance

Your Toyflix Android app is a **Capacitor** app (web app bundled inside a native shell). Use this guide to run it locally or push to GitHub and verify performance.

---

## 1. Upload / Back up on GitHub

Your project is already a git repo. To push the Android app (and any recent changes) to GitHub:

```bash
# From project root
git add .
git commit -m "chore: sync Android app and scripts"
git push origin main
```

- **GitHub does not run or build the app**; it only stores your code.
- To **automate builds and performance checks**, you can later add **GitHub Actions** (e.g. build the web app and Android APK on push).

---

## 2. Run the Android App Locally (to check if it’s “down”)

The app loads content from the **bundled** `dist` folder (no live website URL inside the app). If the app feels “down”, it’s often due to:

- **Backend issues** – Supabase or Azure WooCommerce proxy (e.g. `toyflix-woocommerce-proxy-...azurewebsites.net`) being slow or unavailable.
- **Stale or broken build** – `dist` not built or not synced into the Android project.

### Step 1: Install dependencies and build the app bundle

```bash
cd /Users/vikrama.m/Documents/toy-joy-box-club-main
npm install
npm run build:app
```

This builds the app entry (`index-app.html` → `main-app.tsx`) into `dist/`.

### Step 2: Sync the web build into the Android project

```bash
npx cap sync
```

### Step 3: Open and run in Android Studio

```bash
npx cap open android
```

In Android Studio:

- Wait for Gradle sync to finish.
- Choose a device: **Device Manager** → start an emulator, or connect a physical Android device with USB debugging.
- Click **Run** (green play button) to install and launch the app.

You can now see if the app starts and where it fails (e.g. white screen, API errors).

---

## 3. Check Performance

Once the app runs locally:

1. **Chrome DevTools (WebView)**  
   - On your computer: Chrome → `chrome://inspect`  
   - Find your device/WebView and click **inspect** to debug JS, network, and console errors.

2. **Android Studio Profiler**  
   - Run the app from Android Studio, then **View → Tool Windows → Profiler**.  
   - Use **CPU**, **Memory**, and **Network** to see what’s slow or causing “down” behavior.

3. **Backend health**  
   - If the app opens but data doesn’t load, check:
     - Supabase dashboard and project status.
     - Azure Function:  
       `https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net`  
     - Any `.env` / `VITE_*` variables the app uses (see `.env.example`).

---

## 4. Quick checklist when the app is “down”

| Check | Command / Action |
|-------|-------------------|
| Rebuild web app | `npm run build:app` |
| Sync to Android | `npx cap sync` |
| Open in Android Studio | `npx cap open android` |
| Run on device/emulator | Run button in Android Studio |
| Inspect WebView | Chrome `chrome://inspect` |
| Back up code | `git add . && git commit -m "..." && git push origin main` |

---

## 5. Optional: Environment for the app build

The app uses `import.meta.env.VITE_*` for Supabase and other backends. For a **local performance/behavior check**, you can:

- Copy `.env.example` to `.env` and fill in values, then run `npm run build:app` again and `npx cap sync`, **or**
- Rely on the fallbacks already in the code (e.g. Supabase URL and anon key) if they’re valid.

After changing `.env`, always run `npm run build:app` and `npx cap sync` before running the app in Android Studio.

# iOS & Android App — Post–Website Launch Checklist & Upload Guide

Your app is a **Capacitor** build of the same Vite/React codebase as the website. It mirrors the site by running the same built web app inside native shells. After the new website launch, use this checklist and then upload to the stores.

---

## 1. Post–Website Launch Checklist

### 1.1 Environment (same as live website)

The app bakes in `VITE_*` env vars at **build time**. Use the **same production values** as your live site (e.g. toyflix.in).

- [ ] **`.env` for production build** has:
  - `VITE_SUPABASE_URL` — same as website
  - `VITE_SUPABASE_ANON_KEY` — same as website
  - `VITE_RAZORPAY_KEY_ID` — same as website (if you use Razorpay in app)
- [ ] No leftover dev/local URLs in the env you use for `npm run build` (e.g. no `localhost` Supabase).

### 1.2 Version bump (required for store updates)

- [ ] **iOS**  
  - In Xcode: open `ios/App/App.xcodeproj` → select target **App** → **General** tab.  
  - Bump **Version** (e.g. `2.0.7` → `2.0.8`) and **Build** (e.g. `1` → `2`).  
  - Or edit `ios/App/App.xcodeproj/project.pbxproj`: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
- [ ] **Android**  
  - In `android/app/build.gradle`: bump `versionCode` (integer, must increase every upload) and `versionName` (e.g. `"1.1.3"` → `"1.1.4"`).

### 1.3 Bundle / application ID

- [ ] **iOS**: Bundle ID in Xcode (e.g. `com.bommalu.toyrental`) matches what you use in App Store Connect.
- [ ] **Android**: `applicationId` in `android/app/build.gradle` is `com.bommalu.toyrentalapp`.  
  - If you use Firebase (`google-services.json`), its `package_name` must match this `applicationId`. Your repo has `google-services.json` with `com.toyflix.in`; if the app you ship uses `com.bommalu.toyrentalapp`, update Firebase to that package or align the IDs.

### 1.4 App config

- [ ] **`capacitor.config.ts`**  
  - `appId`, `appName`, `webDir: 'dist'` are correct. No change needed unless you renamed the app.
- [ ] **Icons & splash**  
  - If the website branding changed, regenerate app icons/splash (e.g. `npx @capacitor/assets generate`) and then `npx cap sync`.

### 1.5 Optional: deep links / universal links

- [ ] If the website domain or paths changed, update iOS Associated Domains and Android intent filters so in-app links and “open in app” from the site still work.

### 1.6 Test before uploading

- [ ] Run a **production** web build and test in Capacitor:
  - `npm run build`
  - `npx cap sync`
  - Open iOS: `npx cap open ios` → run on simulator/device.
  - Open Android: `npx cap open android` → run on emulator/device.
- [ ] Verify: login, Supabase data, Razorpay (if used), and any API that the website uses.

---

## 2. How to Build the App (Capacitor)

From the project root:

```bash
# 1. Install deps (if needed)
npm ci

# 2. Production web build (uses .env in this folder)
npm run build

# 3. Copy web build into iOS/Android and update native project
npx cap sync
```

- **iOS**: open in Xcode and build/archive from there (see below).  
- **Android**: build a release AAB/APK from Android Studio or CLI (see below).

---

## 3. How to Upload — iOS (App Store)

1. **Open the iOS project**
   ```bash
   npx cap open ios
   ```
2. In **Xcode**:
   - Select the **App** target and your **Team** (Apple Developer account).
   - Select **Any iOS Device** (or a connected device) as run destination — not a simulator.
3. **Archive**
   - Menu: **Product** → **Archive**.
   - When the Organizer opens, select the new archive and click **Distribute App**.
4. **Distribute**
   - Choose **App Store Connect** → **Upload**.
   - Follow the prompts (signing, options). Leave “Upload symbols” checked if offered.
5. **App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight** or **App Store** tab.
   - After processing, the build appears under the version you created. Submit for review when ready.

**First-time setup**: you need an Apple Developer account, an App ID and provisioning profile for this bundle ID, and the app created in App Store Connect with the same bundle ID.

---

## 4. How to Upload — Android (Google Play)

1. **Open the Android project**
   ```bash
   npx cap open android
   ```
2. **Signing**  
   Your `android/app/build.gradle` already has a `release` signing config pointing to `upload-keystore.jks`. Ensure:
   - The keystore file exists at `android/app/upload-keystore.jks`.
   - You have the passwords (store + key) and keep them safe; you need the same keystore for all future updates.
3. **Build release AAB (recommended for Play Store)**
   - In Android Studio: **Build** → **Generate Signed Bundle / APK** → **Android App Bundle** → choose your keystore and release config.
   - Or from project root:
     ```bash
     cd android && ./gradlew bundleRelease
     ```
   - Output: `android/app/build/outputs/bundle/release/app-release.aab`
4. **Upload to Play Console**
   - Go to [Google Play Console](https://play.google.com/console) → your app → **Release** → **Production** (or **Testing**).
   - Create a new release, upload the `.aab` file, add release notes, and submit for review.

**First-time setup**: you need a Google Play Developer account and the app created in Play Console with the same `applicationId` (`com.bommalu.toyrentalapp`).

---

## 5. Summary

| Step | Command / action |
|------|-------------------|
| Env | Same production `.env` as website for `npm run build` |
| Version | Bump iOS version/build, Android `versionCode`/`versionName` |
| Build web | `npm run build` |
| Sync native | `npx cap sync` |
| iOS upload | `npx cap open ios` → Xcode → Product → Archive → Distribute to App Store Connect |
| Android upload | Build signed AAB → Play Console → upload `.aab` |

---

## 6. Legacy `mobile_api_codes` app (optional)

The repo has a **`mobile_api_codes/`** folder (e.g. React Native) that calls **toyflix.in WordPress APIs** (`https://toyflix.in/wp-json/api/v1/...`). That is a **different** app from the Capacitor app above.

- If you **still ship** that app: update its API base URL and endpoints to match your new backend (e.g. your Supabase-backed API or new domain). The ANDROID_APP_REAL_SUPABASE_INTEGRATION.md doc describes API routes that can sit in front of Supabase; ensure that app points to the correct host and paths.
- If you **only ship** the Capacitor app (same code as the website), you can ignore `mobile_api_codes` for the post–website launch and upload steps above.

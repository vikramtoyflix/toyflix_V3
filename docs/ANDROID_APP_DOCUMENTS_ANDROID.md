# TOYFLIX Android App (Documents/android)

Your **TOYFLIX** app at **`~/Documents/android`** is the **Android part of a React Native project**. It is not a standalone Android app: it expects a parent folder that contains the full React Native app (JavaScript/React Native code, `package.json`, `node_modules`).

---

## 1. Upload to GitHub

You can put this folder on GitHub in two ways.

### Option A: Push only the `android` folder (backup / share)

```bash
cd /Users/vikrama.m/Documents/android
git init
git add .
git commit -m "TOYFLIX React Native Android project"
# Create a new repo on GitHub (e.g. "toyflix-android"), then:
git remote add origin https://github.com/YOUR_USERNAME/toyflix-android.git
git branch -M main
git push -u origin main
```

This backs up the Android native code. The app still **won’t build/run** from this repo alone until the rest of the React Native project is there (see below).

### Option B: Push the full React Native project (recommended for running the app)

If you have the **full TOYFLIX React Native project** somewhere (folder that contains both `android` and things like `package.json`, `node_modules`, `index.js`, `App.js`, etc.):

1. Put that whole folder under version control (if not already).
2. Push that entire project to GitHub.

Then you have one repo that can be cloned and run with `npm install` and `npx react-native run-android`.

---

## 2. Run locally and check performance

The app at `~/Documents/android` **cannot be run by itself**. React Native needs:

- The **project root** (one level up from `android`), with:
  - `package.json`
  - `node_modules` (after `npm install`)
  - JS entry (e.g. `index.js`) and app code (e.g. `App.js` / `src/`)
- The `android` folder as a subfolder of that root.

Your `android/settings.gradle` points to `../node_modules`, so it expects:

```
SomeFolder/                    ← React Native project root
├── package.json
├── node_modules/
├── index.js
├── App.js (or src/)
└── android/                   ← the folder you have in Documents
    ├── app/
    ├── build.gradle
    └── settings.gradle
```

### If you have the full project elsewhere

1. Open the **project root** (the folder that **contains** `android` and has `package.json`).
2. In a terminal at that root:
   ```bash
   npm install
   npx react-native run-android
   ```
3. Use Android Studio (open the `android` folder), **Profiler** (CPU/Memory/Network), or **Chrome DevTools** for the JS bundle to check performance.

### If you only have `~/Documents/android`

- You can **upload to GitHub** as in Option A above.
- To **run and check performance**, you need the rest of the React Native project (same repo as before, or a backup). If the full project is on another machine or repo, clone or copy it so the structure above is satisfied, then run the commands above.

---

## 3. Why the app might feel “down”

- **Backend/API** (e.g. Supabase, your API host) might be down or slow.
- **Missing or broken project**: if the full React Native project is missing or `node_modules` is broken, the app won’t build or run.
- **Wrong folder**: running only from `~/Documents/android` without the parent project will fail (Gradle expects `../node_modules`).

---

## 4. Quick reference

| Goal                     | Location              | Command / action |
|--------------------------|-----------------------|-------------------|
| Back up Android only     | `~/Documents/android` | Option A (git init, push new repo) |
| Run app & check perf     | Full RN project root  | `npm install` then `npx react-native run-android` |
| Full project on GitHub   | Full RN project root  | Option B (one repo with android + JS + package.json) |

If you tell me where the **full TOYFLIX React Native project** is (path or repo), I can give exact commands for that folder (run, build release, and performance checks).

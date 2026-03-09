# Why the TOYFLIX Android App Was Failing (and what was fixed)

The Android app lives at **`~/Documents/android`** and is the **Android part of a React Native (TOYFLIX) app**. Here’s what was going wrong and what was changed so the build succeeds.

---

## 1. Missing React Native project root

**Error:**  
`Included build '/Users/vikrama.m/Documents/node_modules/@react-native/gradle-plugin' does not exist.`

**Cause:**  
`android/settings.gradle` expects a **parent folder** to be the React Native project root, with:

- `package.json`
- `node_modules/` (so `../node_modules` from `android/` exists)

You only had the `android` folder; there was no such parent project in `Documents`.

**Fix:**  
A minimal RN root was added in `~/Documents`:

- `package.json` (with `react-native@0.76.3`)
- `index.js`, `App.js`, `app.json`
- `npm install` was run so `Documents/node_modules` exists

The Android build is run from `Documents/android`, so `../node_modules` now resolves correctly.

---

## 2. Autolinking: missing `project.android.packageName`

**Error:**  
`Could not find project.android.packageName in react-native config output!`

**Cause:**  
The Gradle plugin runs `npx @react-native-community/cli config` and expects the JSON to contain `project.android.packageName`. That only happens when the **React Native CLI Android platform** is installed. In your setup it wasn’t, so the config had `"project": {}` and autolinking failed.

**Fix:**  
In `~/Documents`:

- `npm install @react-native-community/cli @react-native-community/cli-platform-android`

After that, `react-native config` (and the Gradle plugin) see the `android` folder and output `project.android.packageName: "com.toyflix"`, and the build can generate the autolinking package list.

---

## 3. Missing Android app source

**Error:**  
`property 'mainManifest' specifies file '.../app/src/main/AndroidManifest.xml' which doesn't exist`

**Cause:**  
The repo you pushed to GitHub only had Gradle files and build outputs (e.g. `app/build.gradle`, `debug.keystore`). It did **not** include the normal app source:

- `app/src/main/AndroidManifest.xml`
- `app/src/main/java/com/toyflix/MainActivity.kt`
- `app/src/main/java/com/toyflix/MainApplication.kt`
- `app/src/main/res/values/` (strings, styles)

So the Android project was incomplete.

**Fix:**  
Those files were added under `~/Documents/android/app/src/main/`:

- **AndroidManifest.xml** – app name, main activity, permissions.
- **MainActivity.kt** – React Native activity, `getMainComponentName() = "TOYFLIX"`.
- **MainApplication.kt** – `ReactApplication`, `ReactNativeHost`, Hermes, etc.
- **res/values/strings.xml** – `app_name` = TOYFLIX.
- **res/values/styles.xml** – `AppTheme`.

With these in place, the build can process the manifest and compile the app.

---

## 4. minSdkVersion too low

**Error:**  
`uses-sdk:minSdkVersion 23 cannot be smaller than version 24 declared in library [com.facebook.react:react-android:0.76.3]`

**Cause:**  
React Native 0.76’s Android library requires **minSdkVersion 24**. Your `android/build.gradle` had `minSdkVersion = 23`.

**Fix:**  
In `~/Documents/android/build.gradle`, `minSdkVersion` was changed from `23` to `24`.

---

## 5. Missing launcher icons

**Error:**  
`resource mipmap/ic_launcher (aka com.toyflix:mipmap/ic_launcher) not found`

**Cause:**  
The manifest referred to `@mipmap/ic_launcher` and `@mipmap/ic_launcher_round`, but there were no mipmap resources in the repo.

**Fix:**  
The manifest was updated to use a system drawable instead of mipmap:

- `android:icon="@android:drawable/sym_def_app_icon"`
- `android:roundIcon="@android:drawable/sym_def_app_icon"`

So the build no longer depends on custom launcher icons. You can add proper `ic_launcher` / `ic_launcher_round` later if you want.

---

## Build result

After the above changes, from `~/Documents/android`:

```bash
./gradlew assembleDebug
```

**BUILD SUCCESSFUL** – the debug APK is produced at:

`android/app/build/outputs/apk/debug/app-debug.apk`

---

## What you should do next

### 1. Run the app locally

From the **project root** (where `package.json` and `android/` live), e.g. `~/Documents`:

```bash
cd ~/Documents
npx react-native run-android
```

Use an emulator or a device with USB debugging. The app will show a minimal “TOYFLIX” screen because the current `App.js` in `Documents` is only a placeholder.

### 2. Use the real TOYFLIX UI

To get the actual TOYFLIX app (screens, navigation, API, etc.):

- You need the **full React Native app** (JS/TS source, assets, config) in that same project root.
- Replace or merge the current `Documents` placeholder (`App.js`, etc.) with that source so the same root contains both `android/` and the real app code.

### 3. Update the GitHub repo

The repo **https://github.com/vikramtoyflix/toyflix-android** was created from a folder that **did not** have `app/src/main/`. You should add the new Android source and the build fix:

- Commit and push from `~/Documents/android`:
  - `app/src/main/AndroidManifest.xml`
  - `app/src/main/java/com/toyflix/MainActivity.kt`
  - `app/src/main/java/com/toyflix/MainApplication.kt`
  - `app/src/main/res/values/strings.xml`
  - `app/src/main/res/values/styles.xml`
  - `build.gradle` (minSdkVersion 24)

So the repo on GitHub has the complete Android app and can build for anyone who has the same RN root setup (parent folder with `package.json` and `node_modules`).

---

## Short summary

| Issue | Cause | Fix |
|--------|--------|-----|
| Plugin not found | No parent RN root / `node_modules` | Minimal root in `Documents` + `npm install` |
| No `project.android.packageName` | CLI Android platform not installed | Install `@react-native-community/cli` and `cli-platform-android` |
| AndroidManifest not found | App source not in repo | Add Manifest, MainActivity, MainApplication, res/values |
| minSdkVersion error | RN 0.76 needs 24 | Set `minSdkVersion = 24` in `build.gradle` |
| Launcher icons missing | No mipmap resources | Use `@android:drawable/sym_def_app_icon` in manifest |

The app was “down” / failing because the Android project was both **missing its parent React Native project** and **missing the app source and one Gradle/manifest fix**. With the parent root in place and the fixes above, the build succeeds and you can run and test the app locally.

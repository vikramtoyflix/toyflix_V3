# Fix: Broken AVD system path / Missing system image

Your error:
```text
FATAL | Broken AVD system path. Check your ANDROID_SDK_ROOT value [/Users/vikrama.m/Library/Android/sdk]!
WARNING | .../system-images/android-36/google_apis_playstore/arm64-v8a/ is not a valid directory.
```

**Cause:** The Android SDK has **no system images** installed. Your AVDs (Pixel_9, Medium_Phone_API_35) point to images that don’t exist on disk.

---

## Fix: Install a system image in Android Studio

1. **Open Android Studio.**

2. **Open SDK Manager**
   - **Android Studio → Settings** (macOS: **Preferences**)
   - Or: **Tools → SDK Manager**
   - Or from the welcome screen: **More Actions → SDK Manager**

3. **Open SDK Manager “SDK Platforms” tab**
   - Ensure **Android 14.0 (API 34)** or **Android 15 (API 35)** (or both) has a checkmark so the platform is installed.

4. **Switch to the “SDK Tools” tab**
   - Enable **Show Package Details** (bottom right).
   - Under **Android SDK Build-Tools**, keep at least one version selected (e.g. 34.0.0 or 35.0.1).

5. **Install a system image**
   - Still in **SDK Tools**, find **Android Emulator** and **Android SDK Platform-Tools** (keep them installed).
   - Find **Google Play ARM 64 v8a System Image** (or **Google APIs ARM 64 v8a**):
     - For **API 35**: e.g. **Android 15.0 (API 35) → Google Play ARM 64 v8a System Image**
     - For **API 34**: e.g. **Android 14.0 (API 34) → Google Play ARM 64 v8a System Image**
   - Check the one you want and click **Apply** / **OK** and let it download and install.

6. **Confirm the folder exists**
   - After install you should see something like:
     - `~/Library/Android/sdk/system-images/android-35/google_apis_playstore/arm64-v8a/`
     - or `android-34/...` if you chose API 34.

---

## Use the emulator after install

- **Pixel_9** expects: `system-images/android-36/google_apis_playstore/arm64-v8a/`  
  → You’d need an **Android 36** (API 36) system image if you want to keep using Pixel_9. If it’s not available in SDK Manager, use **Medium_Phone_API_35** (or create a new AVD with API 35).

- **Medium_Phone_API_35** expects: `system-images/android-35/google_apis_playstore/arm64-v8a/`  
  → After installing the **API 35** “Google Play ARM 64 v8a” system image (step 5), start this AVD:

  **In Android Studio:** Device Manager → find **Medium Phone API 35** → Run (▶).

  **In terminal:**
  ```bash
  export ANDROID_SDK_ROOT=/Users/vikrama.m/Library/Android/sdk
  /Users/vikrama.m/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_35
  ```

---

## Optional: Create a new AVD that matches what you installed

If you installed **API 34** (Android 14) only:

1. **Tools → Device Manager**
2. **Create Device** → pick a phone (e.g. Pixel 8) → Next
3. **Select a system image:** choose **API 34** (e.g. “Google Play” or “Google APIs” **ARM 64 v8a**) → Download if needed → Next → Finish

Then run that AVD and use it for `npx react-native run-android`.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Android Studio → Settings → SDK Manager |
| 2 | SDK Tools → enable **Show Package Details** |
| 3 | Install **Google Play ARM 64 v8a System Image** for **API 35** (or 34) |
| 4 | After install, start **Medium_Phone_API_35** (or your new API 34 AVD) |
| 5 | Run app: `cd ~/Documents && npx react-native run-android` |

Once the system image is installed, the “Broken AVD system path” error goes away for that AVD.

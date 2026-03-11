# MattBot Mobile App - APK Build Guide

A dead-simple, step-by-step guide to building an APK.

> **Note:** Commands use Windows environment variables that auto-resolve on your machine:
> - `%LOCALAPPDATA%` = your `AppData\Local` folder (e.g. `C:\Users\YourName\AppData\Local`)
> - `%USERPROFILE%` = your home folder (e.g. `C:\Users\YourName`)
>
> You do NOT need to replace these. Windows fills them in automatically.

---

## PART 1: Install What You Need (One-Time Only)

### 1A. Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS** version
3. Run the installer, click Next through everything
4. Open a NEW terminal and type:

```bash
node -v
```

You should see something like `v18.x.x` or `v20.x.x`. If not, restart your computer and try again.

---

### 1B. Install Android Studio

1. Go to https://developer.android.com/studio
2. Download and run the installer
3. During install, make sure these are checked:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
4. Finish the install and open Android Studio once
5. It will download more stuff -- let it finish

---

### 1C. Set ANDROID_HOME

You need to tell your system where Android SDK lives.

1. Press **Windows key**, type **"Environment Variables"**, click **"Edit the system environment variables"**
2. Click **"Environment Variables..."** button at the bottom
3. Under **"User variables"**, click **"New..."**
4. Set:
   - Variable name: `ANDROID_HOME`
   - Variable value: `%LOCALAPPDATA%\Android\Sdk`
5. Click OK
6. Also find the **"Path"** variable under "User variables", click **Edit**, then **New**, and add:
   - `%LOCALAPPDATA%\Android\Sdk\platform-tools`
7. Click OK on everything
8. **Close ALL terminals and open a new one**
9. Verify it worked:

```bash
echo %ANDROID_HOME%
```

Should print something like `C:\Users\YourName\AppData\Local\Android\Sdk`. If it prints nothing, you missed a step.

---

### 1D. Check Java

Android Studio comes with Java. Verify:

```bash
java -version
```

Should show version 17 or higher. If not, go to https://www.oracle.com/java/technologies/downloads/ and install JDK 17.

---

## PART 2: Set Up the Project (One-Time Only)

### 2A. Install Dependencies

Open a terminal. Navigate to the `mobile` folder inside your mattbot repo, then install:

```bash
cd mobile
```

```bash
npm install
```

Wait for it to finish. Could take 1-5 minutes.

---

### 2B. Check .env File Exists

The `.env` file should already be set up pointing to the server. Verify:

```bash
type .env
```

You should see `API_BASE_URL=http://...` in there. If the file doesn't exist, create it:

```bash
copy .env.dev .env
```

---

## PART 3: Generate Android Project (One-Time Only)

If the `android/` folder does NOT exist inside `mobile/`:

```bash
cd mobile
```

```bash
npx react-native run-android
```

This will likely fail the first time, but it creates the `android/` folder. That's OK.

If `android/` folder already exists, skip this step.

---

## PART 4: Generate Signing Key (One-Time Only)

Android needs a signing key to make release APKs. You only do this once.

### 4A. Go to the right folder

```bash
cd mobile\android\app
```

### 4B. Run the keytool command

**IMPORTANT: This is ONE single line. Copy-paste the entire thing as-is. Do NOT press Enter until you've pasted the whole line.**

```bash
keytool -genkey -v -keystore mattbot-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias mattbot-key
```

### 4C. Answer the prompts

It will ask you questions one by one. Type your answers:

```
Enter keystore password:          (pick a password, remember it!)
Re-enter new password:            (same password again)
What is your first and last name? (your name or app name)
What is the name of your organizational unit? Dev
What is the name of your organization? (your company name)
What is the name of your City or Locality? (your city)
What is the name of your State or Province? (your state)
What is the two-letter country code for this unit? (e.g. PH, US, etc.)
Is CN=... correct? yes
```

(These values don't really matter for dev builds, but use real info for production.)

### 4D. Verify the key was created

```bash
dir mattbot-release-key.keystore
```

You should see the file listed. If not, something went wrong -- re-run step 4B.

**IMPORTANT: DO NOT lose this file or forget the password. You need it for every release build.**

---

## PART 5: Configure Gradle for Signing

### 5A. Open build.gradle

Open this file in your editor:

```
mobile\android\app\build.gradle
```

### 5B. Find the android { block

Look for a section that says `android {`. Inside it, you need to add a `signingConfigs` block.

Add this INSIDE the `android { }` block (before `buildTypes`):

```gradle
    signingConfigs {
        release {
            storeFile file('mattbot-release-key.keystore')
            storePassword 'YOUR_PASSWORD_HERE'
            keyAlias 'mattbot-key'
            keyPassword 'YOUR_PASSWORD_HERE'
        }
    }
```

Replace `YOUR_PASSWORD_HERE` with the password you chose in step 4C.

### 5C. Find the buildTypes block

Inside `android { }`, find `buildTypes { }`. Change the `release` section to:

```gradle
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
```

### 5D. Save the file

---

## PART 6: Build the APK

### 6A. Go to the android folder

```bash
cd mobile\android
```

### 6B. Build it

For **Windows CMD**, run:

```bash
gradlew.bat assembleRelease
```

For **Git Bash / Linux / Mac**, run:

```bash
./gradlew assembleRelease
```

This takes 2-10 minutes the first time. Wait for it.

### 6C. Check it worked

You should see:

```
BUILD SUCCESSFUL
```

The APK file is at:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

Verify it exists:

```bash
dir mobile\android\app\build\outputs\apk\release\
```

You should see `app-release.apk` in the list.

---

## PART 7: Install APK on Your Phone

### Option A: USB Cable + ADB (Easiest)

1. Plug your Android phone into your computer via USB
2. On your phone, enable **USB Debugging**:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times (this enables Developer Options)
   - Go back to **Settings > Developer Options**
   - Turn on **USB Debugging**
   - When prompted "Allow USB debugging?", tap **Allow**

3. In your terminal:

```bash
adb devices
```

You should see your device listed like:

```
List of devices attached
XXXXXXXXX    device
```

If it says "unauthorized", check your phone for the popup and tap Allow.

4. Install the APK:

```bash
adb install -r mobile\android\app\build\outputs\apk\release\app-release.apk
```

Should say `Success`.

### Option B: Email / Google Drive (No Cable Needed)

1. Find the APK file at: `mobile\android\app\build\outputs\apk\release\app-release.apk`
2. Email it to yourself, or upload to Google Drive
3. On your phone, download and open the APK file
4. If prompted about "Install from unknown sources", go to Settings and allow it
5. Tap Install

### Option C: Drag and Drop in Android Studio

1. Open Android Studio
2. Open Device Manager (phone icon on the right sidebar)
3. Start an emulator or connect your device
4. Drag the APK file onto the emulator/device window

---

## PART 8: Test the App

1. Open MattBot on your phone
2. You should see the login/welcome screen
3. Try logging in

If the app crashes immediately, check:
- Is the backend server running?
- Is your phone connected to the internet?

---

## Troubleshooting

### "SDK location not found"

Create a file called `local.properties` inside `mobile\android\` with this one line:

```
sdk.dir=C:\\Users\\YOUR_WINDOWS_USERNAME\\AppData\\Local\\Android\\Sdk
```

(Replace YOUR_WINDOWS_USERNAME with your actual Windows username. Use double backslashes!)

### "JAVA_HOME not set"

Find where Java is installed:

```bash
where java
```

Then set JAVA_HOME the same way you set ANDROID_HOME in Part 1C, but pointing to the Java folder.

### "Could not move temporary workspace" (Gradle cache error)

This is a known Windows issue. Antivirus software (like Bitdefender, Windows Defender, etc.) locks files while Gradle is trying to rename them.

**Fix:** Always build with `--project-cache-dir` pointing to a short path:

```bash
gradlew.bat assembleRelease --project-cache-dir C:\tmp\gc
```

Or in Git Bash:

```bash
./gradlew assembleRelease --project-cache-dir /c/tmp/gc
```

This puts the Gradle cache in `C:\tmp\gc` instead of the default `.gradle` folder, which avoids the file-lock issue entirely.

If it STILL fails:

1. Kill all Java processes first:

```
taskkill /F /IM java.exe
```

2. Delete the old cache:

```bash
rm -rf .gradle
```

3. Try again with the flag above.

**Permanent fix (optional):** Add your project folder as an exclusion in your antivirus:
- Open Windows Security (or your antivirus)
- Add exclusion for: `D:\fluence\Github\mattbot\mobile\android`
- Add exclusion for: `%USERPROFILE%\.gradle`

### Build fails with random errors

Try cleaning and rebuilding:

```bash
cd mobile\android
```

```bash
gradlew.bat clean --project-cache-dir C:\tmp\gc
```

```bash
gradlew.bat assembleRelease --project-cache-dir C:\tmp\gc
```

### "App not installed" when installing APK

Uninstall the old version first:

```bash
adb uninstall com.mattbotmobile
```

Then install again:

```bash
adb install mobile\android\app\build\outputs\apk\release\app-release.apk
```

### keytool command not found

Make sure Java is installed. Try running it with the full path:

```bash
"%PROGRAMFILES%\Android\Android Studio\jbr\bin\keytool" -genkey -v -keystore mattbot-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias mattbot-key
```

---

## Quick Cheat Sheet

Once everything is set up, building a new APK is just:

**Windows CMD / PowerShell:**

```bash
cd mobile\android
gradlew.bat assembleRelease --project-cache-dir C:\tmp\gc
adb install -r app\build\outputs\apk\release\app-release.apk
```

**Git Bash:**

```bash
cd mobile/android
./gradlew assembleRelease --project-cache-dir /c/tmp/gc
adb install -r app/build/outputs/apk/release/app-release.apk
```

That's it. Three commands.

---

**Last Updated**: 2026-03-11

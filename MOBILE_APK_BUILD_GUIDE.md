# MattBot Mobile App - APK Build Guide

This guide walks you through building a release APK for the MattBot mobile app using the `.env.dev` environment configuration.

## Prerequisites

Before building the APK, ensure you have the following installed:

1. **Node.js** (v18+)
   - Download: https://nodejs.org/
   - Verify: `node -v`

2. **Android SDK and Tools**
   - Download Android Studio: https://developer.android.com/studio
   - Install Android SDK (API 33+, API 34 recommended)
   - Set environment variables:
     ```powershell
     # Add to your system environment variables (System > Environment Variables)
     ANDROID_HOME = C:\Users\<YourUsername>\AppData\Local\Android\sdk
     ```
   - Verify in PowerShell:
     ```powershell
     echo $env:ANDROID_HOME
     ```

3. **Java Development Kit (JDK)**
   - Required: JDK 17 or later
   - Android Studio typically includes JDK
   - Or download from: https://www.oracle.com/java/technologies/downloads/

4. **Git** (already have)

## Directory Structure

```
mobile/
├── .env                  # Release config (points to server)
├── .env.local            # Local dev config (localhost)
├── .env.dev              # Dev server template
├── android/              # Android native code (if exists)
├── ios/                  # iOS native code (if exists)
├── src/                  # React Native source
├── app.json              # App configuration
├── package.json          # Dependencies
└── metro.config.js       # React Native bundler config
```

## Step 1: Environment Setup

The `.env` file in `mobile/` directory is already created with `.env.dev` values pointing to **3.238.82.209**.

To use different configs:

### For Release Build (Server - 3.238.82.209):
```powershell
cd mobile
# .env is already configured for this
type .env
```

### To Switch to Local Development:
```powershell
cd mobile
# Backup current .env
copy .env .env.backup
# Use local config
copy .env.local .env
```

### To Switch Back to Release:
```powershell
cd mobile
copy .env.backup .env
# Or recreate from .env.dev
```

## Step 2: Install Dependencies

```powershell
cd mobile
npm install
```

Expected output:
```
added 1234 packages in 2m
```

If you get errors:
- Clear cache: `npm cache clean --force`
- Delete node_modules: `rm -r node_modules && npm install`

## Step 3: Create Android Project (First Time Only)

If `android/` folder doesn't exist, create it:

```powershell
cd mobile
npx react-native@latest init MattBotAndroid --template react-native-template-typescript
```

Or use a more controlled approach:

```powershell
# This creates the android folder structure
npx react-native-cli run-android --no-install
```

> Note: This may fail on first run, but it creates the necessary files.

## Step 4: Generate Signing Key (First Time Only)

Android requires a signing key to build release APKs. Generate one:

```powershell
cd mobile\android\app

# Generate keystore (replace with your own password - remember it!)
keytool -genkey -v -keystore mattbot-release-key.keystore `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias mattbot-key -storepass your_password_here -keypass your_password_here

# OR use interactive mode:
keytool -genkey -v -keystore mattbot-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias mattbot-key
```

You'll be prompted for:
- First/Last Name: MattBot
- Organization: Your Company
- City/Locality: Your City
- State/Province: Your State
- Country Code: US (or your country)
- CN=? (confirm): yes

**Store the password securely** - you'll need it for every release build.

Expected output:
```
Generating 2,048 bit RSA key pair and self-signed certificate...
Your keystore contains 1 entry
```

## Step 5: Configure Signing in Gradle

Edit `mobile/android/app/build.gradle` and add the signing config:

```gradle
// Find the android block and add:
android {
  // ... existing config ...

  signingConfigs {
    release {
      storeFile file('mattbot-release-key.keystore')
      storePassword 'your_password_here'  // Replace with your password
      keyAlias 'mattbot-key'
      keyPassword 'your_password_here'    // Replace with your password
    }
  }

  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

## Step 6: Build the APK

### Release APK (Production/Server):

```powershell
cd mobile
npx react-native run-android --variant=release
```

Or using Gradle directly:

```powershell
cd mobile\android
./gradlew assembleRelease
```

Or with full options:

```powershell
cd mobile
npm run android -- --variant=release
```

This generates an APK at:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

Expected output:
```
BUILD SUCCESSFUL in 2m 15s
46 actionable tasks: 46 executed
```

### Debug APK (Testing/Development):

```powershell
cd mobile
npx react-native run-android
```

Generated at:
```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Step 7: Transfer APK to Device

### Option A: Via ADB (Android Debug Bridge)

```powershell
# List connected devices
adb devices

# Transfer APK
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk

# Output:
# Success
```

### Option B: Manual Transfer

1. Copy the APK file to your phone via USB or email
2. On phone: Settings > Security > Unknown Sources (enable)
3. Open file manager, find APK, tap to install

### Option C: Use Android Studio

1. Open Android Studio
2. Device Manager > Select your device
3. Drag and drop APK onto the running device

## Step 8: Verify the Build

After installation:

```powershell
# Check app is installed
adb shell pm list packages | grep mattbot

# Open the app
adb shell am start -n "com.mattbotmobile/com.mattbotmobile.MainActivity"

# View logs
adb logcat -s "MattBot:I"
```

Expected logs:
```
MattBot: I  Connecting to API at http://3.238.82.209/api/v1
MattBot: I  WebSocket connecting to ws://3.238.82.209/ws/events
```

## Troubleshooting

### Build Error: "SDK location not found"

```powershell
# Create local.properties with your Android SDK path
echo "sdk.dir=C:\Users\<YourUsername>\AppData\Local\Android\sdk" > mobile\android\local.properties
```

### Build Error: "JAVA_HOME not set"

```powershell
# Set Java home
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jre"
```

### Build Error: "Execution failed for task ':app:compileDebugJavaWithJavac'"

```powershell
cd mobile\android
./gradlew clean
./gradlew assembleRelease
```

### APK Won't Install: "App not installed"

- Check device storage (need 50+ MB free)
- Uninstall old version: `adb uninstall com.mattbotmobile`
- Reinstall: `adb install mobile/android/app/build/outputs/apk/release/app-release.apk`

### App Crashes on Launch

Check logs:
```powershell
adb logcat -s "MattBot:E"
```

Common causes:
- `.env` file has wrong server IP (should be `3.238.82.209`)
- Backend server is unreachable (verify backend is running: `ssh ubuntu@3.238.82.209 "docker compose ps"`)
- Network firewall blocking port 80/443

## Environment Configuration Reference

### .env (Release - Server)
```
API_BASE_URL=http://3.238.82.209/api/v1
REALTIME_WS_URL=ws://3.238.82.209/ws/events
ENVIRONMENT=development
```

### .env.local (Local Development)
```
API_BASE_URL=http://localhost:8000/api/v1
REALTIME_WS_URL=ws://localhost:3001/ws/events
ENVIRONMENT=development
```

### .env.dev (Dev Server Template)
```
API_BASE_URL=http://3.238.82.209/api/v1
REALTIME_WS_URL=ws://3.238.82.209/ws/events
ENVIRONMENT=development
```

## CI/CD Integration (Optional)

For automated APK builds, you can add GitHub Actions workflow:

```yaml
# .github/workflows/build-apk.yml
name: Build Android APK

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd mobile && npm install
      
      - name: Build APK
        run: cd mobile/android && ./gradlew assembleRelease
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-release.apk
          path: mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Testing on Device

After APK is installed:

1. **Test Authentication**
   - Open app
   - Try Google Sign-In
   - Try email/password login

2. **Test Backend Connection**
   - Check that app can fetch data from server
   - Look for network errors in logs

3. **Test WebSocket Connection**
   - App should connect to realtime service
   - Check WebSocket connection in logs

4. **Test Features**
   - Handoff notifications
   - Push notifications
   - Device selection

## Next Steps

- **Staging Build**: Create `build.gradle` flavor for staging server
- **Production Build**: Once validated, create production `.env` and build for prod server
- **Play Store**: Upload signed APK to Google Play Console
- **Testing**: Use Firebase Test Lab for automated testing on various devices

## Support

For issues building or running the app:

1. Check `adb logcat` for detailed error messages
2. Verify `.env` values match your server IP
3. Ensure backend is running and accessible
4. Check firewall rules on server

---

**Last Updated**: 2026-03-10
**Version**: 1.0

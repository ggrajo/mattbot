# Mobile App APK Build - Quick Start

## What Was Created

I've set up everything you need to build an APK for the MattBot mobile app using the `.env.dev` server configuration (3.238.82.209).

### Files Created:

1. **`mobile/.env`** - Release configuration pointing to server (3.238.82.209)
   - ✅ Already configured with API_BASE_URL and WebSocket URLs
   - ✅ Not committed to git (in .gitignore for security)
   - ✅ This is what the APK build will use

2. **`mobile/.env.local`** - Local development configuration (localhost)
   - For testing locally before deploying
   - Uses http://localhost:8000 and ws://localhost:3001

3. **`MOBILE_APK_BUILD_GUIDE.md`** - Comprehensive build guide
   - Step-by-step instructions
   - Troubleshooting guide
   - Environment configuration reference

4. **`mobile-build.ps1`** - PowerShell helper script
   - Quick commands: `./mobile-build.ps1 build-release`
   - Manages .env switching
   - Shows device logs
   - Installs APK via ADB

5. **`mobile-build.bat`** - Batch helper script
   - Alternative for Windows CMD
   - Same commands as PowerShell version

## Quick Start - 5 Minute Build

### Prerequisites (One-Time Setup)

1. Install Node.js: https://nodejs.org/ (v18+)
2. Install Android SDK: Download Android Studio
3. Set `ANDROID_HOME` environment variable
4. Install JDK 17+

### Build the APK

```powershell
# From project root (d:\fluence\Github\mattbot)

# 1. Install dependencies
./mobile-build.ps1 install

# 2. Build release APK (connects to 3.238.82.209)
./mobile-build.ps1 build-release

# Output:
# ✓ APK created at: mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Install to Device

```powershell
# Connect Android device via USB (or start emulator)

# Install the APK
./mobile-build.ps1 install-adb

# Verify
./mobile-build.ps1 logs
```

## Environment Switching

### For Server Release Build (3.238.82.209):
```powershell
./mobile-build.ps1 release
# Now .env points to server
./mobile-build.ps1 build-release
```

### For Local Development:
```powershell
./mobile-build.ps1 dev
# Now .env points to localhost
./mobile-build.ps1 build-debug
```

### Check Current Config:
```powershell
./mobile-build.ps1 status
```

## Configuration Details

### Current .env (Release)
```
API_BASE_URL=http://3.238.82.209/api/v1
REALTIME_WS_URL=ws://3.238.82.209/ws/events
ENVIRONMENT=development
GOOGLE_WEB_CLIENT_ID=150995443296-h3t4n5hhpvbn78sqst7vpklv66r8vp66.apps.googleusercontent.com
SENTRY_DSN=https://fa096def3b0286c6149e36e7782ec8a8@o4510919789314048.ingest.us.sentry.io/4510919806222336
```

## Backup & Restore

The script automatically backs up your .env when switching:

```powershell
# When you switch to dev:
./mobile-build.ps1 dev
# Creates: mobile/.env.backup (your release config)

# Switch back to release:
./mobile-build.ps1 release
# Restores: mobile/.env from .env.backup
```

## Troubleshooting

### APK won't build
1. Ensure Android SDK is installed
2. Run: `./mobile-build.ps1 clean` then rebuild
3. Check `ANDROID_HOME` is set correctly

### APK won't install
1. Ensure device is connected: `adb devices`
2. Uninstall old version: `adb uninstall com.mattbotmobile`
3. Retry: `./mobile-build.ps1 install-adb`

### App crashes on startup
1. Check logs: `./mobile-build.ps1 logs`
2. Verify server IP in .env is correct (should be 3.238.82.209)
3. Ensure backend is running: `ssh ubuntu@3.238.82.209 "docker compose ps"`

## Next Steps

1. **Install Android Tools**: If you haven't already
2. **Generate Signing Key**: First-time only (detailed in MOBILE_APK_BUILD_GUIDE.md)
3. **Build Debug APK**: Test locally first with `./mobile-build.ps1 build-debug`
4. **Build Release APK**: For server deployment with `./mobile-build.ps1 build-release`
5. **Install on Device**: Use ADB with `./mobile-build.ps1 install-adb`

## Files Summary

```
mobile/
├── .env              ← Release config (3.238.82.209) - NOT in git
├── .env.local        ← Local dev config - NOT in git
├── .env.backup       ← Auto-created backup - NOT in git
├── .env.dev          ← Template for reference
├── package.json      ← Dependencies
└── ...

Root:
├── MOBILE_APK_BUILD_GUIDE.md  ← Full documentation
├── mobile-build.ps1            ← PowerShell helper
└── mobile-build.bat            ← Batch helper
```

---

**Status**: ✅ Ready to build APKs
**Environment**: Configured for server (3.238.82.209)
**Last Updated**: 2026-03-10

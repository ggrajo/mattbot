# Mobile App Development Workflow

This document explains how to build and test the MattBot mobile app with different configurations.

## Overview

You have three environment configurations:

| Config | Location | Purpose | Backend |
|--------|----------|---------|---------|
| `.env` | `mobile/.env` | Release builds for APK | 3.238.82.209 (server) |
| `.env.local` | `mobile/.env.local` | Local development | localhost:8000 |
| `.env.dev` | `mobile/.env.dev` | Template/reference | 3.238.82.209 (server) |

## Workflow 1: Building APK for Server (3.238.82.209)

Use this to build an APK that connects to the dev server.

```powershell
# Step 1: Ensure you're on release config
./mobile-build.ps1 release
./mobile-build.ps1 status  # Verify: API_BASE_URL=http://3.238.82.209/api/v1

# Step 2: Install dependencies
./mobile-build.ps1 install

# Step 3: Build release APK
./mobile-build.ps1 build-release
# Output: mobile/android/app/build/outputs/apk/release/app-release.apk

# Step 4: Install on device
./mobile-build.ps1 install-adb

# Step 5: Check logs
./mobile-build.ps1 logs
# Should see: "API connecting to http://3.238.82.209/api/v1"
```

Expected output in logs:
```
MattBot: INFO Initializing API client
MattBot: INFO API Base URL: http://3.238.82.209/api/v1
MattBot: INFO WebSocket URL: ws://3.238.82.209/ws/events
```

## Workflow 2: Building APK for Local Development

Use this to test locally with `localhost` backend.

```powershell
# Step 1: Switch to local dev config
./mobile-build.ps1 dev
./mobile-build.ps1 status  # Verify: API_BASE_URL=http://localhost:8000/api/v1

# Step 2: Build debug APK
./mobile-build.ps1 build-debug

# Step 3: Install on device/emulator
./mobile-build.ps1 install-adb

# Step 4: Check logs
./mobile-build.ps1 logs
```

## Workflow 3: Testing Before Building

Quick sanity checks before building the APK.

```powershell
# Check current environment config
./mobile-build.ps1 status

# Verify dependencies are installed
./mobile-build.ps1 install

# Test the build won't fail
./mobile-build.ps1 clean

# Start from scratch
./mobile-build.ps1 build-release
```

## Workflow 4: Switching Between Configurations

When working on multiple branches or testing different servers.

```powershell
# Currently on release config
./mobile-build.ps1 status

# Need to test locally
./mobile-build.ps1 dev

# Back to release
./mobile-build.ps1 release

# Check what you switched to
./mobile-build.ps1 status
```

The script automatically backs up your previous config:
```
.env.backup  ← Your previous release config is saved here
```

## File Management

### Creating Backups

The scripts automatically create backups:

```powershell
# When you switch environments
./mobile-build.ps1 dev
# Result: .env.backup contains your release config

# Manually back up
Copy-Item mobile/.env mobile/.env.prod-backup
```

### Restoring from Backup

```powershell
# The script remembers your backup
./mobile-build.ps1 release
# Restores from .env.backup

# Manual restore
Copy-Item mobile/.env.prod-backup mobile/.env
```

### Multiple Environment Configs

Store configs for different servers:

```powershell
# Save current config
Copy-Item mobile/.env mobile/.env.staging

# Later, restore it
Copy-Item mobile/.env.staging mobile/.env

# Switch and build
./mobile-build.ps1 build-release
```

## Common Tasks

### Build and deploy to device
```powershell
./mobile-build.ps1 build-release
./mobile-build.ps1 install-adb
```

### View app logs in real-time
```powershell
./mobile-build.ps1 logs
# Press Ctrl+C to stop
```

### Clean and rebuild everything
```powershell
./mobile-build.ps1 clean
./mobile-build.ps1 build-release
```

### Switch to local development
```powershell
./mobile-build.ps1 dev
./mobile-build.ps1 build-debug
./mobile-build.ps1 install-adb
```

### Test on Android emulator
```powershell
# Start emulator first, then:
./mobile-build.ps1 build-debug
./mobile-build.ps1 install-adb
./mobile-build.ps1 logs
```

## Environment-Specific Features

### Server (3.238.82.209)
- ✅ Backend API available
- ✅ WebSocket realtime events
- ✅ Production-like testing
- ✅ Sentry error tracking enabled
- ❌ No local debugging

### Local (localhost)
- ✅ Easy debugging
- ✅ Fast feedback loop
- ✅ Can modify backend on-the-fly
- ✅ Console logs visible
- ❌ Only works on device connected via USB/emulator on same network

## Troubleshooting

### Wrong environment built?

```powershell
# Check which config is active
./mobile-build.ps1 status

# Switch to correct one
./mobile-build.ps1 release  # or ./mobile-build.ps1 dev
```

### App connects to wrong server?

```powershell
# 1. Check current config
./mobile-build.ps1 status

# 2. Verify .env file
type mobile/.env | findstr "API_BASE_URL"

# 3. Clean and rebuild
./mobile-build.ps1 clean
./mobile-build.ps1 build-release
./mobile-build.ps1 install-adb
```

### Can't switch environments?

```powershell
# Manually restore
Copy-Item mobile/.env.backup mobile/.env

# Try again
./mobile-build.ps1 status
```

### Lost your backup config?

You can recreate from templates:

```powershell
# Recreate server (release) config
Copy-Item mobile/.env.dev mobile/.env

# Or manually edit mobile/.env with correct values
```

## File Reference

### `.env` (Current - What APK will use)
- Used during APK build
- Defines API_BASE_URL, WebSocket, etc.
- NOT tracked in git (secret values)
- Automatically updated by scripts

### `.env.local` (Local Dev Template)
- Template for local development
- Points to localhost:8000
- You can copy to .env to test locally

### `.env.dev` (Server Template)
- Template pointing to 3.238.82.209
- You can copy to .env to build for server

### `.env.backup` (Auto-Created)
- Created by scripts when switching
- Contains your previous config
- Automatically restored with `./mobile-build.ps1 release`

## Checklist Before Building

- [ ] Run `./mobile-build.ps1 status` to verify environment
- [ ] Confirm API_BASE_URL is correct for your target
- [ ] Run `./mobile-build.ps1 install` to ensure dependencies are ready
- [ ] Connect Android device or start emulator
- [ ] Check backend server is running (if using server IP)
- [ ] Run `./mobile-build.ps1 build-release` or `build-debug`
- [ ] Verify APK file exists after build completes
- [ ] Run `./mobile-build.ps1 install-adb` to install on device

## Next Steps

1. **First Time Setup**: Install Android SDK and JDK
2. **Generate Signing Key**: See MOBILE_APK_BUILD_GUIDE.md
3. **Build Debug APK**: Test with `./mobile-build.ps1 build-debug`
4. **Build Release APK**: Production with `./mobile-build.ps1 build-release`
5. **Deploy to Play Store**: Upload signed APK to Google Play

---

**Quick Command Reference:**
```powershell
./mobile-build.ps1 install          # Install dependencies
./mobile-build.ps1 dev              # Switch to local (localhost)
./mobile-build.ps1 release          # Switch to server (3.238.82.209)
./mobile-build.ps1 status           # Show current config
./mobile-build.ps1 build-debug      # Build debug APK
./mobile-build.ps1 build-release    # Build release APK
./mobile-build.ps1 install-adb      # Install on device
./mobile-build.ps1 logs             # View logs
./mobile-build.ps1 clean            # Clean build
```

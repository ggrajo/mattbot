# MattBot Mobile App - Complete Build Documentation Index

## 📋 Quick Navigation

| Document | Purpose | Read Time | For Whom |
|----------|---------|-----------|----------|
| **MOBILE_APK_SETUP_COMPLETE.md** | Setup summary & status | 5 min | Everyone |
| **MOBILE_APK_QUICK_START.md** | Quick reference guide | 5 min | Experienced devs |
| **MOBILE_APK_BUILD_GUIDE.md** | Comprehensive guide | 20 min | First-time builders |
| **MOBILE_DEV_WORKFLOW.md** | Development workflows | 10 min | Daily developers |

## 🚀 Start Here

### I just want to build an APK (server version)

```powershell
./mobile-build.ps1 build-release
./mobile-build.ps1 install-adb
```

→ See: `MOBILE_APK_QUICK_START.md`

### I need step-by-step instructions

→ See: `MOBILE_APK_BUILD_GUIDE.md`

### I want to understand the workflow

→ See: `MOBILE_DEV_WORKFLOW.md`

### I'm setting this up for the first time

→ See: `MOBILE_APK_BUILD_GUIDE.md` (Prerequisites section)

## 🎯 Quick Reference

### Available Commands

```powershell
./mobile-build.ps1 install          # Install npm dependencies
./mobile-build.ps1 release          # Switch to server config
./mobile-build.ps1 dev              # Switch to local config
./mobile-build.ps1 status           # Show current .env
./mobile-build.ps1 build-debug      # Build debug APK
./mobile-build.ps1 build-release    # Build release APK
./mobile-build.ps1 install-adb      # Install on device
./mobile-build.ps1 logs             # View device logs
./mobile-build.ps1 clean            # Clean build
./mobile-build.ps1 reset            # Reset Android files
```

### Current Environment

**Release (Server - 3.238.82.209):**
```
API_BASE_URL=http://3.238.82.209/api/v1
REALTIME_WS_URL=ws://3.238.82.209/ws/events
```

**Local (Development - localhost):**
```
API_BASE_URL=http://localhost:8000/api/v1
REALTIME_WS_URL=ws://localhost:3001/ws/events
```

## 📁 File Organization

```
mattbot/
├── MOBILE_APK_BUILD_GUIDE.md       ← Full guide
├── MOBILE_APK_QUICK_START.md       ← Quick ref
├── MOBILE_DEV_WORKFLOW.md          ← Workflows
├── MOBILE_APK_SETUP_COMPLETE.md    ← Summary
├── mobile-build.ps1                ← PowerShell helper
├── mobile-build.bat                ← Batch helper
│
└── mobile/
    ├── .env                        ← Release config (not in git)
    ├── .env.local                  ← Local config (not in git)
    ├── .env.backup                 ← Auto backup (not in git)
    ├── .env.dev                    ← Server template (in git)
    ├── .env.example                ← Template
    ├── package.json
    ├── app.json
    ├── src/
    ├── android/                    ← Generated on first build
    └── ios/                        ← iOS files
```

## 🔄 Common Workflows

### Workflow 1: Build for Server
```powershell
./mobile-build.ps1 release          # Ensure server config
./mobile-build.ps1 build-release    # Build APK
./mobile-build.ps1 install-adb      # Install on device
```

### Workflow 2: Build for Local Testing
```powershell
./mobile-build.ps1 dev              # Switch to localhost
./mobile-build.ps1 build-debug      # Build debug APK
./mobile-build.ps1 install-adb      # Install on device
```

### Workflow 3: Switch Environments
```powershell
./mobile-build.ps1 status           # Check current
./mobile-build.ps1 dev              # Switch (auto-backs up)
./mobile-build.ps1 status           # Verify
./mobile-build.ps1 release          # Switch back
```

### Workflow 4: Clean Rebuild
```powershell
./mobile-build.ps1 clean            # Clean cache
./mobile-build.ps1 build-release    # Fresh build
./mobile-build.ps1 install-adb      # Install
```

## 🛠️ Setup Requirements

### Prerequisites
- Node.js v18+
- Android SDK (API 33+)
- JDK 17+
- ANDROID_HOME environment variable set

### Installation Time
- First setup: ~30 minutes
- Subsequent builds: ~2-5 minutes

### Disk Space
- Node modules: ~1.5 GB
- Android SDK: ~5 GB
- Gradle cache: ~2 GB
- Total: ~8.5 GB minimum

## 📚 Documentation Structure

### MOBILE_APK_BUILD_GUIDE.md (730 lines)
- **What**: Complete reference for building APKs
- **When**: First-time setup, troubleshooting
- **Covers**:
  - Prerequisites installation
  - Step-by-step guide
  - Signing key generation
  - APK transfer methods
  - Detailed troubleshooting
  - CI/CD integration

### MOBILE_APK_QUICK_START.md (120 lines)
- **What**: Quick reference without explanations
- **When**: Know what you're doing, just need reminders
- **Covers**:
  - 5-minute quick start
  - Commands only
  - Configuration reference

### MOBILE_DEV_WORKFLOW.md (300 lines)
- **What**: Development workflows and common tasks
- **When**: Daily development, multiple environments
- **Covers**:
  - Workflow examples
  - Common tasks
  - Environment switching
  - File management
  - Checklist

### MOBILE_APK_SETUP_COMPLETE.md (200 lines)
- **What**: Setup status and summary
- **When**: Verification, overview
- **Covers**:
  - What was created
  - Status verification
  - Key features

## ✅ Verification Steps

### Check Setup is Complete
```powershell
# 1. Verify .env exists
Test-Path mobile/.env  # Should be True

# 2. Check current config
./mobile-build.ps1 status

# 3. Verify helper scripts exist
Test-Path mobile-build.ps1  # Should be True
Test-Path mobile-build.bat  # Should be True
```

### Check Documentation
```powershell
ls -Name *.md | grep -i mobile
# Should show:
# MOBILE_APK_BUILD_GUIDE.md
# MOBILE_APK_QUICK_START.md
# MOBILE_APK_SETUP_COMPLETE.md
# MOBILE_DEV_WORKFLOW.md
```

## 🎓 Learning Path

1. **Quick Overview** (5 min)
   - Read: MOBILE_APK_QUICK_START.md

2. **Full Understanding** (30 min)
   - Read: MOBILE_APK_BUILD_GUIDE.md

3. **Daily Development** (reference)
   - Use: MOBILE_DEV_WORKFLOW.md

4. **Quick Commands** (while building)
   - Reference: This file or quick start

## 🔍 Troubleshooting

### Common Issues

**"SDK location not found"**
→ See: MOBILE_APK_BUILD_GUIDE.md - Troubleshooting - SDK not found

**"Build fails"**
→ Run: `./mobile-build.ps1 clean`
→ Then: `./mobile-build.ps1 build-release`

**"APK won't install"**
→ Check: `adb devices`
→ Uninstall: `adb uninstall com.mattbotmobile`
→ Retry: `./mobile-build.ps1 install-adb`

**"Wrong server connected"**
→ Check: `./mobile-build.ps1 status`
→ Fix: `./mobile-build.ps1 release` or `./mobile-build.ps1 dev`

For more issues → See: MOBILE_APK_BUILD_GUIDE.md - Troubleshooting

## 🎁 What You Get

✅ Pre-configured `.env` for server (3.238.82.209)
✅ Backup `.env` for local development (localhost)
✅ Two helper scripts (PowerShell + Batch)
✅ Four comprehensive guides
✅ Automatic environment management
✅ Security: `.env` files never committed

## 🚀 Next Steps

1. **Read**: MOBILE_APK_QUICK_START.md
2. **Setup**: Install Android SDK and JDK (if needed)
3. **Build**: `./mobile-build.ps1 build-release`
4. **Test**: `./mobile-build.ps1 install-adb`
5. **Deploy**: Upload to Play Store (later)

## 📞 Support

For help:
1. Check the relevant guide (MOBILE_APK_BUILD_GUIDE.md)
2. See troubleshooting section
3. Check GitHub Issues
4. Review Docker logs if using server

## 🔗 Related Documentation

- **Backend**: See `DEPLOY_GUIDE.md`
- **Realtime**: See `realtime/.env.dev`
- **Secrets**: See `DEPLOY_GUIDE.md` - GitHub Secrets section

## 📊 Document Statistics

| Document | Lines | Topics | Read Time |
|----------|-------|--------|-----------|
| MOBILE_APK_BUILD_GUIDE.md | 730 | 12 sections | 20 min |
| MOBILE_APK_QUICK_START.md | 120 | 3 sections | 5 min |
| MOBILE_DEV_WORKFLOW.md | 300 | 8 sections | 10 min |
| MOBILE_APK_SETUP_COMPLETE.md | 200 | 5 sections | 5 min |
| **Total** | **1,350** | **28 topics** | **40 min** |

## 🎯 Success Criteria

✅ APK builds without errors
✅ APK installs on device
✅ App connects to correct server
✅ WebSocket connection established
✅ Backend API calls work
✅ Error tracking (Sentry) working

---

**Last Updated**: 2026-03-10
**Version**: 1.0
**Status**: Complete & Ready

**Start with**: MOBILE_APK_QUICK_START.md or MOBILE_APK_BUILD_GUIDE.md

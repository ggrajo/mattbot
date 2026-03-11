#!/usr/bin/env pwsh

<#
.SYNOPSIS
MattBot Mobile App Build Helper Script

.DESCRIPTION
Provides quick commands for common mobile app build tasks

.EXAMPLE
./mobile-build.ps1 install
./mobile-build.ps1 build-release
./mobile-build.ps1 install-adb
#>

param(
    [Parameter(Position = 0)]
    [string]$Command
)

$ErrorActionPreference = "Continue"

function Show-Help {
    Write-Host "MattBot Mobile App Builder" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: ./mobile-build.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  install          - Install dependencies (npm install)"
    Write-Host "  dev              - Switch to local dev config (.env.local)"
    Write-Host "  release          - Switch to release config (.env)"
    Write-Host "  status           - Show current .env config"
    Write-Host "  build-debug      - Build debug APK"
    Write-Host "  build-release    - Build release APK"
    Write-Host "  install-adb      - Install APK to connected device"
    Write-Host "  logs             - Show device logs"
    Write-Host "  clean            - Clean build cache"
    Write-Host "  reset            - Reset Android build files"
    Write-Host ""
}

function Test-MobileDir {
    if ((Test-Path "mobile/package.json") -eq $false) {
        Write-Host "Error: mobile/ directory not found or package.json missing" -ForegroundColor Red
        exit 1
    }
    Push-Location mobile
}

if ([string]::IsNullOrEmpty($Command)) {
    Show-Help
    exit 0
}

switch ($Command.ToLower()) {
    "install" {
        Test-MobileDir
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
        Pop-Location
    }

    "dev" {
        Test-MobileDir
        Write-Host "Switching to local dev config..." -ForegroundColor Yellow
        if (Test-Path ".env") {
            Move-Item ".env" ".env.backup" -Force | Out-Null
            Write-Host "  - Backed up .env to .env.backup" -ForegroundColor Green
        }
        Copy-Item ".env.local" ".env" -Force | Out-Null
        Write-Host "  - Using .env.local config" -ForegroundColor Green
        Write-Host "  - API: http://localhost:8000/api/v1" -ForegroundColor Cyan
        Write-Host "  - WS: ws://localhost:3001/ws/events" -ForegroundColor Cyan
        Pop-Location
    }

    "release" {
        Test-MobileDir
        Write-Host "Switching to release config..." -ForegroundColor Yellow
        if (Test-Path ".env.backup") {
            Copy-Item ".env.backup" ".env" -Force | Out-Null
            Write-Host "  - Restored from .env.backup" -ForegroundColor Green
        }
        else {
            Copy-Item ".env.dev" ".env" -Force | Out-Null
            Write-Host "  - Created from .env.dev" -ForegroundColor Green
        }
        Write-Host "  - API: http://3.238.82.209/api/v1" -ForegroundColor Cyan
        Write-Host "  - WS: ws://3.238.82.209/ws/events" -ForegroundColor Cyan
        Pop-Location
    }

    "status" {
        Test-MobileDir
        Write-Host "Current .env configuration:" -ForegroundColor Yellow
        Write-Host ""
        Get-Content ".env" | Write-Host
        Pop-Location
    }

    "build-debug" {
        Test-MobileDir
        Write-Host "Building debug APK..." -ForegroundColor Yellow
        & npx react-native run-android
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "APK location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
        }
        else {
            Write-Host "Build failed!" -ForegroundColor Red
        }
        Pop-Location
    }

    "build-release" {
        Test-MobileDir
        Write-Host "Building release APK..." -ForegroundColor Yellow
        Push-Location android
        & .\gradlew.bat assembleRelease
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "APK location: app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
        }
        else {
            Write-Host "Build failed!" -ForegroundColor Red
        }
        Pop-Location
        Pop-Location
    }

    "install-adb" {
        Test-MobileDir
        Write-Host "Installing APK to device..." -ForegroundColor Yellow
        $apkPath = "android/app/build/outputs/apk/release/app-release.apk"
        if (-not (Test-Path $apkPath)) {
            Write-Host "Error: APK not found at $apkPath" -ForegroundColor Red
            Write-Host "Run 'mobile-build build-release' first" -ForegroundColor Yellow
            Pop-Location
            exit 1
        }
        & adb install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "APK installed successfully!" -ForegroundColor Green
            Write-Host "To run: adb shell am start -n `"com.mattbotmobile/com.mattbotmobile.MainActivity`"" -ForegroundColor Cyan
        }
        else {
            Write-Host "Installation failed!" -ForegroundColor Red
        }
        Pop-Location
    }

    "logs" {
        Write-Host "Showing device logs (press Ctrl+C to stop)..." -ForegroundColor Yellow
        & adb logcat -s "MattBot:I,MattBot:E"
    }

    "clean" {
        Test-MobileDir
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        Push-Location android
        & .\gradlew.bat clean
        Pop-Location
        Write-Host "Cache cleaned!" -ForegroundColor Green
        Pop-Location
    }

    "reset" {
        Test-MobileDir
        Write-Host "Resetting Android build files..." -ForegroundColor Yellow
        Push-Location android
        & .\gradlew.bat clean
        Pop-Location
        Write-Host "Android build reset complete!" -ForegroundColor Green
        Pop-Location
    }

    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Run with no arguments to see available commands" -ForegroundColor Yellow
        exit 1
    }
}

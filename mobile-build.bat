@echo off
REM MattBot Mobile App Build Helper Script
REM This script provides quick commands for common mobile app tasks

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo MattBot Mobile App Builder
    echo.
    echo Usage: mobile-build.bat [command]
    echo.
    echo Commands:
    echo   install          - Install dependencies (npm install)
    echo   dev              - Switch to local dev config (.env.local)
    echo   release          - Switch to release config (.env)
    echo   status           - Show current .env config
    echo   build-debug      - Build debug APK
    echo   build-release    - Build release APK
    echo   install-adb      - Install APK to connected device
    echo   logs             - Show device logs
    echo   clean            - Clean build cache
    echo   reset            - Reset Android build files
    echo.
    goto :eof
)

cd /d "%~dp0mobile" || exit /b 1

if /i "%~1"=="install" (
    echo Installing dependencies...
    call npm install
    goto :eof
)

if /i "%~1"=="dev" (
    echo Switching to local dev config...
    if exist .env (
        move .env .env.backup > nul
        echo - Backed up .env to .env.backup
    )
    copy .env.local .env > nul
    echo - Using .env.local config
    echo - API: http://localhost:8000/api/v1
    echo - WS: ws://localhost:3001/ws/events
    goto :eof
)

if /i "%~1"=="release" (
    echo Switching to release config...
    if exist .env.backup (
        copy .env.backup .env > nul
        echo - Restored from .env.backup
    ) else (
        copy .env.dev .env > nul
        echo - Created from .env.dev
    )
    echo - API: http://3.238.82.209/api/v1
    echo - WS: ws://3.238.82.209/ws/events
    goto :eof
)

if /i "%~1"=="status" (
    echo Current .env configuration:
    echo.
    type .env
    goto :eof
)

if /i "%~1"=="build-debug" (
    echo Building debug APK...
    call npx react-native run-android
    if !errorlevel! equ 0 (
        echo.
        echo Build successful!
        echo APK location: android\app\build\outputs\apk\debug\app-debug.apk
    ) else (
        echo Build failed!
    )
    goto :eof
)

if /i "%~1"=="build-release" (
    echo Building release APK...
    cd android
    call gradlew.bat assembleRelease
    if !errorlevel! equ 0 (
        echo.
        echo Build successful!
        echo APK location: app\build\outputs\apk\release\app-release.apk
    ) else (
        echo Build failed!
    )
    cd ..
    goto :eof
)

if /i "%~1"=="install-adb" (
    echo Installing APK to device...
    set apk_path=android\app\build\outputs\apk\release\app-release.apk
    if not exist !apk_path! (
        echo Error: APK not found at !apk_path!
        echo Run 'mobile-build build-release' first
        exit /b 1
    )
    adb install -r !apk_path!
    if !errorlevel! equ 0 (
        echo APK installed successfully!
        echo To run: adb shell am start -n "com.mattbotmobile/com.mattbotmobile.MainActivity"
    ) else (
        echo Installation failed!
    )
    goto :eof
)

if /i "%~1"=="logs" (
    echo Showing device logs (press Ctrl+C to stop)...
    adb logcat -s "MattBot:I,MattBot:E"
    goto :eof
)

if /i "%~1"=="clean" (
    echo Cleaning build cache...
    cd android
    call gradlew.bat clean
    cd ..
    echo Cache cleaned!
    goto :eof
)

if /i "%~1"=="reset" (
    echo Resetting Android build files...
    cd android
    call gradlew.bat clean
    cd ..
    echo Android build reset complete!
    goto :eof
)

echo Unknown command: %~1
echo Run with no arguments to see available commands
exit /b 1

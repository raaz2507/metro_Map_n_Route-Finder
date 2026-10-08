```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Capacitor Android Development

cd /d "%~dp0"

echo.
echo ============================================================
echo          CAPACITOR ANDROID DEVELOPMENT
echo ============================================================
echo.

:: ============================================================
:: Check ADB
:: ============================================================

where adb >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ADB nahi mila.
    echo Android SDK platform-tools ko PATH me add karein.
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: Check npm
:: ============================================================

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm nahi mila.
    echo Node.js/PATH check karein.
    echo.
    pause
    exit /b 1
)

echo [OK] ADB found
echo [OK] npm found
echo.


:: ============================================================
:: DEVICE SEARCH
:: ============================================================

:DEVICE_SEARCH

set "DEVICE="
set "WIRELESS_DEVICE="
set "USB_DEVICE="

echo.
echo ------------------------------------------------------------
echo Checking already connected devices...
echo ------------------------------------------------------------
echo.

:: ============================================================
:: First priority: already connected wireless device
:: IP:PORT format
:: ============================================================

for /f "skip=1 tokens=1,2" %%A in ('adb devices 2^>nul') do (

    if "%%B"=="device" (

        echo %%A | findstr /r /c:"^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*:[0-9][0-9]*$" >nul

        if not errorlevel 1 (
            if not defined WIRELESS_DEVICE (
                set "WIRELESS_DEVICE=%%A"
            )
        )
    )
)

:: ============================================================
:: Second priority: USB device
:: ============================================================

if not defined WIRELESS_DEVICE (

    for /f "skip=1 tokens=1,2" %%A in ('adb devices 2^>nul') do (

        if "%%B"=="device" (

            echo %%A | findstr /r /c:"^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*:[0-9][0-9]*$" >nul

            if errorlevel 1 (
                if not defined USB_DEVICE (
                    set "USB_DEVICE=%%A"
                )
            )
        )
    )
)

:: ============================================================
:: Use already connected wireless device
:: ============================================================

if defined WIRELESS_DEVICE (

    set "DEVICE=!WIRELESS_DEVICE!"

    echo [FOUND] Already connected wireless device:
    echo         !DEVICE!
    echo.

    goto DEVICE_READY
)

:: ============================================================
:: Use already connected USB device
:: ============================================================

if defined USB_DEVICE (

    set "DEVICE=!USB_DEVICE!"

    echo [FOUND] Already connected USB device:
    echo         !DEVICE!
    echo.

    goto DEVICE_READY
)


:: ============================================================
:: No existing device
:: Search wireless ADB using mDNS
:: ============================================================

echo [INFO] Connected device nahi mila.
echo [INFO] Wireless ADB device search ho raha hai...
echo.

for /f "tokens=1,2,*" %%A in (
    'adb mdns services 2^>nul ^| findstr /i "_adb-tls-connect._tcp"
) do (

    if not defined WIRELESS_DEVICE (
        set "WIRELESS_DEVICE=%%B"
    )
)

if defined WIRELESS_DEVICE (

    echo [FOUND] Wireless ADB service:
    echo         !WIRELESS_DEVICE!
    echo.

    echo [CONNECT] Connecting...
    adb connect !WIRELESS_DEVICE!

    timeout /t 2 /nobreak >nul

    set "DEVICE=!WIRELESS_DEVICE!"

    goto VERIFY_DEVICE
)

:: ============================================================
:: Nothing found
:: ============================================================

echo [WAIT] Koi Android device nahi mila.
echo.
echo Phone par ensure karein:
echo   - Developer Options ON
echo   - Wireless Debugging ON
echo   - PC aur phone same Wi-Fi par
echo.
echo 5 seconds baad dobara check hoga...
echo.

timeout /t 5 /nobreak >nul

goto DEVICE_SEARCH


:: ============================================================
:: VERIFY DEVICE
:: ============================================================

:VERIFY_DEVICE

echo.
echo ------------------------------------------------------------
echo Verifying ADB connection...
echo ------------------------------------------------------------
echo.

adb devices

echo.

adb devices | findstr /c:"!DEVICE!" >nul

if errorlevel 1 (

    echo [FAILED] Device verify nahi hua.
    echo.

    set "DEVICE="

    timeout /t 3 /nobreak >nul

    goto DEVICE_SEARCH
)

echo [CONNECTED] !DEVICE!
echo.

goto DEVICE_READY


:: ============================================================
:: DEVICE READY
:: ============================================================

:DEVICE_READY

echo.
echo ============================================================
echo                  DEVICE READY
echo ============================================================
echo.
echo Device:
echo !DEVICE!
echo.
echo ============================================================
echo.

:: ============================================================
:: Open Android project
:: ============================================================

echo [ANDROID] Opening Android project...
echo.

call npx cap open android

echo.
echo ============================================================
echo                  DEVELOPMENT READY
echo ============================================================
echo.
echo Press ANY KEY  =  Capacitor Sync
echo Press Q        =  Exit
echo.
echo ============================================================


:: ============================================================
:: MAIN LOOP
:: ============================================================

:MAIN_LOOP

powershell -NoProfile -Command ^
"$k=$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown'); if($k.Character -eq 'q' -or $k.Character -eq 'Q'){exit 1}else{exit 0}"

if errorlevel 1 goto END


:: ============================================================
:: Check device before sync
:: ============================================================

echo.
echo [CHECK] Device connection...

adb devices | findstr /c:"!DEVICE!" >nul

if errorlevel 1 (

    echo.
    echo ========================================================
    echo [DISCONNECTED] Android device connection lost.
    echo ========================================================
    echo.

    set "DEVICE="

    goto DEVICE_SEARCH
)


:: ============================================================
:: Capacitor Sync
:: ============================================================

echo.
echo ------------------------------------------------------------
echo [SYNC] npx cap sync android
echo ------------------------------------------------------------
echo.

call npx cap sync android

if errorlevel 1 (

    echo.
    echo [ERROR] Capacitor sync failed.
    echo.

) else (

    echo.
    echo [SUCCESS] Capacitor sync complete.
    echo.
)


echo.
echo ============================================================
echo Press ANY KEY = Sync again
echo Q = Exit
echo ============================================================
echo.

goto MAIN_LOOP


:: ============================================================
:: EXIT
:: ============================================================

:END

echo.
echo ============================================================
echo          Android development session ended
echo ============================================================
echo.

endlocal
exit /b 0
```

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
:: Check adb devices for already connected device
:: ============================================================

for /f "skip=1 tokens=1,2" %%A in ('adb devices 2^>nul') do (
    if /i "%%B"=="device" (
        :: Check if IP:Port (Wireless) or Serial (USB)
        echo %%A| findstr /r /c:"^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*:[0-9][0-9]*$" >nul
        if not errorlevel 1 (
            if not defined WIRELESS_DEVICE set "WIRELESS_DEVICE=%%A"
        ) else (
            if not defined USB_DEVICE set "USB_DEVICE=%%A"
        )
    )
)

:: Priority 1: Already connected wireless device
if defined WIRELESS_DEVICE (
    set "DEVICE=!WIRELESS_DEVICE!"
    echo [FOUND] Already connected wireless device:
    echo         !DEVICE!
    echo.
    goto DEVICE_READY
)

:: Priority 2: Already connected USB device
if defined USB_DEVICE (
    set "DEVICE=!USB_DEVICE!"
    echo [FOUND] Already connected USB device:
    echo         !DEVICE!
    echo.
    goto DEVICE_READY
)


:: ============================================================
:: Search wireless ADB using mDNS
:: ============================================================

echo [INFO] Connected device nahi mila.
echo [INFO] Wireless ADB device search ho raha hai...
echo.

set "MDNS_FOUND="
for /f "tokens=*" %%L in ('adb mdns services 2^>nul ^| findstr /i "_adb-tls-connect._tcp _adb._tcp"') do (
    for %%X in (%%L) do (
        echo %%X| findstr /r /c:"^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*:[0-9][0-9]*$" >nul
        if not errorlevel 1 (
            if not defined MDNS_FOUND (
                echo [FOUND] Wireless ADB candidate: %%X
                echo [CONNECT] Connecting to %%X...
                adb connect %%X
                timeout /t 2 >nul 2>&1 || ping 127.0.0.1 -n 3 >nul

                :: Verify if this candidate connected successfully
                adb devices | findstr /c:"%%X" | findstr /i /v "offline unauthorized" >nul
                if not errorlevel 1 (
                    set "WIRELESS_DEVICE=%%X"
                    set "MDNS_FOUND=1"
                )
            )
        )
    )
)

if defined WIRELESS_DEVICE (
    set "DEVICE=!WIRELESS_DEVICE!"
    goto VERIFY_DEVICE
)

:: ============================================================
:: Nothing found - Helpful menu
:: ============================================================

echo.
echo [WAIT] Koi Android device connect nahi ho saka.
echo.
echo Phone checklist:
echo   1. Developer Options ON
echo   2. Wireless Debugging ON
echo   3. PC aur phone same Wi-Fi par connected
echo.
echo Options:
echo   [ENTER] - Dobara auto-search karein (5s me auto-retry)
echo   [M]     - Manually IP:Port dalein (e.g. 192.168.1.40:43219)
echo   [P]     - Wireless pairing code dalein (adb pair)
echo   [Q]     - Exit
echo.

set "USER_CHOICE="
set /p "USER_CHOICE=Aapka chayan (Enter = Retry): "

if /i "!USER_CHOICE!"=="q" goto END

if /i "!USER_CHOICE!"=="m" (
    echo.
    set /p "MANUAL_IP=Phone screen par dikh raha IP:Port dalein (e.g. 192.168.1.40:5555): "
    if defined MANUAL_IP (
        echo [CONNECT] Connecting to !MANUAL_IP!...
        adb connect !MANUAL_IP!
        timeout /t 2 >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
        set "DEVICE=!MANUAL_IP!"
        goto VERIFY_DEVICE
    )
)

if /i "!USER_CHOICE!"=="p" (
    echo.
    echo Wireless Debugging screen par 'Pair device with pairing code' par click karein.
    set /p "PAIR_IP=Pairing IP:Port dalein: "
    set /p "PAIR_CODE=6-digit Wi-Fi pairing code dalein: "
    if defined PAIR_IP (
        echo [PAIR] Pairing...
        adb pair !PAIR_IP! !PAIR_CODE!
        echo.
        echo Pairing ke baad, main screen ka 'IP address and Port' dalein:
        set /p "CONNECT_IP=Connect IP:Port: "
        if defined CONNECT_IP (
            adb connect !CONNECT_IP!
            set "DEVICE=!CONNECT_IP!"
            goto VERIFY_DEVICE
        )
    )
)

:: Auto-retry pause
timeout /t 2 >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
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

adb devices | findstr /c:"!DEVICE!" | findstr /i /v "offline unauthorized" >nul

if errorlevel 1 (
    echo [FAILED] Device verify nahi hua (offline ya refused).
    echo.
    set "DEVICE="
    timeout /t 2 >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
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
echo Device: !DEVICE!
for /f "tokens=*" %%M in ('adb -s !DEVICE! shell getprop ro.product.model 2^>nul') do (
    echo Model : %%M
)
echo.
echo ============================================================
echo.

:: ============================================================
:: Open Android project
:: ============================================================

echo [ANDROID] Opening Android project in Android Studio...
echo.

call npx cap open android

echo.
echo ============================================================
echo                  DEVELOPMENT READY
echo ============================================================
echo.
echo  [ENTER] = Capacitor Sync (npx cap sync android)
echo  [O]     = Open Android Studio again
echo  [Q]     = Exit
echo.
echo ============================================================
echo.


:: ============================================================
:: MAIN LOOP
:: ============================================================

:MAIN_LOOP

set "USER_INPUT="
set /p "USER_INPUT=Press [ENTER] to Sync, [O] to Open, [Q] to Exit: "

if /i "!USER_INPUT!"=="q" goto END
if /i "!USER_INPUT!"=="o" (
    echo.
    echo [ANDROID] Re-opening Android project...
    call npx cap open android
    goto MAIN_LOOP
)

:: ============================================================
:: Check device before sync
:: ============================================================

echo.
echo [CHECK] Checking device connection...

adb devices | findstr /c:"!DEVICE!" | findstr /i /v "offline" >nul

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
echo  [ENTER] = Sync again  ^|  [O] = Open Studio  ^|  [Q] = Exit
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

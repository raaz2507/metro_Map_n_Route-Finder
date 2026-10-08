@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

cd /d "%~dp0.."

REM Agar command line arguments pass kiye gaye hain
if not "%~1"=="" (
    for %%A in (%*) do (
        call :RUN_CITY %%A
    )
    goto :DONE
)

:MENU
cls
echo ==================================================================
echo   METRO MAP AND ROUTE FINDER - MULTI-CITY TEST RUNNER
echo ==================================================================
echo    1) Delhi NCR                  9) Nagpur
echo    2) Bengaluru (Namma Metro)   10) Kochi
echo    3) Mumbai and Monorail       11) Lucknow
echo    4) Kolkata                   12) Jaipur
echo    5) Chennai                   13) Kanpur
echo    6) Hyderabad                 14) Agra
echo    7) Ahmedabad-Gandhinagar     15) Bhopal
echo    8) Pune                      16) Indore
echo ------------------------------------------------------------------
echo   17) ALL CITIES (Master Test)
echo   18) AUDIT ONLY (Data and Fare Integrity Check)
echo    0) Exit
echo ==================================================================
set "USER_INPUT="
set /p "USER_INPUT=Enter numbers separated by spaces (e.g. 1 3 13 or 17 for all): "

if "%USER_INPUT%"=="" goto :DONE

for %%N in (%USER_INPUT%) do (
    call :RUN_CITY %%N
)

echo.
pause
goto :EOF

:RUN_CITY
set "NUM=%~1"
set "CITY="

if "%NUM%"=="1"  set "CITY=delhi_ncr"
if "%NUM%"=="2"  set "CITY=bengaluru"
if "%NUM%"=="3"  set "CITY=mumbai"
if "%NUM%"=="4"  set "CITY=kolkata"
if "%NUM%"=="5"  set "CITY=chennai"
if "%NUM%"=="6"  set "CITY=hyderabad"
if "%NUM%"=="7"  set "CITY=ahmedabad_gandhinagar"
if "%NUM%"=="8"  set "CITY=pune"
if "%NUM%"=="9"  set "CITY=nagpur"
if "%NUM%"=="10" set "CITY=kochi"
if "%NUM%"=="11" set "CITY=lucknow"
if "%NUM%"=="12" set "CITY=jaipur"
if "%NUM%"=="13" set "CITY=kanpur"
if "%NUM%"=="14" set "CITY=agra"
if "%NUM%"=="15" set "CITY=bhopal"
if "%NUM%"=="16" set "CITY=indore"

if not "!CITY!"=="" (
    echo.
    echo [Option %NUM%] Running test for !CITY!...
    node tester\run.js --city=!CITY!
    goto :EOF
)

if "%NUM%"=="17" (
    echo.
    echo [Option 17] Running Master Test Suite for ALL 16 CITIES...
    node tester\run.js --all
    goto :EOF
)

if "%NUM%"=="18" (
    echo.
    echo [Option 18] Running Data and Fare Integrity AUDIT...
    node tester\run.js --audit
    goto :EOF
)

if "%NUM%"=="0" (
    exit /b 0
)

echo.
echo Invalid option: %NUM% (Allowed: 0 to 18)
goto :EOF

:DONE
endlocal

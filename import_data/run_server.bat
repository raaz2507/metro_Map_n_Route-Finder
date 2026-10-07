@echo off
title Metro Audit Hub - Pipeline Server

cd /d "%~dp0"

cls
echo ====================================================================
echo           METRO AUDIT HUB - REAL-TIME PIPELINE SERVER
echo ====================================================================
echo.

set "OCCUPIED_PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":8080 .*LISTENING"') do (
    set "OCCUPIED_PID=%%a"
)

if defined OCCUPIED_PID (
    echo [WARNING] Port 8080 is already in use by Process ID: %OCCUPIED_PID%
    set /p "USER_CHOICE=Do you want to terminate that process and start server? (y/n): "
)

if defined OCCUPIED_PID (
    if /i "%USER_CHOICE%"=="y" (
        echo [INFO] Terminating PID %OCCUPIED_PID%...
        taskkill /F /PID %OCCUPIED_PID% >nul 2>&1
        timeout /t 1 /nobreak >nul
        echo [INFO] Port 8080 is now free.
    ) else if /i "%USER_CHOICE%"=="yes" (
        echo [INFO] Terminating PID %OCCUPIED_PID%...
        taskkill /F /PID %OCCUPIED_PID% >nul 2>&1
        timeout /t 1 /nobreak >nul
        echo [INFO] Port 8080 is now free.
    ) else (
        echo [INFO] Server startup aborted by user.
        pause
        exit /b 0
    )
)

echo [1/3] Setting up Python Environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found in system PATH!
    echo Please ensure Python 3.8+ is installed and added to PATH.
    echo.
    pause
    exit /b 1
)

if not exist "venv\Scripts\activate.bat" (
    echo [INFO] First time setup: Creating Virtual Environment...
    python -m venv venv
    echo [INFO] Activating and installing dependencies from requirements.txt...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    echo [INFO] Virtual Environment found. Activating...
    call venv\Scripts\activate.bat
)

echo [2/3] Launching Web Dashboard in browser (http://localhost:8080)...
start "" "http://localhost:8080"

echo [3/3] Starting Server on Port 8080 (Press Ctrl+C to stop)...
echo ====================================================================
echo.

cd /d "%~dp0server"
python server.py

if errorlevel 1 (
    echo.
    echo [CRASH] Server exited with an error.
    pause
)
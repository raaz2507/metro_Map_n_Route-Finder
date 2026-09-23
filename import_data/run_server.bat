@echo off
title Metro Audit Hub - Pipeline Server
chcp 65001 >nul

:: Determine correct execution directory
cd /d "%~dp0"


cls
echo ====================================================================
echo          🚇 METRO AUDIT HUB - REAL-TIME PIPELINE SERVER
echo ====================================================================
echo.
echo [1/3] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found in system PATH!
    echo Please ensure Python 3.8+ is installed and added to PATH.
    echo.
    pause
    exit /b 1
)

echo [2/3] Launching Web Dashboard in browser (http://localhost:8080)...
start "" "http://localhost:8080"

echo [3/3] Starting Server on Port 8080 (Press Ctrl+C to stop)...
echo ====================================================================
echo.

python server.py

if errorlevel 1 (
    echo.
    echo [CRASH] Server exited with an error.
    pause
)
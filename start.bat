@echo off
setlocal
title Agrofield Planner - Dev Server

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Run the app in development mode
echo [INFO] Starting the development server...
echo.
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The application crashed or failed to start.
    pause
    exit /b 1
)

pause

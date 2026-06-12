@echo off
setlocal
title Agrofield Planner - Build and Run (Production Preview)

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

:: Build the application
echo [INFO] Building the application for production...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The build failed.
    pause
    exit /b 1
)

:: Run the production preview
echo [INFO] Starting production preview server...
echo.
call npm run preview

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start preview server.
    pause
    exit /b 1
)

pause

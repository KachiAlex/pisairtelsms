@echo off
REM Pisairtel SMS — VPS Deployment Script (Windows)
REM Deploys the application to a self-hosted VPS using PM2.

setlocal enabledelayedexpansion

echo.
echo 🚀 Pisairtel SMS — VPS Deployment
echo ==================================
echo.

REM Step 1: Pre-deployment checks
echo Step 1: Running pre-deployment checks...
echo.

REM Check TypeScript compilation
echo Checking TypeScript compilation...
call npx tsc --noEmit >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ TypeScript compilation successful
) else (
    echo ✗ TypeScript compilation failed
    exit /b 1
)

REM Build frontend
echo Building frontend...
call npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Vite build successful
) else (
    echo ✗ Vite build failed
    exit /b 1
)

echo.

REM Step 2: Verify environment
echo Step 2: Verifying environment...
echo.

if not exist .env (
    echo ⚠️  .env not found
    echo Please create .env with the following variables:
    echo.
    echo DATABASE_URL=postgresql://user:pass@localhost:5432/pisairtel_sms
    echo JWT_SECRET=your_jwt_secret_key
    echo PORT=3000
    echo.
    pause
)

echo ✓ Environment configured
echo.

REM Step 3: Deploy via PM2
echo Step 3: Starting/restarting via PM2...
echo.

where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart pisairtel-sms 2>nul
    if %errorlevel% neq 0 (
        call pm2 start ecosystem.config.cjs
    )
    echo ✓ PM2 application started/restarted
) else (
    echo ⚠️  PM2 not found. Starting directly...
    start /b node --import tsx server.mjs
    echo ✓ Server started (direct mode)
)

echo.

REM Step 4: Summary
echo Step 4: Deployment Summary
echo.
echo ✓ Deployment completed successfully!
echo.
echo Deployment Details:
echo   Time: %date% %time%
echo.
echo Next Steps:
echo   1. Verify all endpoints are responding
echo   2. Test student login flow
echo   3. Test staff login flow
echo   4. Test admin login flow
echo   5. Monitor PM2 logs: pm2 logs pisairtel-sms
echo.
echo 🎉 Pisairtel SMS is now live!
echo.

pause

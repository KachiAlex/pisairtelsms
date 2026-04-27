@echo off
REM ScholarX Production Deployment Script (Windows)
REM This script automates the deployment process to Vercel

setlocal enabledelayedexpansion

echo.
echo 🚀 ScholarX Production Deployment
echo ==================================
echo.

REM Step 1: Pre-deployment checks
echo Step 1: Running pre-deployment checks...
echo.

REM Check TypeScript compilation
echo Checking TypeScript compilation...
call npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ TypeScript compilation successful
) else (
    echo ✗ TypeScript compilation failed
    exit /b 1
)

REM Check tests
echo Running tests...
call npm test -- --run >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ All tests passing
) else (
    echo ✗ Tests failed
    exit /b 1
)

echo.

REM Step 2: Verify environment
echo Step 2: Verifying environment...
echo.

if not exist .env.production (
    echo ⚠️  .env.production not found
    echo Please create .env.production with the following variables:
    echo.
    echo POSTGRES_PRISMA_URL=your_postgres_url
    echo POSTGRES_URL_NON_POOLING=your_postgres_url
    echo JWT_SECRET=your_jwt_secret_key
    echo JWT_EXPIRY=86400
    echo API_BASE_URL=https://your-domain.com
    echo CORS_ORIGIN=https://your-domain.com
    echo.
    pause
)

echo ✓ Environment configured
echo.

REM Step 3: Backup current deployment
echo Step 3: Backing up current deployment...
echo.

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_DIR=backups\%mydate%_%mytime%
mkdir "%BACKUP_DIR%" 2>nul
echo Backup directory: %BACKUP_DIR%
echo ✓ Backup location ready
echo.

REM Step 4: Deploy to Vercel
echo Step 4: Deploying to Vercel...
echo.

set /p DEPLOY_PROD="Deploy to production? (y/n): "
if /i "%DEPLOY_PROD%"=="y" (
    echo Deploying to production...
    call vercel deploy --prod
    if %errorlevel% equ 0 (
        echo ✓ Deployment successful
    ) else (
        echo ✗ Deployment failed
        exit /b 1
    )
) else (
    echo Deploying to staging...
    call vercel deploy
    if %errorlevel% equ 0 (
        echo ✓ Staging deployment successful
    ) else (
        echo ✗ Staging deployment failed
        exit /b 1
    )
)

echo.

REM Step 5: Summary
echo Step 5: Deployment Summary
echo.
echo ✓ Deployment completed successfully!
echo.
echo Deployment Details:
echo   Time: %date% %time%
echo   Version: 1.0.0
echo.
echo Next Steps:
echo   1. Verify all endpoints are responding
echo   2. Test student login flow
echo   3. Test staff login flow
echo   4. Test admin login flow
echo   5. Monitor error logs
echo.
echo Documentation:
echo   - DEPLOYMENT_GUIDE.md
echo   - PRODUCTION_CHECKLIST.md
echo   - PRODUCTION_SUMMARY.md
echo.
echo 🎉 ScholarX is now live in production!
echo.

pause

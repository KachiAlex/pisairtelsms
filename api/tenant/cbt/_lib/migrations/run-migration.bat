@echo off
REM Migration Runner for Windows
REM Usage: run-migration.bat <database-url>

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Error: Database URL not provided
    echo Usage: run-migration.bat "postgresql://user:password@host/database"
    exit /b 1
)

set DATABASE_URL=%~1

echo CBT Dashboard Database Migration
echo ============================================================
echo Running migration against Neon database...
echo ============================================================

node "%~dp0run-migration.js" "%DATABASE_URL%"

if %errorlevel% neq 0 (
    echo.
    echo Migration failed with error code %errorlevel%
    exit /b %errorlevel%
)

echo.
echo Migration completed successfully!
pause

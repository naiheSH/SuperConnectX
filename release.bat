@echo off
setlocal

REM Use PowerShell to read version from package.json (handles UTF-8 correctly)
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-Content package.json -Encoding UTF8 | ConvertFrom-Json).version"') do set "ver=%%a"

if "%ver%"=="" (
    echo [ERROR] Failed to read version from package.json
    exit /b 1
)

set "tag=v%ver%"
echo Version: %ver%
echo Tag: %tag%

REM Check if tag already exists
git rev-parse "%tag%" >nul 2>&1
if not errorlevel 1 (
    echo [WARN] Tag %tag% already exists, deleting and recreating...
    git tag -d "%tag%"
)

REM Create tag
git tag "%tag%"
if errorlevel 1 (
    echo [ERROR] Failed to create tag %tag%
    exit /b 1
)
echo [OK] Tag %tag% created.

REM Push tag
git push origin "%tag%"
if errorlevel 1 (
    echo [ERROR] Failed to push tag %tag%
    exit /b 1
)
echo [OK] Tag %tag% pushed to origin.
echo Done!

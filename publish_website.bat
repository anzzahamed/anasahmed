@echo off
title Publish Portfolio to GitHub
echo ==================================================
echo   Publishing Anas Ahmed Portfolio to GitHub
echo ==================================================
echo.
echo Staging changes...
git add .
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to stage files.
    pause
    exit /b %errorlevel%
)
echo.
echo Committing changes...
git commit -m "feat: add Brands marquee, Google Drive videos, and Behance embeds"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to commit changes.
    pause
    exit /b %errorlevel%
)
echo.
echo Pushing to GitHub (origin/main)...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to push to GitHub.
    pause
    exit /b %errorlevel%
)
echo.
echo ==================================================
echo   SUCCESS: Website successfully published!
echo ==================================================
pause

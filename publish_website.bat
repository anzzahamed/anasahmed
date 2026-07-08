@echo off
title Publish Portfolio to GitHub
echo ==================================================
echo   Publishing Anas Ahmed Portfolio to GitHub
echo ==================================================
echo.
echo Staging changes...
git add .

echo.
echo Committing changes (if any)...
git commit -m "feat: add Brands marquee, Google Drive videos, and Behance embeds"

echo.
echo Pushing to GitHub (origin/main)...
git push -f -u origin main
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

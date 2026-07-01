@echo off
REM ==========================================================================
REM  Double-click this file to start JobBot.
REM  It installs everything the first time (may take a minute), then launches
REM  the app and opens it in your browser. Leave this window open while you use
REM  JobBot. Close the window (or press Ctrl+C) to stop it.
REM ==========================================================================

cd /d "%~dp0"

echo.
echo ============================================
echo   Starting JobBot...
echo ============================================
echo.

REM Check that the Gemini key file exists; if not, tell the user how to add it.
if not exist "server\.env" (
  echo [!] Missing server\.env  -  the AI features need your Gemini API key.
  echo     Create the file server\.env with these three lines:
  echo.
  echo         GEMINI_API_KEY=your-key-here
  echo         GEMINI_MODEL=gemini-2.5-flash
  echo         PORT=8787
  echo.
  echo     Then double-click this file again.
  echo.
  pause
  exit /b 1
)

REM Install dependencies only if they aren't already installed.
if not exist "web\node_modules" (
  echo Installing dependencies for the first time - please wait...
  call npm run install:all
  if errorlevel 1 (
    echo.
    echo [!] Install failed. Scroll up to see the error, or send it to Claude.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Launching JobBot. Your browser will open at http://localhost:5290
echo Keep this window open while you use it.
echo.
call npm run dev

pause

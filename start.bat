@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js non trovato nel PATH.
  echo Installa Node.js 18+ da https://nodejs.org e riprova.
  echo.
  pause
  exit /b 1
)

echo Avvio Tactical Hub Pro su http://127.0.0.1:8787 ...
start "" "http://127.0.0.1:8787/"
node server/server.js
pause

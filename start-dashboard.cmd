@echo off
cd /d "%~dp0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
  echo Stopping existing dashboard server on port 5173 (PID %%p)
  taskkill /PID %%p /F >nul 2>nul
)
node server.mjs

@echo off
title Helmsman Launcher
cd /d C:\Users\123\ai-stock-app

echo Starting Helmsman Backend API...
start "Helmsman API" cmd /k "cd /d C:\Users\123\ai-stock-app && node server\fmp-proxy.mjs"

timeout /t 2 /nobreak >nul

echo Starting Helmsman Frontend...
start "Helmsman Frontend" cmd /k "cd /d C:\Users\123\ai-stock-app && npx expo start --web"

timeout /t 8 /nobreak >nul

echo Opening browser...
start http://localhost:8081

echo Helmsman launched.
exit

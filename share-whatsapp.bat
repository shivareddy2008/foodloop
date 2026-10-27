@echo off
title FoodLoop - Share Public Link on WhatsApp
echo ======================================================================
echo    🌿 FoodLoop — Instant WhatsApp Public Link Generator
echo ======================================================================
echo.

set AGY_NODE="C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd"
where node >nul 2>nul
if %errorlevel% equ 0 (
    set NODE_CMD=node
) else if exist %AGY_NODE% (
    set NODE_CMD=%AGY_NODE%
) else (
    set NODE_CMD=node
)

echo [*] Checking if FoodLoop server is running on localhost:3000...
netstat -ano | findstr :3000 >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Starting FoodLoop server in background...
    start "FoodLoop Server" /min cmd /c "%NODE_CMD% server.js"
    timeout /t 2 >nul
) else (
    echo [*] FoodLoop server is already active on port 3000.
)

echo.
echo ======================================================================
echo   CONNECTING TO SECURE PUBLIC TUNNEL...
echo   A public HTTPS link will appear on your screen below in 2-3 seconds.
echo.
echo   👉 Copy the https:// link and paste it directly into WhatsApp!
echo   👉 Your friends can open it on their phones anywhere.
echo.
echo   (Keep this window open while sharing. Close it when you are done.)
echo ======================================================================
echo.

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -R 80:localhost:3000 nokey@localhost.run

if %errorlevel% neq 0 (
    echo.
    echo [!] Alternative backup tunnel (Pinggy)...
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 443 -R0:localhost:3000 a.pinggy.io
)

pause

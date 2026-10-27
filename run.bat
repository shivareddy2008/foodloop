@echo off
title FoodLoop - Smart Food Rescue Platform
echo ======================================================================
echo    FoodLoop - Good Food. No Waste.
echo    B.Tech Internet Programming (IP) Project
echo ======================================================================
echo.

set AGY_NODE="C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd"

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Found Node.js in system PATH.
    set NODE_CMD=node
) else if exist %AGY_NODE% (
    echo [*] Using Antigravity Node runtime.
    set NODE_CMD=%AGY_NODE%
) else (
    echo [!] Node.js not detected in PATH.
    set NODE_CMD=node
)

echo [*] Launching FoodLoop Native Web Server on http://localhost:3000 ...
start "" http://localhost:3000
%NODE_CMD% server.js
pause

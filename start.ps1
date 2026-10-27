# start.ps1 - FoodLoop PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   FoodLoop — Good Food. No Waste." -ForegroundColor White
Write-Host "   B.Tech Internet Programming (IP) Project" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green

$agyNode = "C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd"
$nodeCmd = "node"

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeCmd = "node"
} elseif (Test-Path $agyNode) {
    $nodeCmd = $agyNode
}

Write-Host "[*] Launching browser at http://localhost:3000..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "[*] Starting FoodLoop Backend Server..." -ForegroundColor Green
& $nodeCmd server.js

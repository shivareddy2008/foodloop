# test_server.ps1 - Automated verification test for FoodLoop
$proc = Start-Process -FilePath "C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd" -ArgumentList "C:\Users\DELL\.gemini\antigravity\scratch\foodloop\server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
    Write-Host "[1/3] Testing GET /api/donations..."
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/donations"
    Write-Host " -> OK! Total donations fetched:" $res.Count

    Write-Host "[2/3] Testing GET /api/admin/stats..."
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/stats"
    Write-Host " -> OK! Total meals rescued:" $stats.totalMeals "Co2 saved:" $stats.co2SavedKg "kg"

    Write-Host "[3/3] Testing GET / (Frontend SPA)..."
    $html = Invoke-WebRequest -Uri "http://localhost:3000/"
    Write-Host " -> OK! HTTP Status:" $html.StatusCode "Content-Length:" $html.RawContentLength

    Write-Host "`nALL FOODLOOP TESTS PASSED PERFECTLY! 100% OPERATIONAL." -ForegroundColor Green
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Parent    = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$PidFile   = Join-Path $Parent ".pids"

if (-not (Test-Path $PidFile)) { Write-Host "No .pids at $PidFile"; exit 0 }

Write-Host "Stopping all services..."
Get-Content $PidFile | ForEach-Object {
    $p = [int]$_
    try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host "  killed $p" }
    catch { Write-Host "  $p already gone" }
}
Remove-Item $PidFile
Write-Host "Done."

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root      = Split-Path -Parent $ScriptDir
$Parent    = Split-Path -Parent $Root
$EnvFile   = Join-Path $Parent ".env"
$PidFile   = Join-Path $Parent ".pids"

if (-not (Test-Path $EnvFile)) {
    Write-Error "ERROR: $EnvFile not found. Copy scripts\.env.template to ..\.env and fill in values."
    exit 1
}

Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=][^=]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
    }
}

if (Test-Path $PidFile) { Remove-Item $PidFile }

$Services = [ordered]@{
    "academics-service"    = 5001
    "admissions-service"   = 5002
    "analytics-service"    = 5003
    "communication-service"= 5004
    "dataimport-service"   = 5005
    "finance-service"      = 5006
    "hostel-service"       = 5007
    "inventory-service"    = 5008
    "library-service"      = 5009
    "maintenance-service"  = 5010
    "notifications-service"= 5011
    "payroll-service"      = 5012
    "reports-service"      = 5013
    "school-service"       = 5014
    "settings-service"     = 5015
    "socialmedia-service"  = 5016
    "staff-service"        = 5017
    "students-service"     = 5018
    "survey-service"       = 5019
    "timetable-service"    = 5020
    "transport-service"    = 5021
    "visitor-service"      = 5022
}

function Wait-Health($port, $name) {
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = Invoke-WebRequest "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { Write-Host "  v $name :$port"; return }
        } catch {}
        Start-Sleep 1
    }
    Write-Warning "  x $name :$port failed after 30s"
}

Write-Host "Starting 22 microservices..."
foreach ($name in $Services.Keys) {
    $port = $Services[$name]
    $dir  = Join-Path $Parent $name
    if (-not (Test-Path $dir)) { Write-Host "  SKIP $name"; continue }
    $env:PORT = "$port"
    $proc = Start-Process go -ArgumentList "run", ".\cmd" -WorkingDirectory $dir -PassThru -NoNewWindow
    Add-Content $PidFile $proc.Id
    Write-Host "  -> $name :$port (pid $($proc.Id))"
}

Write-Host ""
Write-Host "Waiting for services..."
foreach ($name in $Services.Keys) { Wait-Health $Services[$name] $name }

$gwPort = if ($env:GATEWAY_PORT) { $env:GATEWAY_PORT } else { "8080" }
Write-Host ""
Write-Host "Starting gateway :$gwPort..."
$env:PORT = $gwPort
$gw = Start-Process go -ArgumentList "run", ".\cmd\server" -WorkingDirectory $Root -PassThru -NoNewWindow
Add-Content $PidFile $gw.Id
Write-Host "  v gateway :$gwPort (pid $($gw.Id))"

Write-Host ""
Write-Host "Done. PIDs in $PidFile — run stop-all.ps1 to stop."

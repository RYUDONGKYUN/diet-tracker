# Gives the diet tracker its own FIXED address through Tailscale, next to other apps on the same PC.
# One Tailscale account / one PC = one host name (e.g. desktop-xxxx.tailXXXX.ts.net).
# Different apps are told apart by the HTTPS port: the mindmap keeps 443, this app uses 8443.
#
#   .\diet-tailscale.ps1              tailnet-only (Tailscale "serve"): only your own devices that run
#                                     the Tailscale app can open it. Recommended - the app holds body photos.
#   .\diet-tailscale.ps1 -Funnel      public internet (Tailscale "funnel"): anyone with the URL + APP_PASSWORD.
#                                     Funnel only allows HTTPS ports 443, 8443 and 10000.
#   .\diet-tailscale.ps1 -Off         remove the mapping (serve AND funnel) for this app's HTTPS port.
#
# Settings persist across reboots (tailscale --bg). It never touches other ports, so the mindmap's
# existing mapping on 443 is left alone. NEVER run "tailscale funnel reset" / "tailscale serve reset":
# those delete every mapping, including the mindmap's.
param(
    [switch]$Funnel,
    [switch]$Off,
    [int]$ServerPort = 4100,
    [int]$HttpsPort = 8443
)

$ErrorActionPreference = "Continue"

$ts = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) {
    $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
    if ($cmd) { $ts = $cmd.Source } else {
        Write-Host "tailscale.exe not found. Install Tailscale and sign in first." -ForegroundColor Red
        exit 1
    }
}

if ($Funnel -and ($HttpsPort -notin 443, 8443, 10000)) {
    Write-Host "Funnel only allows HTTPS ports 443, 8443 and 10000 (got $HttpsPort)." -ForegroundColor Red
    exit 1
}

# Host name of this PC on the tailnet (without the trailing dot).
$dns = ""
try {
    $status = (& $ts status --json 2>$null | Out-String) | ConvertFrom-Json
    $dns = $status.Self.DNSName.TrimEnd(".")
} catch { }
if (-not $dns) {
    Write-Host "Could not read the Tailscale host name. Is Tailscale running and signed in?" -ForegroundColor Red
    exit 1
}
$url = if ($HttpsPort -eq 443) { "https://$dns" } else { "https://${dns}:$HttpsPort" }

# Always clear this port first, in both modes, so switching serve <-> funnel never leaves a stale mapping.
& $ts serve --https=$HttpsPort off 2>&1 | Out-Null
& $ts funnel --https=$HttpsPort off 2>&1 | Out-Null

if ($Off) {
    Write-Host "Removed the Tailscale mapping on HTTPS port $HttpsPort." -ForegroundColor Green
    & $ts serve status
    exit 0
}

$listening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $ServerPort }
if (-not $listening) {
    Write-Host "Note: nothing is listening on port $ServerPort yet. Start the diet tracker server first (npm run build, then npm run start)." -ForegroundColor Yellow
}

$mode = if ($Funnel) { "funnel" } else { "serve" }
& $ts $mode --bg --https=$HttpsPort $ServerPort
if ($LASTEXITCODE -ne 0) {
    Write-Host "tailscale $mode failed (see the message above)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Diet tracker address ($mode): $url" -ForegroundColor Green
if (-not $Funnel) {
    Write-Host "Open it on a device that has the Tailscale app signed in to the same account."
} else {
    Write-Host "PUBLIC on the internet - make sure APP_PASSWORD in server\.env is not the default." -ForegroundColor Yellow
}
Set-Clipboard -Value $url -ErrorAction SilentlyContinue
& $ts $mode status

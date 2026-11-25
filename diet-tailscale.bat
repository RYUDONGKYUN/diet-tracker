@echo off
REM Runs diet-tailscale.ps1 from this folder. Pass -Funnel or -Off through: diet-tailscale.bat -Funnel
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diet-tailscale.ps1" %*
pause

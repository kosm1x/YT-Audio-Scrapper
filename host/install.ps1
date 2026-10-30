# Registers the native messaging host with Firefox on Windows (current user, no admin needed).
# Usage:  powershell -ExecutionPolicy Bypass -File .\host\install.ps1
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $dir "yt_audio_host.json"

$manifest = [ordered]@{
    name               = "yt_audio_host"
    description        = "YT Audio Grabber host (yt-dlp)"
    path               = (Join-Path $dir "yt_audio_host.bat")
    type               = "stdio"
    allowed_extensions = @("yt-audio-grabber@local")
}
# UTF-8 without BOM (Firefox rejects a BOM); ConvertTo-Json escapes the backslashes.
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))

$key = "HKCU:\Software\Mozilla\NativeMessagingHosts\yt_audio_host"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(default)" -Value $manifestPath
Write-Host "Registered $manifestPath"

foreach ($tool in @("py", "python")) { if (Get-Command $tool -ErrorAction SilentlyContinue) { $py = $tool; break } }
if (-not $py) { Write-Warning "Python 3 not found. Install: winget install Python.Python.3.12" }
if (-not (Get-Command yt-dlp -ErrorAction SilentlyContinue)) { Write-Warning "yt-dlp not found. Install: winget install yt-dlp.yt-dlp" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Write-Warning "ffmpeg not found. Install: winget install Gyan.FFmpeg" }
Write-Host "Done. Restart Firefox, then load extension\manifest.json from about:debugging."

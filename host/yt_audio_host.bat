@echo off
rem Launcher used by Firefox on Windows (native messaging cannot start .py files directly).
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 "%~dp0yt_audio_host.py"
) else (
  python "%~dp0yt_audio_host.py"
)

#!/usr/bin/env bash
# Registers the native messaging host with Firefox (Linux/macOS).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR/yt_audio_host.py"
case "$(uname)" in
  Darwin) TARGET="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts" ;;
  *)      TARGET="$HOME/.mozilla/native-messaging-hosts" ;;
esac
mkdir -p "$TARGET"
cat > "$TARGET/yt_audio_host.json" <<JSON
{
  "name": "yt_audio_host",
  "description": "YT Audio Grabber host (yt-dlp)",
  "path": "$DIR/yt_audio_host.py",
  "type": "stdio",
  "allowed_extensions": ["yt-audio-grabber@local"]
}
JSON
echo "Installed: $TARGET/yt_audio_host.json"
command -v yt-dlp >/dev/null || echo "WARNING: yt-dlp not found (pip install yt-dlp)"
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg not found (needed for audio conversion)"

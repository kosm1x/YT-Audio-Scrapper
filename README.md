# YT Audio Grabber

A Firefox extension that saves the audio of the YouTube video you are watching with one click.

## What it does

- Adds a **♫ Audio** button to the YouTube player controls, with live progress (`⏳ 42%` → `✔ Saved`).
- Keyboard shortcut `Alt+Shift+A` and a toolbar popup that does the same thing.
- Choose **MP3, M4A (AAC), Opus or FLAC** and a quality level (best / medium / smallest) in the popup.
- Saves to `~/Music/YT-Audio` (override with the `YT_AUDIO_DIR` environment variable), named `Title [videoId].ext`, with metadata and thumbnail embedded (thumbnail skipped for Opus).
- Desktop notification when a download finishes or fails.

## How it works

Browser extensions cannot extract or convert audio on their own, so the project has two parts that talk over Firefox's [native messaging](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Native_messaging):

```
YouTube page ──content.js──▶ background.js ──native messaging──▶ host/yt_audio_host.py ──▶ yt-dlp + ffmpeg
   (button, progress)        (settings, notifications)            (validates, runs, streams progress)
```

| Path | Role |
| --- | --- |
| `extension/manifest.json` | Manifest v2 WebExtension; permissions: `nativeMessaging`, `storage`, `notifications`, `*.youtube.com` |
| `extension/content.js`, `content.css` | Injects the button into the player; re-injects after YouTube's in-page navigation |
| `extension/background.js` | Opens the native port, relays progress to the tab, shows notifications, handles the shortcut |
| `extension/popup.html`, `popup.js` | Format / quality settings (stored in `storage.local`) and a download button |
| `host/yt_audio_host.py` | Native messaging host: speaks the length-prefixed JSON protocol and runs `yt-dlp` |
| `host/install.sh` | Registers the host with Firefox (Linux and macOS) |
| `host/install.ps1`, `host/yt_audio_host.bat` | Registers the host via the Windows registry; the `.bat` launches the Python script |

There is no server and no open port: the browser launches the host only while a download runs.

## Security notes

- The host only accepts `https://(www.|m.|music.)youtube.com/watch?v=<id>` and `https://youtu.be/<id>` links. It extracts the 11-character video ID and rebuilds a canonical URL before calling `yt-dlp`, so extra query parameters never reach the command line.
- `yt-dlp` is invoked with an argument list (no shell) and `--` before the URL.
- Format and quality are checked against allow-lists.
- The host manifest limits access to the extension ID `yt-audio-grabber@local`.

## Install

### Windows (primary target)

1. Install the tools (PowerShell):
   ```powershell
   winget install Python.Python.3.12
   winget install yt-dlp.yt-dlp
   winget install Gyan.FFmpeg
   ```
   Open a new terminal afterwards so `PATH` is refreshed.
2. Register the native host (writes `HKCU\Software\Mozilla\NativeMessagingHosts\yt_audio_host`, no admin rights needed):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\host\install.ps1
   ```
3. Restart Firefox, open `about:debugging` → **This Firefox** → **Load Temporary Add-on…** and choose `extension\manifest.json`.
4. Open a YouTube video and click **♫ Audio**. Files land in `%USERPROFILE%\Music\YT-Audio`.

Firefox cannot start a `.py` file directly on Windows, so the registry points at `host/yt_audio_host.bat`, which runs the Python script through the `py` launcher (or `python`). The host runs `yt-dlp` with `--windows-filenames` and UTF-8 output, and hides the console window.

### Linux / macOS

Requirements: Firefox 91+, Python 3, [`yt-dlp`](https://github.com/yt-dlp/yt-dlp), `ffmpeg`.

```bash
pip install yt-dlp          # plus ffmpeg from your package manager
./host/install.sh
```

Then load `extension/manifest.json` from `about:debugging` as in step 3 above.

A temporary add-on is removed when Firefox restarts. For a permanent install, sign the extension (for example with `web-ext sign` or by submitting it to addons.mozilla.org as unlisted).

## Troubleshooting

- **"Native host unavailable"**: re-run the installer, restart Firefox. On Windows check that the registry key exists and `python --version` (or `py -3 --version`) works in a normal terminal. The Microsoft Store "python" alias does not count; install Python from `winget`.
- **"yt-dlp not found on PATH"**: install it and open a new terminal/restart Firefox so it sees the updated `PATH`.
- **Conversion errors**: `ffmpeg` is missing from `PATH`.
- **YouTube changed and downloads fail**: update the extractor with `yt-dlp -U` (or `winget upgrade yt-dlp.yt-dlp`).

## Limitations

- Single videos only (`--no-playlist`); no queue or history yet.
- Not yet tested end to end in a real Firefox session or on a real Windows machine; the host's validation, protocol framing and progress parsing were tested on Linux with a stand-in `yt-dlp`.
- Download only content you have the right to save. Respect YouTube's Terms of Service and copyright law.

## Possible next steps

Playlist support, a download queue, a history list, and a custom output folder in the popup.

#!/usr/bin/env python3
"""Native messaging host: downloads YouTube audio with yt-dlp."""
import json
import os
import re
import struct
import subprocess
import sys

IS_WINDOWS = os.name == "nt"

if IS_WINDOWS:
    # Native messaging is a binary protocol; stop Windows translating \n / Ctrl-Z.
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

OUT_DIR = os.environ.get("YT_AUDIO_DIR", os.path.expanduser("~/Music/YT-Audio"))
FORMATS = {"mp3", "m4a", "opus", "flac"}
QUALITIES = {"0", "5", "9"}
VIDEO_ID = r"[A-Za-z0-9_-]{11}"
URL_RES = [
    re.compile(rf"^https://(?:www\.|m\.|music\.)?youtube\.com/watch\?(?:[^#]*&)?v=({VIDEO_ID})(?:[&#]|$)"),
    re.compile(rf"^https://youtu\.be/({VIDEO_ID})(?:[?&#/]|$)"),
]


def read_message():
    raw = sys.stdin.buffer.read(4)
    if len(raw) < 4:
        return None
    (length,) = struct.unpack("=I", raw)
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def send(msg):
    data = json.dumps(msg).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(data)) + data)
    sys.stdout.buffer.flush()


def canonical_url(url):
    for rx in URL_RES:
        m = rx.match(url or "")
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}"
    return None


def build_cmd(url, fmt, quality):
    return [
        "yt-dlp", "--no-playlist", "--newline", "--encoding", "utf-8", "--windows-filenames", "-x",
        "--audio-format", fmt, "--audio-quality", quality,
        "--embed-metadata", "--embed-thumbnail" if fmt != "opus" else "--no-embed-thumbnail",
        "-P", OUT_DIR, "-o", "%(title).150B [%(id)s].%(ext)s",
        "--progress-template", "download:PCT %(progress._percent_str)s",
        "--print", "after_move:FILE %(filepath)s",
        "--", url,
    ]


def handle(msg):
    if msg.get("action") != "download":
        return send({"type": "error", "error": "Unknown action"})
    url = canonical_url(msg.get("url"))
    fmt, quality = msg.get("format", "mp3"), str(msg.get("quality", "0"))
    if not url:
        return send({"type": "error", "error": "Not a YouTube video URL"})
    if fmt not in FORMATS or quality not in QUALITIES:
        return send({"type": "error", "error": "Invalid format or quality"})
    os.makedirs(OUT_DIR, exist_ok=True)
    kwargs = {}
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # no console flash
    try:
        # stderr is merged into stdout so a full pipe can never deadlock us.
        proc = subprocess.Popen(build_cmd(url, fmt, quality), stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace", **kwargs)
    except FileNotFoundError:
        return send({"type": "error", "error": "yt-dlp not found on PATH (also needs ffmpeg)"})
    filepath, last_err = None, "yt-dlp failed"
    for line in proc.stdout:
        line = line.strip()
        m = re.match(r"PCT\s+([\d.]+)%", line)
        if m:
            send({"type": "progress", "percent": float(m.group(1))})
        elif line.startswith("FILE "):
            filepath = line[5:]
        elif line.startswith("ERROR"):
            last_err = line
    if proc.wait() == 0:
        send({"type": "done", "file": filepath})
    else:
        send({"type": "error", "error": last_err[:300]})


def main():
    msg = read_message()
    if msg is not None:
        handle(msg)


if __name__ == "__main__":
    main()

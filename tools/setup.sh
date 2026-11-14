#!/usr/bin/env bash
# Install the video-watching toolchain into tools/bin (no root needed).
# Re-run this after the workspace is restored: system packages and plain
# downloads are not part of the checkpoint.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p bin

say() { printf '\n== %s\n' "$1"; }

say "yt-dlp"
if [ ! -x bin/yt-dlp ]; then
  curl -sSL -o bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
  chmod +x bin/yt-dlp
fi
./bin/yt-dlp --version

say "ffmpeg + ffprobe"
if [ ! -x bin/ffmpeg ]; then
  tmp="$(mktemp -d)"
  curl -sSL -o "$tmp/ff.tar.xz" \
    https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz
  tar -xJf "$tmp/ff.tar.xz" -C "$tmp"
  cp "$(find "$tmp" -type f -name ffmpeg | head -1)" bin/ffmpeg
  cp "$(find "$tmp" -type f -name ffprobe | head -1)" bin/ffprobe
  chmod +x bin/ffmpeg bin/ffprobe
  rm -rf "$tmp"
fi
./bin/ffmpeg -version | head -1

say "claude-video watch skill"
if [ ! -f ../.claude/skills/watch/SKILL.md ]; then
  git clone --depth 1 https://github.com/bradautomates/claude-video.git /tmp/claude-video
  mkdir -p ../.claude/skills
  cp -r /tmp/claude-video/skills/watch ../.claude/skills/watch
fi

say "done"
echo "Run a video through:  tools/watch <url-or-file> [--question '...']"
echo "YouTube links need a free Gemini key (see tools/README.md)."

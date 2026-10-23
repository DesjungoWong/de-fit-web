#!/bin/bash
set -euo pipefail

# Only run in Claude Code cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Project dependencies
npm install --no-audit --no-fund

# FFmpeg: cuts + mixes video
if ! command -v ffmpeg >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi

# yt-dlp: downloads videos (Reels etc.)
if ! command -v yt-dlp >/dev/null 2>&1; then
  pip3 install -q yt-dlp
fi

# HyperFrames: HTML video compositions, captions + graphics
if ! command -v hyperframes >/dev/null 2>&1; then
  npm install -g --no-audit --no-fund hyperframes
fi

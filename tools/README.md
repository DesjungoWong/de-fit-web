# tools/ — watching videos

Gives the agent a way to actually watch a video (YouTube, Facebook, TikTok,
local `.mp4`): download → extract frames → read them → answer from what is on
screen.

Installed from [`bradautomates/claude-video`](https://github.com/bradautomates/claude-video) (MIT).

## What is here

| Path | What it is |
|------|------------|
| `bin/yt-dlp` | video downloader (340 MB dir, gitignored — reinstall with `tools/setup.sh`) |
| `bin/ffmpeg`, `bin/ffprobe` | static builds for frame extraction |
| `.claude/skills/watch/` | the `/watch` skill (SKILL.md + Python scripts) |
| `tools/watch` | wrapper: puts `bin/` on `PATH` and runs the skill |
| `tools/setup.sh` | reinstalls everything after a workspace restore |

## Use

```bash
tools/watch <url-or-local-file> [--question "what did they do in step 2?"]

# options that matter
--detail transcript|efficient|balanced|token-burner   # frame budget
--timestamps 0:12,1:30                                 # grab specific moments
--start 0:30 --end 1:00                                # only part of the video
--engine auto|gemini|local
```

`local` (default when there is no key) extracts frames with ffmpeg and writes a
timestamped transcript, and the frames are then read as images.

## YouTube

YouTube blocks download from datacenter IPs with "Sign in to confirm you're not
a bot". Two ways around it:

1. **Gemini engine (recommended, no download).** Get a free key at
   <https://aistudio.google.com/apikey> and put it in the environment or in
   `~/.config/watch/.env` as `GEMINI_API_KEY=...`. The skill then hands the
   whole video, picture and sound, to Google's video model and reports back its
   timestamped answer. Never commit the key.
2. **Cookies**, if a download really is needed:
   `--cookies-from-browser chrome` (a browser profile on this machine) or
   `--cookies cookies.txt` (exported with a browser extension).

## Note

Nothing here survives a workspace restore except the source files: `bin/` is
gitignored and system packages are not checkpointed. Run `tools/setup.sh` to
put the binaries back.

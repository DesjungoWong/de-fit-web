# DE.Fit Web

Vite + React web app mirroring the DE.Fit Android app. Dual-theme (dark/light), 5 screens, Claude AI nutrition estimation and advisory chat.

## Setup

```bash
npm install
cp .env.example .env        # add your Anthropic API key
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub as `DesjungoWong/de-fit-web`
2. Import into Vercel — it auto-detects Vite
3. Add env var `VITE_CLAUDE_API_KEY` in Vercel project settings
4. Deploy

## Screens

| Tab | Feature |
|-----|---------|
| Today | Calorie ring, macro grid, health metrics, AI advisory, chat |
| Log | Catalog quick-add (8 SG foods), describe/photo → Claude estimate |
| Snap | Live camera viewfinder, gallery picker, describe — all → Claude |
| Health | Day/Week/Month/Year KPI cards, trend bars, manual import |
| Settings | Theme, calorie target, fasting window, API key, Drive path |

## Tech

- Vite 5 + React 18
- Claude Haiku via `/v1/messages` (browser, CORS-allowed with `anthropic-dangerous-allow-browser`)
- localStorage for day state and settings
- Zero external UI libraries — CSS variables + inline styles

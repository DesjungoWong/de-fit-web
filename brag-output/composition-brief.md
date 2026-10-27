# Hyperframes Composition Brief: Atrium & AISLE

## Objective
Short polished launch-style brag video for the Citizen Services Asset Catalogue page (Atrium, AISLE + 16-asset catalogue).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30fps
- Duration: 22.6s

## Source Material
- Source: uploaded `Atrium-AISLE-Asset-Catalogue-1.html` (single file: inline CSS, canvas 3D scenes, catalogue data)
- Product names: Atrium; AISLE (Accenture Investigation Solution for Law Enforcement)
- Strongest claim: "Plug, don't replace" / "Nothing you own is retired or rebuilt."
- Key visuals to recreate: Atrium ring-funnel column with six system boxes + AI-platform card; AISLE CASE 360 cuboid with eight-module ring and agent lanes; catalogue card grid with maturity pills.
- Copy that must appear verbatim (re-cased OK):
  - Plug, don't replace
  - Runs on your AI · Copilot / Anthropic / OpenAI / Your own
  - Case systems / Documents and archives / Rules engines / Shared platforms / Portals and email / Project records
  - Agents beside, not inside · Assisted / Supervised / Autonomous · APIs only
  - Incident / Case lifecycle / Subject / Exhibit / Statement / Enclosures / Correspondence / Offence
  - Everything else we can reuse
  - Asset names + subtitles: GENiE 3.0, META, AVA Voice Platform, GDC Air-gap Kit, AVA Holobox, GeBIZ Intelligence
- Excluded (internal doc): client names, commercial figures, evidence numbers, open questions.

## Creative Direction
- Tone preset: polished — quiet premium product film, two colour worlds then daylight
- Hook: "PLUG, DON'T REPLACE." per-word blur-in over the glowing Atrium column
- Outro: "Atrium and AISLE" + "+ 16 assets we can reuse"
- Avoid: generic SaaS language, abstract filler, redesigning the source look

## Visual Identity
- Atrium #1E1230 / #F1E9FF / #C08BFF; AISLE #0B1724 / #E6F4F2 / #45D6C2 / #F2B84B; catalogue #F3F1F7 / #18142A / #6E43D9 / #0F8C7E
- Display: Instrument Serif (local woff2), Body: Instrument Sans (local woff2), Labels: JetBrains Mono (bundled)

## Storyboard
See `brag-plan.md`. 1 Hook 3.2s · 2 Atrium 6.6s · 3 AISLE 5.8s · 4 Catalogue 4.0s · 5 Outro 3.0s.

## Audio
- Role: warm bed under narration; sparse accents
- Music: assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 at 0.32, ducked to 0.13 under VO, fades in/out
- Voice: assets/vo/vo1–4.wav (Kokoro af_heart) at 0.5 / 3.4 / 10.0 / 15.8s
- Cues: preset `assets/music/cues/…vol-12….music-cues.json` (109.96 BPM); lock Atrium→AISLE seam at 9.83; card grid 15.84–18.56; outro title 19.66
- Audio-reactive: subtle, music RMS on the column / cube glow
- SFX: impactSoft_medium_001 (hook), bong_001 (AI roll), impactSoft_medium_004 (flood), drop_001 (modules), card-slide-1 (cards), impactBell_heavy_000 (outro); all ≤0.6

# De.Social · 網

Every reel, one orbit. A 3D reel gallery in the De Universe.

- Static site, no build. `index.html` + Three.js (`js/`) + reels (`reels/`).
- To add a reel: drop `<id>.mp4`, `<id>-loop.mp4` (5s, 360x640, muted) and `<id>.jpg` (360x640 poster) in `reels/`, then add or un-`soon` its entry in the `REELS` list in `index.html`.
- Deployed as its own Vercel project with Root Directory `de-social`.

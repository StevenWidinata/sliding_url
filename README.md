# sliding_url — Steven Widinata, Collected Works

A 3D museum that doubles as a directory of all my projects. Walk through a doorway into a curved hall where every project hangs on the walls, step up to a work, then visit the live site or read its code.

## Features

- **Doorway entrance**: the title card floats over a dark 3D foyer facing a lit doorway; Enter walks you through it and into the hall.
- **Curved museum hall** (Three.js): a ring-shaped hall with no end. Works hang zig-zag on the inner and outer walls, each under a spotlight, with a skylight, light beams, drifting dust, benches and a guide light on a reflective floor. Scroll, swipe up, drag or use ↑ ↓ to walk; you stop softly at each work, and phones lean toward it.
- **Step up to a work**: the camera turns to face it and walks up close, then the frame lifts off the wall into a detail page with **Visit site** and **View code** (GitHub). Deep links work: `/#glitch_type`.
- **Brass nameplates** under every work: the name engraved, its number and a live status dot, with a glint that moves as you walk past.
- **Living artworks**: the current work plays a short muted loop of the real site.
- **Live status** from `/api/status`, which pings every site server-side (retries once, cached 60 s).
- **Index floor plan**: a top-down plan of the hall showing every frame and where you're standing; click a number to walk there. Beside it, a list of every work with GitHub links (also the whole site when WebGL isn't available).
- **Ctrl/⌘+K search**.
- **Day / night** themes (remembered; `T` toggles).
- **Generative soundtrack**: original ambient music synthesised live with the Web Audio API, so there's no copyright to worry about (`M` mutes).
- **Tilt to look** on phones.
- Respects `prefers-reduced-motion`, and drops the floor reflection and resolution automatically on slow GPUs.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also serves /api/status locally)
npm run build
npm run preview
```

## Add or update a project

1. Edit `src/projects.js`. When a "Coming soon" project goes live, paste its URL into `url`. Set `github` to `owner/repo`.
2. Run `npm run capture` (or `npm run capture <slug>`) to take a fresh screenshot and video loop into `public/posters/`. Needs `npx playwright install chromium ffmpeg` once. Sites that need clicks first (TrustPed runs an example analysis, Acel Academy logs in) have steps in `scripts/capture.mjs`; demo logins go in `.env.local` (`ACEL_DEMO_EMAIL`, `ACEL_DEMO_PASSWORD`), which is never committed.
3. Commit and push.

## Stack

Vite · vanilla JS · Three.js · Web Audio · a single Vercel Function (`api/status.js`).

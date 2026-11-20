# sliding_url — Steven Widinata, Collected Works

A 3D gallery that doubles as a directory of all my projects. Every project hangs on a curved gallery wall: slide along it, step into a work, then visit the live site.

## Features

- **Curved 3D gallery** (Three.js): scroll, drag, swipe or use ← → to walk the endless ring of frames.
- **Step into a work**: the frame lifts off the wall, holds in the centre, then becomes a detail page with a **Visit site** button. Deep links work: `/#glitch_type`.
- **Exhibition entrance**: title card, loading line, then the doors slide open and you walk in.
- **Living artworks**: the centred frame plays a short muted loop of the real site.
- **Live status placards**: museum labels under each frame with a green/red dot from `/api/status`, which pings every site server-side (cached 60 s).
- **Ctrl/⌘+K search** and an **Index** grid of every work (also the fallback when WebGL isn't available).
- **White / night gallery** themes (remembered; `T` toggles).
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

1. Edit `src/projects.js`. When a "Coming soon" project goes live, paste its URL into `url`.
2. Run `npm run capture` (or `npm run capture <slug>`) to take a fresh screenshot and video loop into `public/posters/`. Needs `npx playwright install chromium ffmpeg` once.
3. Commit and push.

## Stack

Vite · vanilla JS · Three.js · Web Audio · a single Vercel Function (`api/status.js`).

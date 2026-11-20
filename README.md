# sliding_url

A 3D gallery that works as a directory of all my projects. Every project hangs on a curved gallery wall; slide around, click one to walk into it, then visit the live site.

## Run

```bash
npm install
npm run dev        # local dev server
npm run capture    # re-take screenshots/videos of every live site into public/posters
npm run build
```

## Add or update a project

Edit `src/projects.js`. When a "Coming soon" project goes live, paste its URL into its `url` field and run `npm run capture`.

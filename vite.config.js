import { defineConfig } from 'vite'

// Serve the Vercel function in /api locally too, so `npm run dev` and `npm run preview`
// behave like production without needing `vercel dev`.
function localApi() {
  const handler = (load) => async (req, res, next) => {
    try {
      const mod = await load()
      const response = await mod.GET(new Request(`http://localhost${req.url}`))
      res.statusCode = response.status
      response.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(await response.text())
    } catch (err) {
      next(err)
    }
  }
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/status', handler(() => server.ssrLoadModule('/api/status.js')))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/status', handler(() => import('./api/status.js')))
    },
  }
}

export default defineConfig({
  plugins: [localApi()],
  build: {
    chunkSizeWarningLimit: 900, // three.js is one big chunk; that's expected
  },
})

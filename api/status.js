// Vercel Function: GET /api/status
// Pings every live project from the server and reports {ok, code, ms} per slug.
import { projects } from '../src/projects.js'

const TIMEOUT_MS = 6000

async function check(url) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'sliding-url-status/1.0 (+uptime check)' },
    })
    // we only need the status line; don't download whole pages
    res.body?.cancel().catch(() => {})
    return { ok: res.ok, code: res.status, ms: Date.now() - t0 }
  } catch {
    return { ok: false, code: 0, ms: Date.now() - t0 }
  }
}

// A connection that times out or drops once is usually the network, not the site:
// try once more before painting the dot red for every visitor for the next minute.
async function checkWithRetry(url) {
  const first = await check(url)
  if (first.ok || first.code !== 0) return first
  const second = await check(url)
  return second.ok ? second : first
}

export async function GET() {
  const live = projects.filter((p) => p.url)
  const entries = await Promise.all(live.map(async (p) => [p.slug, await checkWithRetry(p.url)]))
  return Response.json(
    { checkedAt: new Date().toISOString(), sites: Object.fromEntries(entries) },
    {
      headers: {
        // cache at the edge for a minute so visitors don't hammer the sites
        'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}

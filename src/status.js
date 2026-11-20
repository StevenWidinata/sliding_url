// Client side of the live status check (see /api/status.js).

export async function fetchStatus() {
  try {
    const res = await fetch('/api/status', { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return data.sites || {}
  } catch {
    return null // unknown: dots stay grey
  }
}

/**
 * @param project  entry from projects.js
 * @param sites    result of fetchStatus(): undefined = still checking, null = check failed
 */
export function statusInfo(project, sites) {
  if (!project.url) return { state: 'soon', label: 'Coming soon' }
  if (sites === undefined) return { state: 'checking', label: 'Checking…' }
  const s = sites && sites[project.slug]
  if (!s) return { state: 'unknown', label: 'Status unknown' }
  if (s.ok) return { state: 'ok', label: `Online · ${s.ms} ms` }
  return { state: 'down', label: s.code ? `Down · HTTP ${s.code}` : 'Offline' }
}

export const STATUS_COLORS = {
  ok: '#1f9d55',
  down: '#d64545',
  soon: '#d4a017',
  checking: '#a8a49c',
  unknown: '#a8a49c',
}

export function statusDot(state) {
  return `<span class="dot dot--${state}" aria-hidden="true"></span>`
}

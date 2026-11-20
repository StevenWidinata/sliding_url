// Light "white gallery" / dark "night gallery" theme, remembered per browser.
const KEY = 'sliding_url:theme'
const META = { light: '#f2f1ee', dark: '#0c0c0e' }

function stored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function createTheme() {
  const media = matchMedia('(prefers-color-scheme: dark)')
  let current = stored() || (media.matches ? 'dark' : 'light')
  const listeners = []

  function apply(name, animate) {
    current = name
    document.documentElement.dataset.theme = name
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[name])
    listeners.forEach((fn) => fn(name, animate))
  }
  apply(current, false)

  // follow the OS until the visitor picks a side
  media.addEventListener('change', (e) => {
    if (!stored()) apply(e.matches ? 'dark' : 'light', true)
  })

  return {
    get current() {
      return current
    },
    toggle() {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {}
      apply(next, true)
    },
    onChange(fn) {
      listeners.push(fn)
    },
  }
}

export const THEME_ICONS = {
  // shown icon = what you switch TO
  light: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor"/></svg>`,
  dark: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>`,
}

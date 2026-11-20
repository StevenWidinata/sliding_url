// Ctrl/Cmd+K command palette: fuzzy-find any work and walk straight to it.
import { posterSrc } from './posters.js'
import { statusInfo, statusDot } from './status.js'

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function subsequence(needle, hay) {
  let i = 0
  for (const ch of hay) if (ch === needle[i]) i++
  return i === needle.length
}

export function score(p, query) {
  const q = query.trim().toLowerCase()
  if (!q) return 1
  const title = p.title.toLowerCase()
  const fields = [p.kicker, p.slug, ...p.tech].join(' ').toLowerCase()
  const desc = p.description.toLowerCase()
  let total = 0
  for (const word of q.split(/\s+/)) {
    let s = 0
    if (title.startsWith(word)) s = 100
    else if (title.split(/\s+/).some((w) => w.startsWith(word))) s = 80
    else if (title.includes(word)) s = 60
    else if (fields.includes(word)) s = 35
    else if (subsequence(word, title)) s = 25
    else if (desc.includes(word)) s = 10
    if (!s) return 0 // every word must match something
    total += s
  }
  return total
}

export function createPalette({ projects, onPick }) {
  const root = document.createElement('div')
  root.className = 'palette'
  root.innerHTML = `
    <div class="palette__scrim"></div>
    <div class="palette__box" role="dialog" aria-modal="true" aria-label="Search works">
      <div class="palette__field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" placeholder="Search works, tech, ideas…" aria-label="Search works" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="palette-list" />
        <kbd>Esc</kbd>
      </div>
      <ul class="palette__list" id="palette-list" role="listbox"></ul>
      <p class="palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span></p>
    </div>
  `
  document.body.appendChild(root)
  const input = root.querySelector('input')
  const list = root.querySelector('.palette__list')
  let isOpen = false
  let results = []
  let active = 0
  let sites
  let lastFocus = null

  function render() {
    results = projects
      .map((p, i) => ({ p, i, s: score(p, input.value) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
    active = Math.min(active, Math.max(0, results.length - 1))
    list.innerHTML = results.length
      ? results
          .map(({ p, i }, k) => {
            const info = statusInfo(p, sites)
            return `<li role="option" id="pal-${i}" data-pi="${i}" aria-selected="${k === active}" class="palette__item${k === active ? ' is-active' : ''}">
              <img src="${posterSrc(p)}" alt="" />
              <span class="palette__text"><strong>${esc(p.title)}</strong><em>${esc(p.kicker)} · ${esc(p.tech.slice(0, 3).join(', '))}</em></span>
              <span class="palette__status">${statusDot(info.state)}</span>
            </li>`
          })
          .join('')
      : `<li class="palette__empty">No works match “${esc(input.value)}”</li>`
    if (results.length) input.setAttribute('aria-activedescendant', `pal-${results[active].i}`)
  }

  function setActive(k) {
    if (!results.length) return
    active = (k + results.length) % results.length
    list.querySelectorAll('.palette__item').forEach((el, j) => {
      el.classList.toggle('is-active', j === active)
      el.setAttribute('aria-selected', String(j === active))
    })
    input.setAttribute('aria-activedescendant', `pal-${results[active].i}`)
    list.children[active]?.scrollIntoView({ block: 'nearest' })
  }

  function open() {
    if (isOpen) return
    isOpen = true
    lastFocus = document.activeElement
    input.value = ''
    active = 0
    render()
    root.classList.add('is-open')
    setTimeout(() => input.focus(), 10)
  }

  function close() {
    if (!isOpen) return
    isOpen = false
    root.classList.remove('is-open')
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true })
  }

  function pick(k = active) {
    const r = results[k]
    if (!r) return
    close()
    onPick(r.i)
  }

  input.addEventListener('input', () => {
    active = 0
    render()
  })
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-pi]')
    if (li) pick([...list.children].indexOf(li))
  })
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[data-pi]')
    if (li) {
      const k = [...list.children].indexOf(li)
      if (k !== active) setActive(k)
    }
  })
  root.querySelector('.palette__scrim').addEventListener('click', close)

  // capture phase: while open, the palette owns the keyboard
  window.addEventListener(
    'keydown',
    (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopImmediatePropagation()
        isOpen ? close() : open()
        return
      }
      if (!isOpen) {
        const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea')
        if (e.key === '/' && !typing) {
          e.preventDefault()
          open()
        }
        return
      }
      e.stopImmediatePropagation()
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowDown') setActive(active + 1)
      else if (e.key === 'ArrowUp') setActive(active - 1)
      else if (e.key === 'Enter') pick()
      else return
      e.preventDefault()
    },
    true,
  )

  return {
    open,
    close,
    get isOpen() {
      return isOpen
    },
    setSites(s) {
      sites = s
      if (isOpen) render()
    },
  }
}

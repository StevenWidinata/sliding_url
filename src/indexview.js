// Index view: a flat grid of every work. Also the fallback when WebGL is unavailable.
import { posterSrc } from './posters.js'
import { statusInfo, statusDot } from './status.js'

const pad = (n) => String(n).padStart(2, '0')

export function createIndexView({ projects, gallery, hud, getDetail, standalone = false }) {
  const root = document.createElement('section')
  root.className = 'index'
  root.setAttribute('aria-label', 'Index of all works')
  root.innerHTML = `
    <header class="index__head">
      <div>
        <p class="index__kicker">Steven Widinata · Collected Works</p>
        <h2 class="index__title">Index</h2>
      </div>
      ${standalone ? '' : '<button class="pill index__close" type="button">Back to gallery</button>'}
    </header>
    <ol class="index__grid">
      ${projects
        .map(
          (p, i) => `
        <li class="card${p.url ? '' : ' card--soon'}" style="--d:${i}">
          <button class="card__btn" type="button" data-pi="${i}" aria-label="Open ${p.title}">
            <span class="card__media"><img src="${posterSrc(p)}" alt="" loading="lazy" decoding="async" /></span>
            <span class="card__meta">No. ${pad(i + 1)} · ${p.kicker}</span>
            <span class="card__title">${p.title}</span>
            <span class="card__status" data-status="${i}"></span>
          </button>
        </li>`,
        )
        .join('')}
    </ol>
  `
  document.body.appendChild(root)

  let isOpen = false
  let sites
  const imgOf = (pi) => root.querySelector(`[data-pi="${pi}"] img`)
  const rectOf = (pi) => {
    const r = imgOf(pi).getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }
  const listeners = []

  function renderStatus() {
    root.querySelectorAll('[data-status]').forEach((el) => {
      const info = statusInfo(projects[+el.dataset.status], sites)
      el.innerHTML = `${statusDot(info.state)}<span>${info.label}</span>`
    })
  }
  renderStatus()

  function open() {
    if (isOpen) return
    isOpen = true
    root.classList.add('is-open')
    document.documentElement.classList.add('index-open')
    gallery.setInteractive(false)
    hud.setVisible(false)
    listeners.forEach((fn) => fn(true))
    const first = root.querySelector('.card__btn')
    if (first && !standalone) setTimeout(() => first.focus({ preventScroll: true }), 50)
  }

  function close() {
    if (!isOpen || standalone) return
    isOpen = false
    root.classList.remove('is-open')
    document.documentElement.classList.remove('index-open')
    gallery.setInteractive(true)
    hud.setVisible(true)
    listeners.forEach((fn) => fn(false))
  }

  function openProject(pi) {
    imgOf(pi).scrollIntoView({ block: 'nearest' })
    // keep the gallery in sync so closing the index lands on the same work
    gallery.goToProject(pi)
    getDetail().open(pi, {
      fromRect: rectOf(pi),
      returnRect: (cur) => {
        imgOf(cur).scrollIntoView({ block: 'nearest' })
        return rectOf(cur)
      },
    })
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.card__btn')
    if (btn) openProject(+btn.dataset.pi)
    if (e.target.closest('.index__close')) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen && !getDetail().isOpen) close()
  })

  if (standalone) open()

  return {
    open,
    close,
    toggle: () => (isOpen ? close() : open()),
    openProject,
    get isOpen() {
      return isOpen
    },
    onChange(fn) {
      listeners.push(fn)
    },
    setSites(s) {
      sites = s
      renderStatus()
    },
  }
}

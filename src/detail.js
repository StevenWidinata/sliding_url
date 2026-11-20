// Project detail view: the poster flies out of the wall to the centre (reel frame aa3),
// then slides left as the info column appears (reel frames aa2/aa1).
import { posterSrc } from './posters.js'

const pad = (n) => String(n).padStart(2, '0')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const hostOf = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

export function createDetail({ projects, gallery, hud, reducedMotion }) {
  const N = projects.length
  const stage = document.getElementById('stage')
  const root = document.createElement('section')
  root.className = 'detail'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-labelledby', 'detail-title')
  root.innerHTML = `
    <header class="detail__bar">
      <button class="detail__back" type="button"><span aria-hidden="true">←</span> Back to gallery</button>
      <div class="detail__nav">
        <span class="detail__count"></span>
        <button class="detail__step" data-step="-1" type="button" aria-label="Previous project">←</button>
        <button class="detail__step" data-step="1" type="button" aria-label="Next project">→</button>
      </div>
    </header>
    <div class="detail__grid">
      <figure class="detail__figure">
        <div class="detail__slot"></div>
        <figcaption class="detail__figcap"></figcaption>
      </figure>
      <div class="detail__info">
        <p class="detail__kicker"></p>
        <h2 class="detail__title" id="detail-title"></h2>
        <p class="detail__year"></p>
        <p class="detail__desc"></p>
        <p class="detail__status" hidden></p>
        <dl class="detail__rows">
          <div class="detail__row"><dt>Built with</dt><dd class="detail__tech"></dd></div>
          <div class="detail__row"><dt>Address</dt><dd class="detail__host"></dd></div>
        </dl>
        <a class="detail__visit" target="_blank" rel="noopener"></a>
      </div>
    </div>
  `
  document.body.appendChild(root)

  const flyer = document.createElement('div')
  flyer.className = 'detail__flyer'
  document.body.appendChild(flyer)
  const midcap = document.createElement('p')
  midcap.className = 'detail__midcap'
  document.body.appendChild(midcap)

  const $ = (s) => root.querySelector(s)
  const slot = $('.detail__slot')
  const info = $('.detail__info')
  const media = document.createElement('div')
  media.className = 'detail__media'
  const img = document.createElement('img')
  img.alt = ''
  img.decoding = 'async'
  media.appendChild(img)
  slot.appendChild(media)

  let isOpen = false
  let busy = false
  let current = -1
  let returnRect = null
  const hooks = { fill: [], open: [], close: [] }

  function fill(pi) {
    const p = projects[pi]
    current = pi
    img.src = posterSrc(p)
    img.alt = `Screenshot of ${p.title}`
    $('.detail__count').textContent = `No. ${pad(pi + 1)} / ${pad(N)}`
    $('.detail__kicker').textContent = p.kicker
    $('.detail__title').textContent = p.title
    $('.detail__year').textContent = `${p.year}${p.url ? '' : ' · in progress'}`
    $('.detail__desc').textContent = p.description
    $('.detail__tech').innerHTML = p.tech.map((t) => `<span class="chip">${t}</span>`).join('')
    $('.detail__host').textContent = p.url ? hostOf(p.url) : 'Not deployed yet'
    $('.detail__figcap').textContent = p.url ? `Live at ${hostOf(p.url)}` : 'Preview poster · the live site is on its way'
    const visit = $('.detail__visit')
    if (p.url) {
      visit.href = p.url
      visit.removeAttribute('aria-disabled')
      visit.removeAttribute('tabindex')
      visit.innerHTML = `Visit site <span aria-hidden="true">↗</span>`
    } else {
      visit.removeAttribute('href')
      visit.setAttribute('aria-disabled', 'true')
      visit.setAttribute('tabindex', '-1')
      visit.textContent = 'Not live yet · coming soon'
    }
    root.classList.toggle('is-soon', !p.url)
    midcap.innerHTML = `<span>${p.kicker}</span><em>${p.title}</em>`
    hooks.fill.forEach((fn) => fn(pi, media))
  }

  const rectOf = (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  function midRect() {
    const vw = innerWidth
    const vh = innerHeight
    const w = Math.min(vw * (vw < 700 ? 0.86 : 0.5), vh * 0.55 * 1.6)
    const h = w / 1.6
    return { left: (vw - w) / 2, top: (vh - h) / 2 - vh * 0.04, width: w, height: h }
  }

  function placeFlyer(r) {
    Object.assign(flyer.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    })
  }

  /** Animate the flyer from rect `a` to rect `b` (FLIP: sit at b, transform back from a). */
  function fly(a, b, dur) {
    placeFlyer(b)
    if (reducedMotion) dur = 1
    const sx = a.width / b.width
    const sy = a.height / b.height
    const tx = a.left - b.left
    const ty = a.top - b.top
    return flyer.animate(
      [
        { transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})` },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      { duration: dur, easing: 'cubic-bezier(0.65, 0, 0.2, 1)', fill: 'both' },
    ).finished
  }

  async function open(pi, opts = {}) {
    if (isOpen || busy) return
    busy = true
    isOpen = true
    returnRect = opts.returnRect || null
    $('.detail__back').innerHTML = `<span aria-hidden="true">←</span> Back to ${returnRect ? 'index' : 'gallery'}`
    fill(pi)
    hooks.open.forEach((fn) => fn(pi))
    gallery.setInteractive(false)
    hud.setVisible(false)

    let start = opts.fromRect
    if (!start) {
      await gallery.dollyTo(0.42, 0.55)
      start = gallery.centerRect()
    }
    flyer.appendChild(media)
    flyer.classList.add('is-active')
    placeFlyer(start)
    root.classList.add('is-open')
    stage.classList.add('is-faded')
    document.documentElement.classList.add('detail-open')

    // 1) glide to the centre and hold, like the reel
    const mid = midRect()
    await fly(start, mid, 720)
    Object.assign(midcap.style, { top: `${mid.top + mid.height + 18}px` })
    midcap.classList.add('is-visible')
    await wait(reducedMotion ? 0 : 700)

    // 2) slide into the page layout while the info column fades in
    midcap.classList.remove('is-visible')
    const fin = rectOf(slot)
    root.classList.add('is-revealed')
    await fly(mid, fin, 760)
    slot.appendChild(media)
    flyer.classList.remove('is-active')
    flyer.getAnimations().forEach((a) => a.cancel())
    busy = false
    $('.detail__back').focus({ preventScroll: true })
    if (location.hash !== `#${projects[pi].slug}`) history.pushState({ detail: pi }, '', `#${projects[pi].slug}`)
  }

  async function close({ fromHistory = false } = {}) {
    if (!isOpen || busy) return
    busy = true
    hooks.close.forEach((fn) => fn(current))
    const fin = rectOf(slot)
    flyer.appendChild(media)
    flyer.classList.add('is-active')
    placeFlyer(fin)
    root.classList.remove('is-revealed')
    await wait(reducedMotion ? 0 : 180)

    stage.classList.remove('is-faded')
    root.classList.add('is-closing')
    const end = returnRect ? returnRect(current) : gallery.centerRect()
    await fly(fin, end, 680)
    root.classList.remove('is-open', 'is-closing')
    document.documentElement.classList.remove('detail-open')
    flyer.classList.remove('is-active')
    flyer.getAnimations().forEach((a) => a.cancel())
    slot.appendChild(media)
    isOpen = false
    if (!returnRect) {
      await gallery.dollyTo(0, 0.6)
      gallery.setInteractive(true)
      hud.setVisible(true)
    }
    busy = false
    if (!fromHistory && history.state && history.state.detail !== undefined) history.back()
  }

  async function step(delta) {
    if (!isOpen || busy) return
    const next = (current + delta + N) % N
    root.classList.add('is-stepping')
    await wait(reducedMotion ? 0 : 220)
    fill(next)
    gallery.goToProject(next)
    history.replaceState({ detail: next }, '', `#${projects[next].slug}`)
    root.classList.remove('is-stepping')
  }

  $('.detail__back').addEventListener('click', () => close())
  root.querySelectorAll('.detail__step').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)))
  window.addEventListener('keydown', (e) => {
    if (!isOpen) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowLeft') step(-1)
    else return
    e.preventDefault()
  })
  window.addEventListener('popstate', () => {
    if (isOpen && !location.hash) close({ fromHistory: true })
  })

  return {
    open,
    close,
    get isOpen() {
      return isOpen
    },
    get current() {
      return current
    },
    on(type, fn) {
      hooks[type].push(fn)
    },
    statusEl: $('.detail__status'),
  }
}

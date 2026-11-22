// Index: a floor plan of the hall (click a spot to walk there) beside a list of every work.
// Also the whole site when WebGL is unavailable (then there's no plan to walk).
import { posterSrc } from './posters.js'
import { statusInfo, statusDot, STATUS_COLORS } from './status.js'
import { GITHUB_ICON, repoInfo } from './github.js'

const pad = (n) => String(n).padStart(2, '0')
const SVG_R = 100 // outer wall radius in the plan's own units

/** Top-down drawing of the ring: walls, skylight, the doorway at the bottom, and a spot per frame. */
function planSvg(plan, projects) {
  const k = SVG_R / plan.outer
  const ri = plan.inner * k
  const ro = SVG_R
  const rc = (ri + ro) / 2
  // rotate so the doorway sits at the bottom; walking direction runs clockwise from there
  const at = (angle, r) => {
    const a = angle - plan.door.angle
    return [r * Math.sin(a), r * Math.cos(a)]
  }
  const gapHalf = (plan.door.width / 2 / plan.outer) * 1.15
  const [gx1, gy1] = at(plan.door.angle + gapHalf, ro)
  const [gx2, gy2] = at(plan.door.angle - gapHalf, ro)
  const spots = plan.positions
    .map(({ slot, pi, angle, inner }) => {
      const [x, y] = at(angle, inner ? ri + 4.2 : ro - 4.2)
      return `<g class="plan__spot" data-pi="${pi}" data-slot="${slot}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
          <circle class="plan__halo" r="8.5"></circle>
          <circle class="plan__disc" r="5.6"></circle>
          <text class="plan__num" y="1.9">${pad(pi + 1)}</text>
          <circle class="plan__status" data-status="${pi}" cx="4.4" cy="-4.4" r="1.6"></circle>
        </g>`
    })
    .join('')
  return `
    <svg class="plan__svg" viewBox="-118 -118 236 236" role="img" aria-label="Floor plan of the hall with ${projects.length} works">
      <defs>
        <marker id="plan-arrow" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L6 3 L0 6 z" class="plan__arrowhead"></path>
        </marker>
      </defs>
      <circle class="plan__floor" r="${rc}" stroke-width="${ro - ri}"></circle>
      <circle class="plan__sky" r="${rc}"></circle>
      <circle class="plan__wall" r="${ri}"></circle>
      <path class="plan__wall" d="M ${gx1.toFixed(2)} ${gy1.toFixed(2)} A ${ro} ${ro} 0 1 0 ${gx2.toFixed(2)} ${gy2.toFixed(2)}"></path>
      <g class="plan__door" transform="translate(0 ${ro})">
        <path d="M -9 0 L -9 9 M 9 0 L 9 9"></path>
        <path class="plan__arrow" d="M 0 15 L 0 3 M -3 6 L 0 3 L 3 6"></path>
        <text y="24">ENTRANCE</text>
      </g>
      <path class="plan__dir" marker-end="url(#plan-arrow)" d="${(() => {
        const [x1, y1] = at(plan.door.angle + 0.35, rc)
        const [x2, y2] = at(plan.door.angle + 0.75, rc)
        return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rc} ${rc} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`
      })()}"></path>
      ${spots}
      <g class="plan__here" hidden><circle r="3.4"></circle><circle class="plan__here-ring" r="3.4"></circle></g>
      <text class="plan__centre" y="-4">THE HALL</text>
      <text class="plan__centre plan__centre--sub" y="8">${plan.slots} frames · ${projects.length} works</text>
    </svg>`
}

export function createIndexView({ projects, gallery, hud, getDetail, standalone = false }) {
  const plan = !standalone && gallery.plan ? gallery.plan() : null
  const live = projects.filter((p) => p.url).length
  const root = document.createElement('section')
  root.className = 'index'
  root.setAttribute('aria-label', 'Index of all works')
  root.innerHTML = `
    <header class="index__head">
      <div class="index__heading">
        <p class="index__kicker">Steven Widinata · Collected Works</p>
        <h2 class="index__title">Index <em>of works</em></h2>
        <p class="index__meta">
          <span>${projects.length} works</span>
          <span>${statusDot('ok')} ${live} live</span>
          ${live < projects.length ? `<span>${statusDot('soon')} ${projects.length - live} coming soon</span>` : ''}
        </p>
      </div>
      ${standalone ? '' : '<button class="pill index__close" type="button">Back to gallery</button>'}
    </header>
    <div class="index__body${plan ? '' : ' index__body--solo'}">
      ${
        plan
          ? `<figure class="plan">
              ${planSvg(plan, projects)}
              <figcaption class="plan__cap">Click a number to walk to that work. Each work hangs twice around the ring.</figcaption>
            </figure>`
          : ''
      }
      <ol class="works">
        ${projects
          .map((p, i) => {
            const repo = repoInfo(p)
            return `
          <li class="work${p.url ? '' : ' work--soon'}" style="--d:${i}" data-pi="${i}">
            <button class="work__open" type="button" data-pi="${i}" aria-label="Open ${p.title}">
              <span class="work__media"><img src="${posterSrc(p)}" alt="" loading="lazy" decoding="async" /></span>
              <span class="work__num">${pad(i + 1)}</span>
              <span class="work__text">
                <span class="work__title">${p.title}</span>
                <span class="work__kicker">${p.kicker}</span>
                <span class="work__status" data-status="${i}"></span>
              </span>
            </button>
            ${
              repo
                ? `<a class="work__gh" href="${repo.url}" target="_blank" rel="noopener" aria-label="${p.title} on GitHub${repo.team ? ' (team repo)' : ''}" title="github.com/${repo.path}">${GITHUB_ICON}</a>`
                : ''
            }
          </li>`
          })
          .join('')}
      </ol>
    </div>
  `
  document.body.appendChild(root)

  let isOpen = false
  let sites
  const imgOf = (pi) => root.querySelector(`.work__open[data-pi="${pi}"] img`)
  const rectOf = (pi) => {
    const r = imgOf(pi).getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }
  const listeners = []

  function renderStatus() {
    root.querySelectorAll('.work__status').forEach((el) => {
      const info = statusInfo(projects[+el.dataset.status], sites)
      el.innerHTML = `${statusDot(info.state)}<span>${info.label}</span>`
    })
    root.querySelectorAll('.plan__status').forEach((el) => {
      el.setAttribute('fill', STATUS_COLORS[statusInfo(projects[+el.dataset.status], sites).state])
    })
  }
  renderStatus()

  // hovering a work lights up its spots on the plan, and the other way round
  function highlight(pi) {
    root.querySelectorAll('[data-pi]').forEach((el) => el.classList.toggle('is-lit', pi !== null && +el.dataset.pi === pi))
  }
  root.addEventListener('pointerover', (e) => {
    const el = e.target.closest('.work, .plan__spot')
    highlight(el ? +el.dataset.pi : null)
  })
  root.addEventListener('focusin', (e) => {
    const el = e.target.closest('.work')
    highlight(el ? +el.dataset.pi : null)
  })

  function showHere() {
    const here = root.querySelector('.plan__here')
    if (!here || gallery.currentSlot === undefined) return
    const spot = root.querySelector(`.plan__spot[data-slot="${gallery.currentSlot}"]`)
    if (!spot) return
    here.setAttribute('transform', spot.getAttribute('transform'))
    here.hidden = false
  }

  function open() {
    if (isOpen) return
    isOpen = true
    showHere()
    root.classList.add('is-open')
    document.documentElement.classList.add('index-open')
    gallery.setInteractive(false)
    hud.setVisible(false)
    listeners.forEach((fn) => fn(true))
    const first = root.querySelector('.work__open')
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

  function walkTo(pi) {
    close()
    gallery.goToProject(pi)
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.work__open')
    if (btn) return openProject(+btn.dataset.pi)
    const spot = e.target.closest('.plan__spot')
    if (spot) return walkTo(+spot.dataset.pi)
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

import * as THREE from 'three'
import './styles/base.css'
import './styles/hud.css'
import './styles/detail.css'
import './styles/intro.css'
import './styles/search.css'
import { projects } from './projects.js'
import { createGallery, webglAvailable } from './gallery.js'
import { createHud, addPill } from './ui.js'
import { createDetail } from './detail.js'
import { createIntro } from './intro.js'
import { createAudio } from './audio.js'
import { createLiving } from './living.js'
import { createPlacards } from './placards.js'
import { fetchStatus, statusInfo, statusDot } from './status.js'
import { createIndexView } from './indexview.js'
import { createPalette } from './palette.js'
import { createTheme, THEME_ICONS } from './theme.js'

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4
const hasWebGL = webglAvailable()

const theme = createTheme()

const manager = new THREE.LoadingManager()
const audio = createAudio()
const enterHooks = [() => audio.start()]
let entered = false
let enter = () => {}
const intro = createIntro({ manager, count: projects.length, reducedMotion, onEnter: () => enter() })

/** Stand-in used when WebGL is unavailable: the Index grid becomes the whole site. */
function galleryStub() {
  return {
    current: -1,
    on() {},
    start() {},
    setTheme() {},
    setInteractive() {},
    setTilt() {},
    playIntro() {},
    next() {},
    prev() {},
    goToProject: async () => {},
    dollyTo: async () => {},
    centerRect: () => ({ left: innerWidth / 2, top: innerHeight / 2, width: 1, height: 1 }),
  }
}

async function boot() {
  // posters draw text with Archivo, so wait (briefly) for it
  await Promise.race([document.fonts.load('800 40px Archivo'), new Promise((r) => setTimeout(r, 2500))])

  const gallery = hasWebGL
    ? createGallery({ container: document.getElementById('stage'), projects, manager, reducedMotion, lowPower })
    : galleryStub()
  gallery.setTheme(theme.current)

  let detail = null
  const open = (pi) => detail && detail.open(pi)

  const hud = createHud(document.getElementById('hud'), projects, {
    onPrev: () => gallery.prev(),
    onNext: () => gallery.next(),
    onOpen: () => open(gallery.current),
  })
  gallery.on('center', (pi) => hud.setProject(pi))
  gallery.on('open', open)
  gallery.on('interact', () => hud.hideHint())
  detail = createDetail({ projects, gallery, hud, reducedMotion })

  // index grid + Ctrl+K search
  const index = createIndexView({ projects, gallery, hud, getDetail: () => detail, standalone: !hasWebGL })
  const palette = createPalette({
    projects,
    onPick: async (pi) => {
      if (!entered) return
      if (detail.isOpen) await detail.close()
      if (index.isOpen) index.close()
      if (!hasWebGL) return index.openProject(pi)
      await gallery.goToProject(pi)
      detail.open(pi)
    },
  })
  addPill(hud.pills, {
    label: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span class="pill__text">${/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</span>`,
    title: 'Search works (Ctrl+K)',
    onClick: () => palette.open(),
    order: 1,
  })
  addPill(hud.pills, {
    label: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" fill="currentColor"/><rect x="14" y="3" width="7" height="7" fill="currentColor"/><rect x="3" y="14" width="7" height="7" fill="currentColor"/><rect x="14" y="14" width="7" height="7" fill="currentColor"/></svg><span class="pill__text">Index</span>`,
    title: 'Index of all works',
    onClick: () => index.open(),
    order: 2,
  })

  if (hasWebGL) createLiving({ gallery, detail, projects, reducedMotion })

  // live status: placards on the wall, caption, index, search and detail view
  const placards = hasWebGL ? createPlacards({ gallery, projects }) : null
  placards?.setTheme(theme.current)
  let sites // undefined while checking
  const statusHtml = (pi) => {
    const info = statusInfo(projects[pi], sites)
    return `${statusDot(info.state)}<span>${info.label}</span>`
  }
  const refreshStatusText = () => {
    if (gallery.current >= 0) hud.setStatus(statusHtml(gallery.current))
    if (detail.current >= 0) {
      detail.statusEl.innerHTML = statusHtml(detail.current)
      detail.statusEl.hidden = false
    }
  }
  gallery.on('center', refreshStatusText)
  detail.on('fill', refreshStatusText)
  fetchStatus().then((s) => {
    sites = s
    placards?.setSites(s)
    index.setSites(s)
    palette.setSites(s)
    refreshStatusText()
  })

  // light / dark
  const themePill = addPill(hud.pills, { label: '', onClick: () => theme.toggle(), order: 3 })
  const syncTheme = (name) => {
    themePill.innerHTML = THEME_ICONS[name]
    const label = name === 'dark' ? 'Switch to the white gallery (T)' : 'Switch to the night gallery (T)'
    themePill.setAttribute('aria-label', label)
    themePill.title = label
  }
  syncTheme(theme.current)
  theme.onChange((name, animate) => {
    syncTheme(name)
    gallery.setTheme(name, animate)
    placards?.setTheme(name)
  })
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
    if (entered) theme.toggle()
  })

  // sound
  const soundPill = addPill(hud.pills, {
    label: `<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="pill__text">Sound</span>`,
    onClick: () => audio.toggle(),
    order: 4,
  })
  soundPill.classList.add('pill--sound')
  const syncSound = (muted) => {
    soundPill.classList.toggle('is-muted', muted)
    soundPill.setAttribute('aria-label', muted ? 'Turn sound on (M)' : 'Mute sound (M)')
    soundPill.title = muted ? 'Turn sound on (M)' : 'Mute sound (M)'
  }
  syncSound(audio.muted)
  audio.onChange(syncSound)
  gallery.on('center', () => entered && audio.tick())
  detail.on('open', () => audio.chime(true))
  detail.on('close', () => audio.chime(false))
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
    if (entered) audio.toggle()
  })

  gallery.setInteractive(false)
  hud.setVisible(false)
  gallery.start()
  if (!hasWebGL) intro.ready()

  enter = () => {
    entered = true
    enterHooks.forEach((fn) => fn())
    gallery.playIntro(2.8)
    setTimeout(
      () => {
        if (!hasWebGL) return
        gallery.setInteractive(true)
        hud.setVisible(true)
        // deep link: /#slug opens that project
        const linked = projects.findIndex((p) => `#${p.slug}` === location.hash)
        if (linked >= 0) {
          history.replaceState(null, '', location.pathname)
          gallery.goToProject(linked).then(() => detail.open(linked))
        }
      },
      reducedMotion ? 300 : 2600,
    )
  }
}

boot()

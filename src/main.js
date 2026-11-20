import * as THREE from 'three'
import './styles/base.css'
import './styles/hud.css'
import './styles/detail.css'
import './styles/intro.css'
import { projects } from './projects.js'
import { createGallery } from './gallery.js'
import { createHud, addPill } from './ui.js'
import { createDetail } from './detail.js'
import { createIntro } from './intro.js'
import { createAudio } from './audio.js'
import { createLiving } from './living.js'
import { createPlacards } from './placards.js'
import { fetchStatus, statusInfo, statusDot } from './status.js'

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4

const themeName = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
document.documentElement.dataset.theme = themeName

const manager = new THREE.LoadingManager()
const audio = createAudio()
const enterHooks = [() => audio.start()]
let entered = false
let enter = () => {}
createIntro({ manager, count: projects.length, reducedMotion, onEnter: () => enter() })

async function boot() {
  // posters draw text with Archivo, so wait (briefly) for it
  await Promise.race([document.fonts.load('800 40px Archivo'), new Promise((r) => setTimeout(r, 2500))])

  const gallery = createGallery({
    container: document.getElementById('stage'),
    projects,
    manager,
    reducedMotion,
    lowPower,
  })
  gallery.setTheme(themeName)

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

  createLiving({ gallery, detail, projects, reducedMotion })

  // live status: placards on the wall, caption, and detail view
  const placards = createPlacards({ gallery, projects })
  placards.setTheme(themeName)
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
    placards.setSites(s)
    refreshStatusText()
  })

  // sound
  const soundPill = addPill(hud.pills, {
    label: `<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="pill__text">Sound</span>`,
    onClick: () => audio.toggle(),
    order: 3,
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

  enter = () => {
    entered = true
    enterHooks.forEach((fn) => fn())
    gallery.playIntro(2.8)
    setTimeout(
      () => {
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

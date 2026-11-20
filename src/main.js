import * as THREE from 'three'
import './styles/base.css'
import './styles/hud.css'
import './styles/detail.css'
import './styles/intro.css'
import { projects } from './projects.js'
import { createGallery } from './gallery.js'
import { createHud } from './ui.js'
import { createDetail } from './detail.js'
import { createIntro } from './intro.js'

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4

const themeName = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
document.documentElement.dataset.theme = themeName

const manager = new THREE.LoadingManager()
const enterHooks = []
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

  gallery.setInteractive(false)
  hud.setVisible(false)
  gallery.start()

  enter = () => {
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

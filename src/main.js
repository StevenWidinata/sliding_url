import * as THREE from 'three'
import './styles/base.css'
import './styles/hud.css'
import { projects } from './projects.js'
import { createGallery } from './gallery.js'
import { createHud } from './ui.js'

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4

const themeName = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
document.documentElement.dataset.theme = themeName

async function boot() {
  // posters draw text with Archivo, so wait (briefly) for it
  await Promise.race([document.fonts.load('800 40px Archivo'), new Promise((r) => setTimeout(r, 2500))])

  const manager = new THREE.LoadingManager()
  const gallery = createGallery({
    container: document.getElementById('stage'),
    projects,
    manager,
    reducedMotion,
    lowPower,
  })
  gallery.setTheme(themeName)

  const open = (pi) => {
    const p = projects[pi]
    if (p.url) window.open(p.url, '_blank', 'noopener')
  }

  const hud = createHud(document.getElementById('hud'), projects, {
    onPrev: () => gallery.prev(),
    onNext: () => gallery.next(),
    onOpen: () => open(gallery.current),
  })
  gallery.on('center', (pi) => hud.setProject(pi))
  gallery.on('open', open)
  gallery.on('interact', () => hud.hideHint())
  gallery.start()
}

boot()

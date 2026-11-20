// Museum wall labels under each frame: title, tech, and a live status dot.
import * as THREE from 'three'
import { statusInfo, STATUS_COLORS } from './status.js'

const W = 640
const H = 300
const PLACARD_W = 1.75
const PLACARD_H = (PLACARD_W * H) / W

export function createPlacards({ gallery, projects }) {
  const { slots, FRAME_W, FRAME_H, BORDER } = gallery._internals
  let sites // undefined = checking
  let theme = 'light'

  const canvases = projects.map(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return c
  })
  const textures = canvases.map((c) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  })
  const mats = textures.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false }))
  const geo = new THREE.PlaneGeometry(PLACARD_W, PLACARD_H)
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })
  const edgeGeo = new THREE.PlaneGeometry(PLACARD_W + 0.03, PLACARD_H + 0.03)

  for (const sl of slots) {
    const m = new THREE.Mesh(geo, mats[sl.pi])
    const x = FRAME_W / 2 + BORDER - PLACARD_W / 2
    const y = -FRAME_H / 2 - BORDER - 0.22 - PLACARD_H / 2
    m.position.set(x, y, -0.02)
    const edge = new THREE.Mesh(edgeGeo, edgeMat)
    edge.position.set(x + 0.012, y - 0.018, -0.03)
    sl.group.add(edge, m)
  }

  function draw(pi) {
    const p = projects[pi]
    const ctx = canvases[pi].getContext('2d')
    const dark = theme === 'dark'
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = dark ? '#26252a' : '#fcfbf8'
    ctx.fillRect(0, 0, W, H)

    const ink = dark ? '#f1efe9' : '#151515'
    const muted = dark ? '#a19d95' : '#76726b'
    const pad = 36
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = muted
    ctx.font = 'italic 400 26px Newsreader, Georgia, serif'
    ctx.fillText(`No. ${String(pi + 1).padStart(2, '0')} · ${p.year}`, pad, 58)

    ctx.fillStyle = ink
    let size = 58
    do {
      ctx.font = `800 ${size}px Archivo, sans-serif`
      size -= 2
    } while (ctx.measureText(p.title.toUpperCase()).width > W - pad * 2 && size > 28)
    ctx.fillText(p.title.toUpperCase(), pad, 128)

    ctx.fillStyle = muted
    ctx.font = '600 22px Archivo, sans-serif'
    ctx.letterSpacing = '3px'
    let tech = p.tech.join(' · ').toUpperCase()
    while (ctx.measureText(tech).width > W - pad * 2 && tech.includes(' · ')) {
      tech = tech.slice(0, tech.lastIndexOf(' · '))
    }
    ctx.fillText(tech, pad, 176)
    ctx.letterSpacing = '0px'

    // divider + status
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
    ctx.fillRect(pad, 206, W - pad * 2, 2)
    const info = statusInfo(p, sites)
    ctx.beginPath()
    ctx.arc(pad + 11, 252, 11, 0, Math.PI * 2)
    ctx.fillStyle = STATUS_COLORS[info.state]
    ctx.fill()
    if (info.state === 'ok') {
      ctx.beginPath()
      ctx.arc(pad + 11, 252, 18, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(31,157,85,0.35)'
      ctx.lineWidth = 4
      ctx.stroke()
    }
    ctx.fillStyle = ink
    ctx.font = '700 24px Archivo, sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillText(info.label.toUpperCase(), pad + 40, 261)
    ctx.letterSpacing = '0px'
    textures[pi].needsUpdate = true
  }

  const drawAll = () => projects.forEach((_, i) => draw(i))
  drawAll()

  return {
    setSites(s) {
      sites = s
      drawAll()
    },
    setTheme(t) {
      theme = t
      drawAll()
    },
  }
}

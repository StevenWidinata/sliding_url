// Brass nameplates under every work: the name engraved in capitals, its number, and a live status dot.
// A soft glint slides across the brass as you walk past.
import * as THREE from 'three'
import { statusInfo, STATUS_COLORS } from './status.js'

const W = 800
const H = 220
const PLATE_W = 1.36
const PLATE_H = (PLATE_W * H) / W
const pad2 = (n) => String(n).padStart(2, '0')

function glintTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 16
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.42, 'rgba(255,248,225,0)')
  g.addColorStop(0.5, 'rgba(255,248,225,0.85)')
  g.addColorStop(0.58, 'rgba(255,248,225,0)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 16)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Brushed brass with a bevelled edge (also used by the foyer's number plates). */
export function drawBrass(ctx, W = 800, H = 220) {
  // brushed brass: warm gradient, fine horizontal grain, bevelled edge
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#8d6a30')
  g.addColorStop(0.22, '#d9b871')
  g.addColorStop(0.45, '#b38a44')
  g.addColorStop(0.62, '#ecd39a')
  g.addColorStop(0.85, '#a57c3a')
  g.addColorStop(1, '#7c5c27')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,240,200' : '60,40,10'},${Math.random() * 0.06})`
    ctx.fillRect(0, y, W, 1)
  }
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(255,236,190,0.55)'
  ctx.strokeRect(3, 3, W - 6, H - 6)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(70,46,12,0.55)'
  ctx.strokeRect(14, 14, W - 28, H - 28)
}

/** Text cut into the metal: a dark fill with a thin light edge below it. */
export function engrave(ctx, text, x, y) {
  ctx.fillStyle = 'rgba(255,238,196,0.55)'
  ctx.fillText(text, x, y + 2)
  ctx.fillStyle = '#3b2a10'
  ctx.fillText(text, x, y)
}

export function createNameplates({ gallery, projects }) {
  const { slots, camera, FRAME_H, BORDER } = gallery._internals
  let sites // undefined = checking

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
  const plateGeo = new THREE.BoxGeometry(PLATE_W, PLATE_H, 0.025)
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x6f5222 })
  const faceGeo = new THREE.PlaneGeometry(PLATE_W, PLATE_H)
  const glintBase = glintTexture()

  const plates = []
  for (const sl of slots) {
    const plate = new THREE.Group()
    plate.position.set(0, -FRAME_H / 2 - BORDER - 0.16 - PLATE_H / 2, 0)
    const body = new THREE.Mesh(plateGeo, edgeMat)
    const face = new THREE.Mesh(faceGeo, mats[sl.pi])
    face.position.z = 0.0135
    const tex = glintBase.clone()
    tex.needsUpdate = true
    const glintMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55,
    })
    const glint = new THREE.Mesh(faceGeo, glintMat)
    glint.position.z = 0.014
    plate.add(body, face, glint)
    sl.group.add(plate)
    plates.push({ plate, tex })
  }

  function draw(pi) {
    const p = projects[pi]
    const ctx = canvases[pi].getContext('2d')
    ctx.clearRect(0, 0, W, H)
    drawBrass(ctx)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    const info = statusInfo(p, sites)
    ctx.font = '700 22px Archivo, sans-serif'
    ctx.letterSpacing = '6px'
    const meta = `NO. ${pad2(pi + 1)}  ·  ${info.state === 'ok' ? 'ONLINE' : info.label.split(' ·')[0].toUpperCase()}`
    const metaW = ctx.measureText(meta).width
    const dotX = W / 2 - metaW / 2 - 18
    ctx.beginPath()
    ctx.arc(dotX, 70, 8, 0, Math.PI * 2)
    ctx.fillStyle = STATUS_COLORS[info.state]
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(59,42,16,0.6)'
    ctx.stroke()
    engrave(ctx, meta, W / 2 + 6, 78)

    let size = 74
    ctx.letterSpacing = '4px'
    do {
      ctx.font = `800 ${size}px Archivo, sans-serif`
      size -= 2
    } while (ctx.measureText(p.title.toUpperCase()).width > W - 110 && size > 34)
    engrave(ctx, p.title.toUpperCase(), W / 2, 164)
    ctx.letterSpacing = '0px'
    textures[pi].needsUpdate = true
  }

  const drawAll = () => projects.forEach((_, i) => draw(i))
  drawAll()

  // the glint follows your position relative to each plate
  const here = new THREE.Vector3()
  const toCam = new THREE.Vector3()
  const right = new THREE.Vector3()
  function tick() {
    requestAnimationFrame(tick)
    for (const { plate, tex } of plates) {
      plate.getWorldPosition(here)
      toCam.copy(camera.position).sub(here)
      if (toCam.lengthSq() > 400) continue
      right.setFromMatrixColumn(plate.matrixWorld, 0)
      tex.offset.x = THREE.MathUtils.clamp(-toCam.normalize().dot(right) * 0.9, -0.6, 0.6)
    }
  }
  tick()

  return {
    setSites(s) {
      sites = s
      drawAll()
    },
    setTheme() {},
  }
}

// The entrance foyer outside the hall's doorway: a dark stone room with a lit door surround,
// the show's title lettered above the door, every work hung salon-style on the facade with a
// brass number plate under it, a rope line and a marble floor.
// Everything is drawn in the door's local space: x along the wall, y up, z out toward the visitor.
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { canvasTexture, spillTexture, marbleTexture, shadowTexture, shade, matcap } from './materials.js'
import { chandelier, column, urn, runner, coffers } from './foyerDecor.js'
import { drawBrass, engrave } from './nameplates.js'
import { POSTER_ASPECT } from './posters.js'

const HALF_W = 10
const DEPTH = 14
const HEIGHT = 7.5
const WALL_Z = 0.75 // the facade, just outside the hall's outer wall

// the hang: each side of the door is a cluster of columns, stacked works sharing one height
const HANG_NEAR = 3.2 // inner edge of each cluster (clear of the door and its columns)
const HANG_FAR = 8 // outer edge
const HANG_Y = 2.55 // the line every column centres on
const HANG_H = 2.6 // height of the stacked columns, before fitting
const GUTTER = 0.2
const LARGE_H = 1.6 // the single work nearest the door
const COLUMNS = [3, 2, 1] // works per column, far edge → door (mirrored on the right)
const MAT = 0.08 // white mat, as a share of the image width
const GOLD = 0.028 // gilt edge, same
const OUT_RATIO = (1 + 2 * (MAT + GOLD)) / (1 / POSTER_ASPECT + 2 * (MAT + GOLD)) // outer width / height

const PLATE_W = 0.24
const PLATE_H = 0.085
const LIFT = 0.09 // how far a work comes off the wall when pointed at
const GLOW = 0.12 // its light, at rest (pointed at: GLOW + 0.3)

const glowTexture = () =>
  canvasTexture(128, 256, (ctx) => {
    // a wall light's wash: an upright ellipse, brightest at the lamp
    ctx.translate(64, 128)
    ctx.scale(1, 2)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-64, -64, 128, 128)
  })

/**
 * Where each work hangs on one side of the door, as columns of [{ x, y, w }]: x measured
 * outward from the door, w the outer frame width. Far column first, each top to bottom.
 */
function hangColumns() {
  const cols = COLUMNS.map((n) => {
    const h = n === 1 ? LARGE_H : (HANG_H - (n - 1) * GUTTER) / n
    return { n, h, w: h * OUT_RATIO }
  })
  const raw = cols.reduce((a, c) => a + c.w, 0) + GUTTER * (cols.length - 1)
  const k = Math.min(1, (HANG_FAR - HANG_NEAR) / raw)
  let x = HANG_FAR
  return cols.map((c) => {
    const w = c.w * k
    const h = c.h * k
    const gap = GUTTER * k
    const stack = c.n * h + (c.n - 1) * gap
    const col = Array.from({ length: c.n }, (_, i) => ({ x: x - w / 2, y: HANG_Y + stack / 2 - h / 2 - i * (h + gap), w }))
    x -= w + gap
    return col
  })
}

/** The show's title, lettered on the stone above the door like gallery vinyl. */
function drawTitle(ctx, w, h, sub) {
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#efe6d6'
  let size = 300
  do {
    ctx.font = `500 ${size}px Archivo, sans-serif`
    size -= 4
  } while (ctx.measureText('Steven Widinata').width > w * 0.96 && size > 60)
  ctx.fillText('Steven Widinata', w / 2, h * 0.6)
  ctx.fillStyle = 'rgba(239, 230, 214, 0.62)'
  ctx.font = `400 ${Math.round(size * 0.3)}px Newsreader, Georgia, serif`
  ctx.fillText(sub, w / 2, h * 0.92)
}

export function createFoyer({ door, projects, posterTextures, lowPower, reducedMotion, doorW, doorH }) {
  const foyer = new THREE.Group()
  door.add(foyer)
  const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, fog: false, ...extra })
  const add = (mesh, x, y, z, parent = foyer) => {
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  const brass = new THREE.MeshMatcapMaterial({
    matcap: matcap([[0, '#fff0c2'], [0.35, '#d8b26a'], [0.7, '#8c6728'], [1, '#2a1d0b']]), fog: false,
  })
  const velvet = new THREE.MeshMatcapMaterial({
    matcap: matcap([[0, '#d04a5a'], [0.5, '#86182a'], [1, '#2a060c']], 0.25), fog: false,
  })
  const additive = (map, color, opacity) =>
    basic(color, { map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })

  // ---------- room ----------
  const facadeShape = new THREE.Shape()
  facadeShape.moveTo(-HALF_W, -0.2)
  facadeShape.lineTo(HALF_W, -0.2)
  facadeShape.lineTo(HALF_W, HEIGHT)
  facadeShape.lineTo(-HALF_W, HEIGHT)
  facadeShape.lineTo(-HALF_W, -0.2)
  const hole = new THREE.Path()
  hole.moveTo(-doorW / 2, 0)
  hole.lineTo(-doorW / 2, doorH)
  hole.lineTo(doorW / 2, doorH)
  hole.lineTo(doorW / 2, 0)
  hole.lineTo(-doorW / 2, 0)
  facadeShape.holes.push(hole)
  const facadeGeo = shade(new THREE.ShapeGeometry(facadeShape, 4), (x, y) => {
    // warmer near the door, falling off toward the corners
    const d = Math.hypot(x / 2.2, (y - doorH * 0.5) / 2.6)
    return 0.5 + 0.5 * Math.exp(-d * d * 0.25) - Math.max(0, y - 6.2) * 0.08
  })
  add(new THREE.Mesh(facadeGeo, basic(0x221e1c, { vertexColors: true })), 0, 0, WALL_Z)

  const floorZ = WALL_Z + DEPTH / 2
  let reflector = null
  if (!lowPower) {
    reflector = new Reflector(new THREE.PlaneGeometry(HALF_W * 2, DEPTH), {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x777777,
    })
    reflector.rotation.x = -Math.PI / 2
    add(reflector, 0, -0.003, floorZ)
  }
  const marble = marbleTexture()
  marble.repeat.set(3, 2.2)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_W * 2, DEPTH),
    basic(0x24201d, { map: marble, transparent: !!reflector, opacity: reflector ? 0.82 : 1 }),
  )
  floor.rotation.x = -Math.PI / 2
  add(floor, 0, 0, floorZ)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, DEPTH), basic(0x0c0b0b))
  ceiling.rotation.x = Math.PI / 2
  add(ceiling, 0, HEIGHT, floorZ)
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, HEIGHT + 0.4), basic(0x121010))
    w.rotation.y = -s * Math.PI / 2
    add(w, s * HALF_W, HEIGHT / 2, floorZ)
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HEIGHT + 0.4), basic(0x0e0d0d))
  back.rotation.y = Math.PI
  add(back, 0, HEIGHT / 2, WALL_Z + DEPTH)

  // ---------- door surround: stone architrave, brass edge, glowing reveal ----------
  const stone = basic(0x3a3530)
  const post = new THREE.BoxGeometry(0.34, doorH + 0.34, 0.14)
  for (const s of [-1, 1]) add(new THREE.Mesh(post, stone), s * (doorW / 2 + 0.17), (doorH + 0.34) / 2, WALL_Z + 0.07)
  add(new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.68, 0.34, 0.14), stone), 0, doorH + 0.17, WALL_Z + 0.07)
  add(new THREE.Mesh(new THREE.BoxGeometry(doorW + 1.1, 0.1, 0.26), stone), 0, doorH + 0.39, WALL_Z + 0.13)
  const thin = (w, h, x, y, z, mat) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat), x, y, z)
  const reveal = basic(0xf3e7d1)
  thin(0.03, doorH, -doorW / 2, doorH / 2, WALL_Z + 0.15, reveal)
  thin(0.03, doorH, doorW / 2, doorH / 2, WALL_Z + 0.15, reveal)
  thin(doorW + 0.03, 0.03, 0, doorH, WALL_Z + 0.15, reveal)
  const edgeW = doorW + 0.68
  thin(0.025, doorH + 0.34, -edgeW / 2, (doorH + 0.34) / 2, WALL_Z + 0.15, brass)
  thin(0.025, doorH + 0.34, edgeW / 2, (doorH + 0.34) / 2, WALL_Z + 0.15, brass)
  thin(edgeW, 0.025, 0, doorH + 0.34, WALL_Z + 0.15, brass)

  // a brass line at hand height, broken by the door surround
  const line = basic(0x7d6236)
  const doorEdge = doorW / 2 + 0.62
  for (const s of [-1, 1]) {
    const len = HALF_W - doorEdge
    thin(len, 0.025, s * (doorEdge + len / 2), 0.62, WALL_Z + 0.012, line)
  }

  // ---------- a classical doorway: fluted columns carrying an entablature, an urn at each end ----------
  const wash = glowTexture()
  const marbleStone = new THREE.MeshMatcapMaterial({
    matcap: matcap([[0, '#fffdf8'], [0.35, '#ece5da'], [0.7, '#b3aa9d'], [1, '#4a443c']], 0.55), fog: false,
  })
  const COL_X = doorW / 2 + 0.8
  const COL_H = 4.45
  const ENT_Z = WALL_Z + 0.3
  for (const s of [-1, 1]) {
    add(column({ height: COL_H }), s * COL_X, 0, ENT_Z)
    // the light falling on the stone behind each column
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2), additive(wash, 0xffcf8a, 0.35)), s * COL_X, 2.4, WALL_Z + 0.016)
  }
  const entW = COL_X * 2 + 0.7
  add(new THREE.Mesh(new THREE.BoxGeometry(entW, 0.34, 0.56), marbleStone), 0, COL_H + 0.17, ENT_Z)
  thin(entW, 0.02, 0, COL_H + 0.08, ENT_Z + 0.29, brass)
  add(new THREE.Mesh(new THREE.BoxGeometry(entW + 0.3, 0.08, 0.68), marbleStone), 0, COL_H + 0.38, ENT_Z)
  for (const s of [-1, 1]) add(urn(), s * COL_X, COL_H + 0.42, ENT_Z).scale.setScalar(0.8)

  // ---------- cornice along the top of the wall, coffered ceiling ----------
  add(new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2, 0.3, 0.34), basic(0x2e2925)), 0, HEIGHT - 0.15, WALL_Z + 0.17)
  thin(HALF_W * 2, 0.025, 0, HEIGHT - 0.34, WALL_Z + 0.02, line)
  add(coffers({ width: HALF_W * 2, depth: DEPTH, y: HEIGHT, brass }), 0, 0, floorZ)

  // ---------- an oxblood runner from the door to where the visitor stands ----------
  add(runner(2, DEPTH - 0.4), 0, 0.006, WALL_Z + 0.2 + (DEPTH - 0.4) / 2)

  // ---------- the title, lettered above the door ----------
  const year = Math.max(...projects.map((p) => p.year || 0)) || new Date().getFullYear()
  const sub = `Collected works · ${projects.length} projects · ${year}`
  const TITLE_W = 5.6
  const titleCanvas = document.createElement('canvas')
  titleCanvas.width = 2048
  titleCanvas.height = 512
  const titleTex = new THREE.CanvasTexture(titleCanvas)
  titleTex.colorSpace = THREE.SRGBColorSpace
  titleTex.anisotropy = 4
  const paintTitle = () => {
    drawTitle(titleCanvas.getContext('2d'), titleCanvas.width, titleCanvas.height, sub)
    titleTex.needsUpdate = true
  }
  paintTitle()
  Promise.all([document.fonts.load('500 80px Archivo'), document.fonts.load('400 40px Newsreader')]).then(paintTitle, () => {})
  const titleMat = basic(0xffffff, { map: titleTex, transparent: true, depthWrite: false })
  add(new THREE.Mesh(new THREE.PlaneGeometry(TITLE_W, TITLE_W / 4), titleMat), 0, 6.12, WALL_Z + 0.01)

  // ---------- the hang: every work, 01–06 left of the door and 07–12 right, read left to right ----------
  const cols = hangColumns()
  const layout = [
    ...cols.flat().map((s) => ({ ...s, x: -s.x })), // left: far column first
    ...cols.slice().reverse().flat(), // right: door column first
  ]

  const shadowMat = basic(0x000000, { map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 })
  const hitTargets = []
  const works = []
  projects.forEach((p, pi) => {
    const spot = layout[pi]
    if (!spot) return // more works than places on the wall: the hall still has them all
    const w = spot.w
    const imgW = w / (1 + 2 * (MAT + GOLD))
    const imgH = imgW / POSTER_ASPECT
    const matW = imgW * (1 + 2 * MAT)
    const matH = imgH + imgW * 2 * MAT
    const h = imgH + imgW * 2 * (MAT + GOLD)

    // the wall behind it: a soft shadow and the pool of its light
    add(new THREE.Mesh(new THREE.PlaneGeometry(w * 1.35, h * 1.5), shadowMat), spot.x + 0.06, spot.y - 0.08, WALL_Z + 0.004)
    const glow = add(new THREE.Mesh(new THREE.PlaneGeometry(w * 1.7, h * 2.4), additive(wash, 0xffdcaa, GLOW)), spot.x, spot.y + h * 0.2, WALL_Z + 0.006)

    // gilt edge, white mat, the work
    const art = add(new THREE.Group(), spot.x, spot.y, WALL_Z + 0.03)
    const gilt = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), brass), 0, 0, 0, art)
    const topLit = (x, y) => 0.82 + 0.18 * Math.min(1, Math.max(0, y / matH + 0.5))
    add(new THREE.Mesh(shade(new THREE.PlaneGeometry(matW, matH, 1, 6), topLit), basic(0xf1ebe0, { vertexColors: true })), 0, 0, 0.026, art)
    add(new THREE.Mesh(new THREE.PlaneGeometry(imgW, imgH), basic(0xffffff, { map: posterTextures[pi], toneMapped: false })), 0, 0, 0.027, art)
    gilt.userData.pi = pi
    hitTargets.push(gilt)

    // its brass number plate
    const c = document.createElement('canvas')
    c.width = 256
    c.height = Math.round((256 * PLATE_H) / PLATE_W)
    const ctx = c.getContext('2d')
    drawBrass(ctx, c.width, c.height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 48px Archivo, sans-serif'
    engrave(ctx, String(pi + 1).padStart(2, '0'), c.width / 2, c.height / 2 + 2)
    const plateTex = new THREE.CanvasTexture(c)
    plateTex.colorSpace = THREE.SRGBColorSpace
    plateTex.anisotropy = 4
    const plateY = spot.y - h / 2 - 0.035 - PLATE_H / 2
    add(new THREE.Mesh(new THREE.BoxGeometry(PLATE_W, PLATE_H, 0.012), basic(0xffffff, { map: plateTex })), spot.x, plateY, WALL_Z + 0.01)

    works.push({ pi, art, glow, hover: 0 })
  })

  // a crystal chandelier over each half of the hang, and the light it spreads on the wall
  for (const s of [-1, 1]) {
    const x = (s * (HANG_NEAR + HANG_FAR)) / 2
    add(new THREE.Mesh(new THREE.PlaneGeometry(HANG_FAR - HANG_NEAR + 2.4, 5.6), additive(wash, 0xffd9a0, 0.26)), x, 3.4, WALL_Z + 0.002)
    add(chandelier({ brass, ceilingY: HEIGHT - 0.22, drop: 1.05, scale: 1.15 }), s * 5, 0, WALL_Z + 1.6)
  }

  // ---------- rope line leading to the door ----------
  const postGeo = new THREE.CylinderGeometry(0.028, 0.034, 0.9, 16)
  const footGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.035, 32)
  const knobGeo = new THREE.SphereGeometry(0.052, 20, 14)
  const ropeZ = [WALL_Z + 1.2, WALL_Z + 2.9, WALL_Z + 4.6]
  for (const s of [-1, 1]) {
    const x = s * 1.25
    ropeZ.forEach((z, k) => {
      add(new THREE.Mesh(postGeo, brass), x, 0.47, z)
      add(new THREE.Mesh(footGeo, brass), x, 0.018, z)
      add(new THREE.Mesh(knobGeo, brass), x, 0.95, z)
      if (k === 0) return
      const a = new THREE.Vector3(x, 0.88, ropeZ[k - 1])
      const b = new THREE.Vector3(x, 0.88, z)
      const mid = new THREE.Vector3(x, 0.52, (a.z + b.z) / 2)
      foyer.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 32, 0.028, 10), velvet))
    })
  }

  // light spilling out of the doorway across the floor
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), additive(spillTexture(), 0xffe9c8, 0.4))
  spill.rotation.x = -Math.PI / 2
  add(spill, 0, 0.012, WALL_Z + 3.2)

  let hovered = -1
  return {
    /** The framed works, for picking: each carries userData.pi. */
    hitTargets,
    /** Point at a work (-1 for none): it comes a little off the wall and its light comes up. */
    setHover(pi) {
      hovered = pi
    },
    /** Ease hover states while the visitor is in (or can see) the foyer. */
    update(dt, active) {
      if (reflector) reflector.visible = active
      floor.material.opacity = active && reflector ? 0.82 : 1
      if (!active) return
      const k = 1 - Math.exp(-dt * 12)
      for (const wk of works) {
        wk.hover += ((wk.pi === hovered ? 1 : 0) - wk.hover) * k
        wk.art.position.z = WALL_Z + 0.03 + (reducedMotion ? 0 : wk.hover * LIFT)
        wk.glow.material.opacity = GLOW + wk.hover * 0.3
      }
    },
  }
}

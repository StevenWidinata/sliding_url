// The entrance foyer outside the hall's doorway: a dark stone room with a lit door surround,
// brass wall lights, exhibition banners, two sculptures on plinths, a rope line and a marble floor.
// Everything is drawn in the door's local space: x along the wall, y up, z out toward the visitor.
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { canvasTexture, poolTexture, beamTexture, spillTexture, marbleTexture, shade } from './materials.js'
import { posterSrc } from './posters.js'

const HALF_W = 10
const DEPTH = 14
const HEIGHT = 7.5
const WALL_Z = 0.75 // the facade, just outside the hall's outer wall
const BANNER_X = 5
const BANNER_W = 1.9
const BANNER_H = 3.6
const BANNER_TOP = 4.95
const PLINTH_X = 2.8
const PLINTH_Z = WALL_Z + 1.6
const BANNER_SLUGS = ['glitch_type', 'mewing_academy']

/** A matcap: a lit sphere painted once, so metal and velvet look shaded without any lights. */
function matcap(stops, shine = 0.9) {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(100, 88, 4, 128, 128, 128)
    stops.forEach(([o, c]) => g.addColorStop(o, c))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(128, 128, 128, 0, Math.PI * 2)
    ctx.fill()
    const h = ctx.createRadialGradient(90, 78, 0, 90, 78, 46)
    h.addColorStop(0, `rgba(255,255,255,${shine})`)
    h.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = h
    ctx.fillRect(0, 0, 256, 256)
  })
}

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

const discTexture = () =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.8)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.22)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  })

/** An exhibition banner: oxblood cloth, gold lettering, the work's screenshot in a gold rule. */
function drawBanner(ctx, w, h, project, number, img) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#4a1a1f')
  g.addColorStop(1, '#2a0d11')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // woven texture
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.05})`
    ctx.fillRect(0, y, w, 1)
  }
  const gold = '#d9b56f'
  ctx.strokeStyle = gold
  ctx.lineWidth = 3
  ctx.strokeRect(26, 26, w - 52, h - 52)
  ctx.textAlign = 'center'
  ctx.fillStyle = gold
  ctx.font = '700 22px Archivo, sans-serif'
  ctx.letterSpacing = '9px'
  ctx.fillText('NOW SHOWING', w / 2 + 4, 104)
  ctx.fillRect(w / 2 - 30, 128, 60, 2)

  const iw = w - 112
  const ih = iw / 1.6
  const iy = 176
  ctx.fillStyle = '#120507'
  ctx.fillRect(56, iy, iw, ih)
  if (img) ctx.drawImage(img, 56, iy, iw, ih)
  ctx.strokeStyle = gold
  ctx.lineWidth = 4
  ctx.strokeRect(50, iy - 6, iw + 12, ih + 12)

  ctx.fillStyle = '#f5ecdc'
  let size = 64
  ctx.letterSpacing = '2px'
  do {
    ctx.font = `800 ${size}px Archivo, sans-serif`
    size -= 2
  } while (ctx.measureText(project.title.toUpperCase()).width > w - 110 && size > 30)
  ctx.fillText(project.title.toUpperCase(), w / 2, iy + ih + 120)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = gold
  ctx.font = 'italic 400 34px Newsreader, Georgia, serif'
  ctx.fillText(project.kicker, w / 2, iy + ih + 172)
  ctx.font = 'italic 400 30px Newsreader, Georgia, serif'
  ctx.fillText(`No. ${String(number).padStart(2, '0')}`, w / 2, h - 120)
  ctx.fillRect(w / 2 - 50, h - 92, 100, 2)
}

export function createFoyer({ door, projects, lowPower, doorW, doorH }) {
  const foyer = new THREE.Group()
  door.add(foyer)
  const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, fog: false, ...extra })
  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z)
    foyer.add(mesh)
    return mesh
  }
  const brass = new THREE.MeshMatcapMaterial({
    matcap: matcap([[0, '#fff0c2'], [0.35, '#d8b26a'], [0.7, '#8c6728'], [1, '#2a1d0b']]), fog: false,
  })
  const chrome = new THREE.MeshMatcapMaterial({
    matcap: matcap([[0, '#ffffff'], [0.3, '#cdd2da'], [0.55, '#565c66'], [0.75, '#a3aab4'], [1, '#121418']]), fog: false,
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
    return 0.5 + 0.5 * Math.exp(-d * d * 0.25) - Math.max(0, y - 5.5) * 0.06
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
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, HEIGHT + 0.4), basic(0x121010))
    w.rotation.y = -side * Math.PI / 2
    add(w, side * HALF_W, HEIGHT / 2, floorZ)
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HEIGHT + 0.4), basic(0x0e0d0d))
  back.rotation.y = Math.PI
  add(back, 0, HEIGHT / 2, WALL_Z + DEPTH)

  // ---------- door surround: stone architrave, brass edge, glowing reveal ----------
  const stone = basic(0x3a3530)
  const post = new THREE.BoxGeometry(0.34, doorH + 0.34, 0.14)
  for (const side of [-1, 1]) add(new THREE.Mesh(post, stone), side * (doorW / 2 + 0.17), (doorH + 0.34) / 2, WALL_Z + 0.07)
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

  // ---------- panelled wall with brass lines ----------
  const line = basic(0x7d6236)
  const panelFill = basic(0x1a1716)
  const doorEdge = doorW / 2 + 0.62
  for (const side of [-1, 1]) {
    // a line at hand height, broken by the door surround
    const len = HALF_W - doorEdge
    thin(len, 0.025, side * (doorEdge + len / 2), 0.62, WALL_Z + 0.012, line)
    for (const [cx, w] of [[BANNER_X, 3], [8.45, 2.2]]) {
      const y0 = 0.9
      const y1 = 5.35
      const ph = y1 - y0
      const x = side * cx
      add(new THREE.Mesh(new THREE.PlaneGeometry(w, ph), panelFill), x, y0 + ph / 2, WALL_Z + 0.005)
      thin(w, 0.02, x, y0, WALL_Z + 0.012, line)
      thin(w, 0.02, x, y1, WALL_Z + 0.012, line)
      thin(0.02, ph, x - w / 2, y0 + ph / 2, WALL_Z + 0.012, line)
      thin(0.02, ph, x + w / 2, y0 + ph / 2, WALL_Z + 0.012, line)
    }
  }
  thin(HALF_W * 2, 0.03, 0, 5.75, WALL_Z + 0.012, line)

  // ---------- brass wall lights beside the door ----------
  const wash = glowTexture()
  const lampShade = basic(0xffe2b0)
  for (const side of [-1, 1]) {
    const x = side * (doorW / 2 + 0.78)
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.04), brass), x, 2.75, WALL_Z + 0.02)
    const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8), brass), x, 2.75, WALL_Z + 0.09)
    arm.rotation.x = Math.PI / 2
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 24), lampShade), x, 2.75, WALL_Z + 0.18)
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4), additive(wash, 0xffcf8a, 0.6)), x, 2.75, WALL_Z + 0.016)
  }

  // ---------- exhibition banners ----------
  const pool = poolTexture()
  const banners = []
  BANNER_SLUGS.forEach((slug, i) => {
    let pi = projects.findIndex((p) => p.slug === slug)
    if (pi < 0) pi = i
    const p = projects[pi]
    const side = i === 0 ? -1 : 1
    const x = side * BANNER_X
    const z = WALL_Z + 0.24
    const c = document.createElement('canvas')
    c.width = 512
    c.height = Math.round((512 * BANNER_H) / BANNER_W)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const paint = (img) => {
      drawBanner(c.getContext('2d'), c.width, c.height, p, pi + 1, img)
      tex.needsUpdate = true
    }
    paint(null)
    const img = new Image()
    img.onload = () => paint(img)
    img.src = posterSrc(p)

    const geo = new THREE.PlaneGeometry(BANNER_W, BANNER_H, 1, 24)
    const cloth = add(new THREE.Mesh(geo, basic(0xffffff, { map: tex, side: THREE.DoubleSide })), x, BANNER_TOP - BANNER_H / 2, z)
    banners.push({ geo, base: geo.attributes.position.array.slice(), phase: i * 1.7, cloth })
    const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, BANNER_W + 0.36, 12), brass), x, BANNER_TOP + 0.03, z)
    rod.rotation.z = Math.PI / 2
    for (const e of [-1, 1]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), brass), x + e * (BANNER_W / 2 + 0.2), BANNER_TOP + 0.03, z)
      const bracket = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), brass), x + e * (BANNER_W / 2 + 0.05), BANNER_TOP + 0.03, WALL_Z + 0.12)
      bracket.rotation.x = Math.PI / 2
    }
    // lit from above
    add(new THREE.Mesh(new THREE.PlaneGeometry(3, 5), additive(pool, 0xffd9a0, 0.5)), x, 3.6, WALL_Z + 0.014)
    add(new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), basic(0xfff1d6)), x, HEIGHT - 0.01, WALL_Z + 1).rotation.x = Math.PI / 2
  })

  // ---------- sculptures on plinths ----------
  const plinthGeo = shade(new THREE.BoxGeometry(0.72, 1.12, 0.72, 1, 6, 1), (x, y) => 0.72 + 0.28 * (y / 1.12 + 0.5))
  const plinthMat = basic(0xe8e2d7, { vertexColors: true })
  const plinthCap = basic(0xf1ece3)
  const beam = beamTexture()
  const disc = discTexture()
  const sculptures = []
  for (const side of [-1, 1]) {
    const x = side * PLINTH_X
    add(new THREE.Mesh(plinthGeo, plinthMat), x, 0.56, PLINTH_Z)
    add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), plinthCap), x, 1.145, PLINTH_Z)
    const art = new THREE.Group()
    add(art, x, 1.72, PLINTH_Z)
    if (side < 0) {
      art.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.27, 0.08, 220, 24, 2, 3), chrome))
    } else {
      // a brass gyroscope around a chrome core
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36 - k * 0.075, 0.016, 12, 120), brass)
        ring.userData.k = k
        art.add(ring)
      }
      art.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), chrome))
    }
    sculptures.push({ art, side })
    // spotlight from the ceiling
    const cone = add(
      new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.95, HEIGHT - 1.25, 32, 1, true), additive(beam, 0xffe6c0, 0.11)),
      x, 1.25 + (HEIGHT - 1.25) / 2, PLINTH_Z,
    )
    cone.material.side = THREE.DoubleSide
    const glowOnFloor = add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), additive(disc, 0xffdcaa, 0.35)), x, 0.01, PLINTH_Z)
    glowOnFloor.rotation.x = -Math.PI / 2
    add(new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), basic(0xfff1d6)), x, HEIGHT - 0.01, PLINTH_Z).rotation.x = Math.PI / 2
  }

  // ---------- rope line leading to the door ----------
  const postGeo = new THREE.CylinderGeometry(0.028, 0.034, 0.9, 16)
  const footGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.035, 32)
  const knobGeo = new THREE.SphereGeometry(0.052, 20, 14)
  const ropeZ = [WALL_Z + 1.2, WALL_Z + 2.9, WALL_Z + 4.6]
  for (const side of [-1, 1]) {
    const x = side * 1.25
    ropeZ.forEach((z, k) => {
      add(new THREE.Mesh(postGeo, brass), x, 0.47, z)
      add(new THREE.Mesh(footGeo, brass), x, 0.018, z)
      add(new THREE.Mesh(knobGeo, brass), x, 0.95, z)
      if (k === 0) return
      const a = new THREE.Vector3(x, 0.88, ropeZ[k - 1])
      const b = new THREE.Vector3(x, 0.88, z)
      const mid = new THREE.Vector3(x, 0.52, (a.z + b.z) / 2)
      const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 32, 0.028, 10), velvet)
      foyer.add(rope)
    })
  }

  // light spilling out of the doorway across the floor
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), additive(spillTexture(), 0xffe9c8, 0.4))
  spill.rotation.x = -Math.PI / 2
  add(spill, 0, 0.012, WALL_Z + 3.2)

  return {
    /** Animate while the visitor is in (or can see) the foyer. */
    update(time, active) {
      if (reflector) reflector.visible = active
      floor.material.opacity = active && reflector ? 0.82 : 1
      if (!active) return
      for (const { art, side } of sculptures) {
        if (side < 0) {
          art.rotation.set(time * 0.18, time * 0.32, 0)
        } else {
          art.children.forEach((m) => {
            const k = m.userData.k
            if (k === undefined) return
            m.rotation.set(time * (0.3 + k * 0.17), time * (0.22 - k * 0.09), k * 0.6)
          })
        }
        art.position.y = 1.72 + Math.sin(time * 0.9 + side) * 0.03
      }
      // banners sway gently; the top is held by the rod
      for (const b of banners) {
        const pos = b.geo.attributes.position
        for (let i = 0; i < pos.count; i++) {
          const y = b.base[i * 3 + 1]
          const hang = (BANNER_H / 2 - y) / BANNER_H
          pos.setZ(i, Math.sin(y * 1.7 + time * 1.1 + b.phase) * 0.035 * hang)
        }
        pos.needsUpdate = true
      }
    },
  }
}

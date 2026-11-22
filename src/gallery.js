// The museum: a curved hall (a ring, so the walk never ends) with works hanging zig-zag on the
// inner and outer walls, and a dark foyer outside a doorway in the outer wall.
// Everything uses unlit materials + baked shading so it stays fast on phones.
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { createPosterTextures, POSTER_ASPECT } from './posters.js'

const TAU = Math.PI * 2
const FRAME_W = 2.7
const FRAME_H = FRAME_W / POSTER_ASPECT
const BORDER = 0.08
const MIN_SLOTS = 20 // the ring repeats the works until it has at least this many frames
const SPACING = 9 // walking distance between one work and the next
const HALL_W = 7.2
const HALL_H = 6.2
const EYE = 1.62
const FRAME_Y = 2.2
const FRAME_YAW = THREE.MathUtils.degToRad(18) // works turn a little toward the approaching visitor
const STANDOFF = 0.1 + (FRAME_W / 2) * Math.sin(FRAME_YAW)
const LOOK_AHEAD = 9
const DOOR_W = 3
const DOOR_H = 3.9
const FOYER_DEPTH = 8.5 // how far outside the door the visitor waits

export const PALETTES = {
  light: {
    bg: '#d8d0c4', wall: '#e8e1d6', floor: '#cbc1b2', ceiling: '#ddd5c9', frame: '#161412', sky: '#fffcf5',
    line: '#7fb2dc', guide: '#b8915a', bench: '#bdb2a2', base: '#b9ae9e',
    shadow: 0.24, pool: 0.24, cone: 0.035, shaft: 0.09, dust: 0.14, floorOverlay: 0.86, fogNear: 16, fogFar: 72,
  },
  dark: {
    bg: '#0e0c0a', wall: '#3a342d', floor: '#171410', ceiling: '#1a1714', frame: '#060505', sky: '#e8dcc8',
    line: '#a9d6ff', guide: '#d9b680', bench: '#2b2621', base: '#1f1b17',
    shadow: 0.5, pool: 0.85, cone: 0.13, shaft: 0.32, dust: 0.7, floorOverlay: 0.72, fogNear: 7, fogFar: 38,
  },
}

const mod = (n, m) => ((n % m) + m) % m
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// points on the ring: angle th grows in the walking direction
const onRing = (r, th, y, out) => out.set(r * Math.sin(th), y, r * Math.cos(th))
const radial = (th, out) => out.set(Math.sin(th), 0, Math.cos(th))
const tangent = (th, out) => out.set(Math.cos(th), 0, -Math.sin(th))

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const shadowTexture = () =>
  canvasTexture(256, 256, (ctx) => {
    // draw the rect off-canvas and keep only its blurred shadow (works everywhere, unlike ctx.filter)
    ctx.shadowColor = 'rgba(0,0,0,1)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetX = 1000
    ctx.fillRect(-1000 + 56, 64, 144, 136)
  })

const poolTexture = () =>
  canvasTexture(256, 512, (ctx) => {
    // a soft cone of light from a ceiling spot: elliptical, fading to nothing at every edge
    ctx.translate(128, 40)
    ctx.scale(1, 2.6)
    const g = ctx.createRadialGradient(0, 0, 4, 0, 30, 118)
    g.addColorStop(0, 'rgba(255,238,210,0.9)')
    g.addColorStop(0.35, 'rgba(255,226,186,0.38)')
    g.addColorStop(0.75, 'rgba(255,220,175,0.08)')
    g.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.fillStyle = g
    ctx.fillRect(-128, -40, 256, 512)
  })

const beamTexture = () =>
  canvasTexture(128, 512, (ctx, w, h) => {
    const v = ctx.createLinearGradient(0, 0, 0, h)
    v.addColorStop(0, 'rgba(255,255,255,.95)')
    v.addColorStop(0.6, 'rgba(255,255,255,.25)')
    v.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-in'
    const hz = ctx.createLinearGradient(0, 0, w, 0)
    hz.addColorStop(0, 'rgba(0,0,0,0)')
    hz.addColorStop(0.5, 'rgba(0,0,0,1)')
    hz.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = hz
    ctx.fillRect(0, 0, w, h)
  })

const dotTexture = () =>
  canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
  })

const spillTexture = () =>
  canvasTexture(256, 256, (ctx, w, h) => {
    // light falling out of the doorway: narrow at the door, spreading toward the visitor
    ctx.beginPath()
    ctx.moveTo(w * 0.33, 0)
    ctx.lineTo(w * 0.67, 0)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(255,255,255,.85)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fill()
  })

/** Grayscale vertex shading so plain MeshBasicMaterials still read as a lit room. */
function shade(geo, fn) {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const v = fn(pos.getX(i), pos.getY(i), pos.getZ(i))
    colors.set([v, v, v], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export function createGallery({ container, projects, manager, reducedMotion = false, lowPower = false }) {
  const N = projects.length
  let SLOTS = N * Math.max(1, Math.ceil(MIN_SLOTS / N))
  if (SLOTS % 2) SLOTS += N // even, so inner/outer alternate cleanly all the way round
  const STEP = TAU / SLOTS
  const RC = (SLOTS * SPACING) / TAU // centre line of the hall
  const RI = RC - HALL_W / 2
  const RO = RC + HALL_W / 2
  const PATH_R = RC + 0.5 // the visitor walks a little off-centre, past the benches
  const THETA_DOOR = -2 * STEP // opposite an inner work, between two outer works

  const listeners = { center: [], open: [], interact: [] }
  const emit = (type, ...args) => listeners[type].forEach((fn) => fn(...args))

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xffffff, 12, 50)
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200)

  const shadowMap = shadowTexture()
  const poolMap = poolTexture()
  const beamMap = beamTexture()

  // ---------- hall ----------
  const wallShade = (x, y) => {
    const t = y / HALL_H
    return t < 0.04 ? 0.8 + (t / 0.04) * 0.12 : t < 0.45 ? 0.92 + ((t - 0.04) / 0.41) * 0.08 : 1 - (t - 0.45) * 0.1
  }
  const wallMat = new THREE.MeshBasicMaterial({ vertexColors: true })
  const innerWallGeo = new THREE.CylinderGeometry(RI, RI, HALL_H, 360, 6, true).translate(0, HALL_H / 2, 0)
  scene.add(new THREE.Mesh(shade(innerWallGeo, wallShade), wallMat))

  const gap = (DOOR_W + 0.6) / RO // the outer wall leaves room for the doorway
  const outerWallGeo = new THREE.CylinderGeometry(RO, RO, HALL_H, 360, 6, true, THETA_DOOR + gap / 2, TAU - gap)
  outerWallGeo.translate(0, HALL_H / 2, 0)
  const outerWallMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
  scene.add(new THREE.Mesh(shade(outerWallGeo, wallShade), outerWallMat))

  const baseMat = new THREE.MeshBasicMaterial()
  scene.add(new THREE.Mesh(new THREE.CylinderGeometry(RI + 0.015, RI + 0.015, 0.16, 360, 1, true).translate(0, 0.08, 0), baseMat))
  const outerBaseMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide })
  const outerBaseGeo = new THREE.CylinderGeometry(RO - 0.015, RO - 0.015, 0.16, 360, 1, true, THETA_DOOR + gap / 2, TAU - gap)
  scene.add(new THREE.Mesh(outerBaseGeo.translate(0, 0.08, 0), outerBaseMat))

  const ceilGeo = shade(new THREE.RingGeometry(RI, RO, 360, 4), (x, y) => {
    const r = Math.hypot(x, y)
    return 1 - Math.abs(r - RC) / HALL_W * 0.18
  })
  const ceilMat = new THREE.MeshBasicMaterial({ vertexColors: true })
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = HALL_H
  scene.add(ceiling)

  const skyMat = new THREE.MeshBasicMaterial()
  const sky = new THREE.Mesh(new THREE.RingGeometry(RC - 0.45, RC + 0.45, 512, 1), skyMat)
  sky.rotation.x = Math.PI / 2
  sky.position.y = HALL_H - 0.01
  scene.add(sky)
  const lineMat = new THREE.MeshBasicMaterial()
  for (const r of [RC - 1.35, RC + 1.35]) {
    const l = new THREE.Mesh(new THREE.TorusGeometry(r, 0.013, 4, 720), lineMat)
    l.rotation.x = Math.PI / 2
    l.position.y = HALL_H - 0.03
    scene.add(l)
  }

  let reflector = null
  if (!lowPower) {
    reflector = new Reflector(new THREE.RingGeometry(RI, RO, 256, 1), {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x8a8a8a,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = -0.002
    scene.add(reflector)
  }
  const floorGeo = shade(new THREE.RingGeometry(RI, RO, 360, 6), (x, y) => {
    const d = Math.abs(Math.hypot(x, y) - RC) / (HALL_W / 2)
    return 1 - d * d * 0.14
  })
  const floorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: !!reflector, depthWrite: false })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // a thin guide light along the walking line
  const guideMat = new THREE.MeshBasicMaterial({ fog: true })
  const guide = new THREE.Mesh(new THREE.TorusGeometry(PATH_R, 0.016, 4, 720), guideMat)
  guide.rotation.x = Math.PI / 2
  guide.position.y = 0.01
  scene.add(guide)

  // ---------- frames ----------
  const posterTextures = createPosterTextures(projects, manager, renderer)
  const posterMats = posterTextures.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false }))
  const frameMat = new THREE.MeshBasicMaterial()
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, color: 0x000000 })
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffe9c8, map: beamMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
  const benchMat = new THREE.MeshBasicMaterial()

  const borderGeo = new THREE.BoxGeometry(FRAME_W + BORDER * 2, FRAME_H + BORDER * 2, 0.08)
  const posterGeo = new THREE.PlaneGeometry(FRAME_W, FRAME_H)
  const shadowGeo = new THREE.PlaneGeometry(FRAME_W * 1.6, FRAME_H * 1.9)
  const poolGeo = new THREE.PlaneGeometry(FRAME_W * 1.5, FRAME_H * 3.1)
  const coneH = HALL_H - 0.9
  const coneGeo = new THREE.CylinderGeometry(0.1, 1.35, coneH, 32, 1, true)
  const seatGeo = new THREE.BoxGeometry(2.1, 0.09, 0.6)
  const plinthGeo = new THREE.BoxGeometry(1.7, 0.38, 0.42)

  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const v3 = new THREE.Vector3()
  const slots = []
  const hitTargets = []
  for (let s = 0; s < SLOTS; s++) {
    const pi = s % N
    const th = s * STEP
    const inner = s % 2 === 0
    const n = radial(th, new THREE.Vector3()).multiplyScalar(inner ? 1 : -1) // into the hall
    const t = tangent(th, new THREE.Vector3())
    const face = n.clone().multiplyScalar(Math.cos(FRAME_YAW)).addScaledVector(t, -Math.sin(FRAME_YAW))
    const wallR = inner ? RI : RO

    // on the wall: soft shadow + the glow of the spotlight
    const wall = new THREE.Group()
    onRing(wallR, th, FRAME_Y, wall.position).addScaledVector(n, 0.02)
    wall.lookAt(v1.copy(wall.position).add(n))
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.set(0.25, -0.18, 0)
    const pool = new THREE.Mesh(poolGeo, poolMat)
    pool.position.set(0, FRAME_H * 0.55, 0.005)
    wall.add(shadow, pool)
    scene.add(wall)

    // the work itself, turned a little toward the visitor
    const g = new THREE.Group()
    onRing(wallR, th, FRAME_Y, g.position).addScaledVector(n, STANDOFF)
    g.lookAt(v1.copy(g.position).add(face))
    const art = new THREE.Group() // scaled on hover
    const border = new THREE.Mesh(borderGeo, frameMat)
    const poster = new THREE.Mesh(posterGeo, posterMats[pi])
    poster.position.z = 0.042
    art.add(border, poster)
    g.add(art)
    scene.add(g)

    // spotlight beam from the ceiling
    const cone = new THREE.Mesh(coneGeo, coneMat)
    onRing(wallR, th, 0.9 + coneH / 2, cone.position).addScaledVector(n, 1.1)
    scene.add(cone)

    poster.userData.slot = s
    border.userData.slot = s
    hitTargets.push(poster, border)
    slots.push({ s, pi, inner, group: g, art, poster, face, hover: 0 })

    // a bench every few bays, on the inner side of the walking line
    if (s % 4 === 1) {
      const bench = new THREE.Group()
      const bth = (s + 0.5) * STEP
      onRing(RC - 1.55, bth, 0, bench.position)
      bench.lookAt(v1.copy(bench.position).add(radial(bth, v2)))
      const seat = new THREE.Mesh(seatGeo, benchMat)
      seat.position.y = 0.43
      const plinth = new THREE.Mesh(plinthGeo, benchMat)
      plinth.position.y = 0.19
      bench.add(seat, plinth)
      scene.add(bench)
    }
  }

  // light falling from the skylight, between the works (faded out as you walk through them)
  const shafts = []
  const shaftGeo = new THREE.PlaneGeometry(2.4, HALL_H * 1.15)
  for (let s = 0; s < SLOTS; s++) {
    const th = (s + 0.5) * STEP
    const m = new THREE.MeshBasicMaterial({
      color: 0xffe6c0, map: beamMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    })
    const p = new THREE.Mesh(shaftGeo, m)
    onRing(RC, th, HALL_H * 0.5, p.position)
    p.lookAt(v1.copy(p.position).add(tangent(th, v2)))
    p.rotateZ(s % 2 ? 0.16 : -0.12)
    scene.add(p)
    shafts.push(p)
  }

  // dust drifting in the light, kept in a box around the visitor
  const DUST = lowPower ? 220 : 480
  const DUST_BOX = 16
  const dustSeed = new Float32Array(DUST * 4)
  for (let i = 0; i < DUST * 4; i++) dustSeed[i] = Math.random()
  const dustPos = new Float32Array(DUST * 3)
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    size: 0.045, map: dotTexture(), color: 0xffe6c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  scene.add(dust)

  // ---------- doorway + foyer (outside the outer wall) ----------
  const doorAt = onRing(RO, THETA_DOOR, 0, new THREE.Vector3())
  const door = new THREE.Group() // local: x along the wall, y up, z out toward the foyer
  door.position.copy(doorAt)
  door.lookAt(v1.copy(doorAt).add(radial(THETA_DOOR, v2)))
  scene.add(door)
  const jambMat = new THREE.MeshBasicMaterial()
  const jamb = new THREE.BoxGeometry(0.42, DOOR_H, 1.1)
  for (const x of [-1, 1]) {
    const j = new THREE.Mesh(jamb, jambMat)
    j.position.set(x * (DOOR_W / 2 + 0.21), DOOR_H / 2, 0.19)
    door.add(j)
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.9, HALL_H - DOOR_H + 0.1, 1.1), jambMat)
  lintel.position.set(0, DOOR_H + (HALL_H - DOOR_H) / 2, 0.19)
  door.add(lintel)

  const foyerMat = (color) => new THREE.MeshBasicMaterial({ color, fog: false })
  const facadeShape = new THREE.Shape()
  facadeShape.moveTo(-7.5, -0.2)
  facadeShape.lineTo(7.5, -0.2)
  facadeShape.lineTo(7.5, 6)
  facadeShape.lineTo(-7.5, 6)
  facadeShape.lineTo(-7.5, -0.2)
  const hole = new THREE.Path()
  hole.moveTo(-DOOR_W / 2, 0)
  hole.lineTo(-DOOR_W / 2, DOOR_H)
  hole.lineTo(DOOR_W / 2, DOOR_H)
  hole.lineTo(DOOR_W / 2, 0)
  hole.lineTo(-DOOR_W / 2, 0)
  facadeShape.holes.push(hole)
  const facadeGeo = shade(new THREE.ShapeGeometry(facadeShape), (x, y) => {
    // a little brighter around the door, as if lit by what's inside
    const d = Math.hypot(x / 1.6, (y - DOOR_H * 0.5) / 2.2)
    return 0.55 + 0.45 * Math.exp(-d * d * 0.35)
  })
  const facade = new THREE.Mesh(facadeGeo, new THREE.MeshBasicMaterial({ color: 0x1b191c, vertexColors: true, fog: false }))
  facade.position.z = 0.75
  door.add(facade)
  const fFloor = new THREE.Mesh(new THREE.PlaneGeometry(15, 12), foyerMat(0x0b0a0c))
  fFloor.rotation.x = -Math.PI / 2
  fFloor.position.set(0, 0, 0.75 + 6)
  const fCeil = new THREE.Mesh(new THREE.PlaneGeometry(15, 12), foyerMat(0x09080a))
  fCeil.rotation.x = Math.PI / 2
  fCeil.position.set(0, 6, 0.75 + 6)
  door.add(fFloor, fCeil)
  for (const x of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.4), foyerMat(0x0d0c0e))
    w.rotation.y = -x * Math.PI / 2
    w.position.set(x * 7.5, 3, 0.75 + 6)
    door.add(w)
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.4), foyerMat(0x0a090b))
  back.rotation.y = Math.PI
  back.position.set(0, 3, 12.75)
  door.add(back)
  const trimMat = foyerMat(0xf3e7d1)
  const trims = [
    [0.03, DOOR_H, -DOOR_W / 2, DOOR_H / 2],
    [0.03, DOOR_H, DOOR_W / 2, DOOR_H / 2],
    [DOOR_W + 0.03, 0.03, 0, DOOR_H],
  ]
  for (const [w, h, x, y] of trims) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), trimMat)
    m.position.set(x, y, 0.77)
    door.add(m)
  }
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 6.4),
    new THREE.MeshBasicMaterial({
      color: 0xffe9c8, map: spillTexture(), transparent: true, opacity: 0.4, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }),
  )
  spill.rotation.x = -Math.PI / 2
  spill.position.set(0, 0.012, 0.75 + 3.2)
  door.add(spill)

  // ---------- theme (cross-fades between palettes) ----------
  const COLOR_KEYS = ['bg', 'wall', 'floor', 'ceiling', 'frame', 'sky', 'line', 'guide', 'bench', 'base']
  const NUM_KEYS = ['shadow', 'pool', 'cone', 'shaft', 'dust', 'floorOverlay', 'fogNear', 'fogFar']
  const cur = { c: {}, n: {} }
  COLOR_KEYS.forEach((k) => (cur.c[k] = new THREE.Color(PALETTES.light[k])))
  NUM_KEYS.forEach((k) => (cur.n[k] = PALETTES.light[k]))
  let themeTween = null

  function applyPalette() {
    const { c, n } = cur
    renderer.setClearColor(c.bg)
    scene.fog.color.copy(c.bg)
    scene.fog.near = n.fogNear
    scene.fog.far = n.fogFar
    wallMat.color.copy(c.wall)
    outerWallMat.color.copy(c.wall)
    jambMat.color.copy(c.wall).multiplyScalar(0.9)
    baseMat.color.copy(c.base)
    outerBaseMat.color.copy(c.base)
    ceilMat.color.copy(c.ceiling)
    floorMat.color.copy(c.floor)
    floorMat.opacity = n.floorOverlay
    frameMat.color.copy(c.frame)
    skyMat.color.copy(c.sky)
    lineMat.color.copy(c.line)
    guideMat.color.copy(c.guide)
    benchMat.color.copy(c.bench)
    shadowMat.opacity = n.shadow
    poolMat.opacity = n.pool
    poolMat.visible = n.pool > 0.01
    coneMat.opacity = n.cone
    dustMat.opacity = n.dust
  }

  function setTheme(name, animate = false) {
    const to = PALETTES[name]
    if (!animate || reducedMotion) {
      COLOR_KEYS.forEach((k) => cur.c[k].set(to[k]))
      NUM_KEYS.forEach((k) => (cur.n[k] = to[k]))
      themeTween = null
      applyPalette()
      return
    }
    themeTween = {
      t: 0,
      fromC: Object.fromEntries(COLOR_KEYS.map((k) => [k, cur.c[k].clone()])),
      fromN: { ...cur.n },
      toC: Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color(to[k])])),
      toN: to,
    }
  }

  function stepTheme(dt) {
    if (!themeTween) return
    const tw = themeTween
    tw.t = Math.min(1, tw.t + dt / 0.7)
    const e = tw.t * tw.t * (3 - 2 * tw.t)
    COLOR_KEYS.forEach((k) => cur.c[k].lerpColors(tw.fromC[k], tw.toC[k], e))
    NUM_KEYS.forEach((k) => (cur.n[k] = tw.fromN[k] + (tw.toN[k] - tw.fromN[k]) * e))
    applyPalette()
    if (tw.t >= 1) themeTween = null
  }

  // ---------- layout ----------
  let width = 1
  let height = 1
  let viewIn = 5 // how far before a work the visitor stops to look at it (inner / outer wall)
  let viewOut = 4
  let lean = 0 // narrow screens turn toward the current work
  let closeDist = 3 // distance when standing in front of a work
  let slotPx = 300 // pointer pixels per work (for drag)
  function layout() {
    width = container.clientWidth || window.innerWidth
    height = container.clientHeight || window.innerHeight
    const aspect = width / height
    renderer.setSize(width, height, false)
    camera.aspect = aspect
    camera.fov = aspect < 0.8 ? 68 : 58
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const halfH = Math.atan(tanV * aspect)
    lean = aspect < 1 ? THREE.MathUtils.lerp(0.1, 0.3, clamp01((1 - aspect) / 0.5)) : 0
    const viewAngle = THREE.MathUtils.clamp(halfH * 0.6 + lean, 0.3, 0.62)
    // the walking line is off-centre, so each wall needs its own stopping distance for the same view
    const tanA = Math.tan(viewAngle)
    // never stand so far back that the previous work (on the other wall) is still in front of you
    const maxView = SPACING - 2.2
    viewIn = THREE.MathUtils.clamp((PATH_R - RI - STANDOFF) / tanA, 4, maxView)
    viewOut = THREE.MathUtils.clamp((RO - STANDOFF - PATH_R) / tanA, 3.5, maxView)
    closeDist = Math.max(FRAME_H / (2 * tanV * 0.56), FRAME_W / (2 * tanV * aspect * 0.86))
    slotPx = THREE.MathUtils.clamp(Math.min(width, height) * 0.55, 160, 480)
    camera.updateProjectionMatrix()
    if (reflector) {
      const pr = renderer.getPixelRatio() * 0.5
      reflector.getRenderTarget().setSize(Math.round(width * pr), Math.round(height * pr))
    }
  }
  window.addEventListener('resize', layout)

  // ---------- motion state ----------
  let offset = 0
  let target = 0
  let dolly = 0 // 0 = walking, 1 = standing right in front of the current work
  let dollyTween = null
  let intro = { u: 0, dur: 2.8, playing: false } // 0 = waiting in the foyer, 1 = inside
  const tilt = { yaw: 0, pitch: 0 }
  let interactive = true
  let lastWheel = 0
  let dragging = false
  let currentPi = -1
  let hovered = -1
  let arrivalWaiters = []

  const nearestSlotDelta = (slot) => {
    let d = mod(slot - Math.round(offset), SLOTS)
    if (d > SLOTS / 2) d -= SLOTS
    return d
  }

  function goTo(delta) {
    target = Math.round(target) + delta
    emit('interact')
  }

  function goToProject(pi) {
    // pick the copy of this project nearest to where we are
    const here = Math.round(target)
    let best = null
    for (let s = pi; s < SLOTS; s += N) {
      let d = mod(s - here, SLOTS)
      if (d > SLOTS / 2) d -= SLOTS
      if (best === null || Math.abs(d) < Math.abs(best)) best = d
    }
    target = here + best
    return new Promise((resolve) => arrivalWaiters.push(resolve))
  }

  // ---------- input ----------
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(hitTargets, false)[0]
    return hit && hit.distance < 30 ? hit.object.userData.slot : -1
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!interactive) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1
      const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
      target += THREE.MathUtils.clamp(d, -120, 120) * 0.0032
      lastWheel = performance.now()
      emit('interact')
    },
    { passive: false },
  )

  let down = null
  let velocity = 0
  canvas.addEventListener('pointerdown', (e) => {
    if (!interactive || e.button > 0) return
    canvas.setPointerCapture(e.pointerId)
    down = { x: e.clientX, y: e.clientY, t: performance.now(), last: 0, lastT: performance.now(), startTarget: target, axis: null }
    velocity = 0
  })
  canvas.addEventListener('pointermove', (e) => {
    if (down) {
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (!dragging && Math.hypot(dx, dy) > 6) {
        dragging = true
        down.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        canvas.classList.add('is-dragging')
        emit('interact')
      }
      if (dragging) {
        // swipe up or drag left = walk forward
        const along = down.axis === 'x' ? dx : dy
        target = down.startTarget - along / slotPx
        const now = performance.now()
        const dt = Math.max(1, now - down.lastT)
        const v = (-(along - down.last) / slotPx / dt) * 1000
        velocity = velocity * 0.7 + v * 0.3
        down.last = along
        down.lastT = now
      }
      return
    }
    if (!interactive) return
    const s = pick(e.clientX, e.clientY)
    if (s !== hovered) {
      hovered = s
      canvas.style.cursor = s >= 0 ? 'pointer' : ''
    }
  })
  const endDrag = (e) => {
    if (!down) return
    const wasDrag = dragging
    const quick = performance.now() - down.t < 500
    dragging = false
    canvas.classList.remove('is-dragging')
    if (wasDrag) {
      target = Math.round(target + THREE.MathUtils.clamp(velocity * 0.22, -4, 4))
    } else if (e.type === 'pointerup' && quick) {
      const s = pick(e.clientX, e.clientY)
      if (s >= 0) {
        const d = nearestSlotDelta(s)
        if (d === 0) emit('open', slots[s].pi)
        else goTo(d - (Math.round(target) - Math.round(offset)))
      }
    }
    down = null
  }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('pointerleave', () => {
    if (!down) {
      hovered = -1
      canvas.style.cursor = ''
    }
  })

  window.addEventListener('keydown', (e) => {
    if (!interactive || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'd' || k === 'w') goTo(1)
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'a' || k === 's') goTo(-1)
    else if (k === 'Enter' && document.activeElement === document.body) emit('open', currentPi)
    else return
    e.preventDefault()
  })

  // ---------- camera ----------
  const walkPos = new THREE.Vector3()
  const walkLook = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  const camLook = new THREE.Vector3()
  const framePos = new THREE.Vector3()
  const pathAngle = (off) => {
    const w = (1 + Math.cos(Math.PI * off)) / 2 // 1 at inner-wall works, 0 at outer-wall works
    return off * STEP - (viewOut + (viewIn - viewOut) * w) / PATH_R
  }

  function walkPose(off) {
    const th = pathAngle(off)
    onRing(PATH_R, th, EYE, walkPos)
    onRing(PATH_R, th + LOOK_AHEAD / PATH_R, EYE + 0.15, walkLook)
  }

  /** From the foyer, through the door, then turn right and walk to the first work. */
  function introPose(u, time) {
    const k1 = easeInOut(clamp01(u / 0.62))
    const k2 = easeInOut(clamp01((u - 0.3) / 0.7))
    const kl = easeInOut(clamp01((u - 0.28) / 0.6))
    const r = THREE.MathUtils.lerp(RO + FOYER_DEPTH, PATH_R, k1)
    const th = THREE.MathUtils.lerp(THETA_DOOR, pathAngle(offset), k2)
    onRing(r, th, EYE, camPos)
    onRing(r - 12, th, EYE + 0.35, v1) // looking in through the door
    onRing(PATH_R, th + LOOK_AHEAD / PATH_R, EYE + 0.15, v2) // looking along the hall
    camLook.lerpVectors(v1, v2, kl)
    // a slow idle sway while waiting outside
    const idle = (1 - k1) * (reducedMotion ? 0 : 1)
    tangent(THETA_DOOR, v3)
    camPos.addScaledVector(v3, Math.sin(time * 0.25) * 0.28 * idle)
    camPos.y += Math.sin(time * 0.4) * 0.03 * idle
    return kl
  }

  // ---------- loop ----------
  const clock = new THREE.Clock()
  let running = true
  let time = 0

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    const rawDt = Math.min(clock.getDelta(), 0.25) // real time, for tweens (stays correct at low fps)
    const dt = Math.min(rawDt, 0.05) // clamped, for spring/easing stability
    const now = performance.now()
    time += rawDt

    if (!dragging && now - lastWheel > 170) target = Math.round(target)
    const k = 1 - Math.exp(-dt * (reducedMotion ? 30 : 4.2))
    offset += (target - offset) * k
    if (Math.abs(target - offset) < 0.0005) offset = target

    const centerSlot = mod(Math.round(offset), SLOTS)
    const pi = slots[centerSlot].pi
    if (pi !== currentPi) {
      currentPi = pi
      emit('center', pi)
    }
    if (arrivalWaiters.length && Math.abs(target - offset) < 0.02) {
      arrivalWaiters.forEach((r) => r(pi))
      arrivalWaiters = []
    }

    if (dollyTween) {
      dollyTween.t = Math.min(1, dollyTween.t + rawDt / dollyTween.dur)
      dolly = dollyTween.from + (dollyTween.to - dollyTween.from) * easeInOut(dollyTween.t)
      if (dollyTween.t >= 1) {
        const done = dollyTween.done
        dollyTween = null
        done()
      }
    }
    stepTheme(rawDt)
    if (intro.playing && intro.u < 1) intro.u = Math.min(1, intro.u + rawDt / intro.dur)

    // hover lift
    for (const sl of slots) {
      const want = sl.s === hovered && interactive ? 1 : 0
      sl.hover += (want - sl.hover) * (1 - Math.exp(-dt * 10))
      sl.art.scale.setScalar(1 + sl.hover * 0.035)
      sl.art.position.z = sl.hover * 0.1
    }

    // camera: walking pose, blended toward standing in front of the current work (dolly)
    let inside = 1
    if (intro.u < 1) {
      inside = introPose(intro.u, time)
    } else {
      walkPose(offset)
      const sl = slots[centerSlot]
      sl.group.getWorldPosition(framePos)
      v1.copy(framePos).addScaledVector(sl.face, closeDist)
      v1.y = FRAME_Y - 0.05
      camPos.lerpVectors(walkPos, v1, dolly)
      camLook.lerpVectors(walkLook, framePos, dolly)
    }
    camera.position.copy(camPos)
    camera.lookAt(camLook)
    // narrow screens lean toward the side the current work hangs on; a little lag-yaw while walking
    const free = inside * (1 - dolly)
    const leanNow = lean * Math.cos(Math.PI * offset)
    const lag = THREE.MathUtils.clamp((target - offset) * 0.025, -0.05, 0.05)
    camera.rotateY((leanNow - lag + tilt.yaw) * free)
    camera.rotateX(tilt.pitch * free)

    // light shafts fade as you walk through them
    for (const p of shafts) {
      p.material.opacity = cur.n.shaft * smooth(1.2, 6, p.position.distanceTo(camPos))
    }
    // dust wraps around the visitor
    for (let i = 0; i < DUST; i++) {
      const a = dustSeed[i * 4]
      const b = dustSeed[i * 4 + 1]
      const c = dustSeed[i * 4 + 2]
      const ph = dustSeed[i * 4 + 3] * 10
      const wrap = (base, cam) => cam + mod(base - cam, DUST_BOX) - DUST_BOX / 2
      dustPos[i * 3] = wrap(a * DUST_BOX + Math.sin(time * 0.2 + ph) * 0.3, camPos.x)
      dustPos[i * 3 + 1] = mod(b * HALL_H + time * 0.05 + ph, HALL_H)
      dustPos[i * 3 + 2] = wrap(c * DUST_BOX + Math.cos(time * 0.17 + ph) * 0.3, camPos.z)
    }
    dustGeo.attributes.position.needsUpdate = true

    renderer.render(scene, camera)
    adaptQuality(rawDt)
  }

  // adaptive quality: if the device struggles, drop the floor reflection, then resolution
  let perfFrames = 0
  let perfTime = 0
  let perfLevel = 0
  function adaptQuality(dt) {
    if (perfLevel >= 2 || document.hidden) return
    // gaps this long mean the browser is throttling us (background/occluded window), not a slow GPU
    if (dt > 0.2) {
      perfFrames = 0
      perfTime = 0
      return
    }
    perfFrames++
    perfTime += dt
    if (perfFrames < 60) return
    const avg = perfTime / perfFrames
    perfFrames = 0
    perfTime = 0
    if (avg < 1 / 40) return
    perfLevel++
    if (perfLevel === 1 && reflector) {
      scene.remove(reflector)
      reflector.dispose()
      reflector = null
      floorMat.transparent = false
      floorMat.needsUpdate = true
    } else {
      perfLevel = 2
      renderer.setPixelRatio(1)
      layout()
    }
  }

  // ---------- public api ----------
  const corner = new THREE.Vector3()
  return {
    canvas,
    get slotCount() {
      return SLOTS
    },
    get current() {
      return currentPi
    },
    on(type, fn) {
      listeners[type].push(fn)
    },
    start() {
      layout()
      clock.start()
      frame()
    },
    stop() {
      running = false
    },
    setTheme,
    next: () => goTo(1),
    prev: () => goTo(-1),
    goToProject,
    setInteractive(v) {
      interactive = v
      if (!v) {
        hovered = -1
        canvas.style.cursor = ''
      }
    },
    setTilt(yaw, pitch) {
      tilt.yaw = yaw
      tilt.pitch = pitch
    },
    /** Walk in from the foyer, through the doorway. */
    playIntro(dur = 2.8) {
      if (reducedMotion) {
        intro.u = 1
        return
      }
      intro.dur = dur
      intro.playing = true
    },
    /** Walk up to (1) or back from (0) the current work. */
    dollyTo(to, dur = 0.7) {
      if (reducedMotion) dur = 0.01
      return new Promise((done) => {
        dollyTween = { from: dolly, to, t: 0, dur, done }
      })
    },
    /** Screen rect of the current work's poster. */
    centerRect() {
      const sl = slots[mod(Math.round(offset), SLOTS)]
      sl.poster.updateWorldMatrix(true, false)
      const rect = canvas.getBoundingClientRect()
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        corner.set((x * FRAME_W) / 2, (y * FRAME_H) / 2, 0).applyMatrix4(sl.poster.matrixWorld).project(camera)
        const sx = rect.left + ((corner.x + 1) / 2) * rect.width
        const sy = rect.top + ((1 - corner.y) / 2) * rect.height
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx)
        minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
      }
      return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
    },
    /** Floor plan of the hall, for the Index: where each work hangs. */
    plan() {
      return {
        slots: SLOTS,
        works: N,
        inner: RI,
        outer: RO,
        door: { angle: THETA_DOOR, width: DOOR_W },
        positions: slots.map((sl) => ({ slot: sl.s, pi: sl.pi, angle: sl.s * STEP, inner: sl.inner })),
      }
    },
    // hooks for later modules
    _internals: { scene, slots, posterMats, posterTextures, renderer, camera, FRAME_W, FRAME_H, BORDER, R: RC },
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

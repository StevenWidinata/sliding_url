import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { createPosterTextures, POSTER_ASPECT } from './posters.js'

const TAU = Math.PI * 2
const FRAME_W = 4.2
const FRAME_H = FRAME_W / POSTER_ASPECT
const BORDER = 0.11
const MIN_SLOTS = 20 // the ring repeats projects until it has at least this many frames
const SPACING = 1.42 // slot arc length as a multiple of frame width
const FRAME_Y = 0.35
const FLOOR_Y = -3.3
const CEIL_Y = 7.2
const FOV = 52

export const PALETTES = {
  light: {
    bg: '#f2f1ee', wall: '#f5f4f1', floor: '#e4e2dd', ceiling: '#fbfaf8', frame: '#151515',
    cove: '#ffffff', shadow: 0.26, pool: 0.0, floorOverlay: 0.87, fogNear: 0.95, fogFar: 2.1,
  },
  dark: {
    bg: '#0c0c0e', wall: '#1d1c20', floor: '#111113', ceiling: '#0e0e10', frame: '#050505',
    cove: '#c9a87a', shadow: 0.55, pool: 0.85, floorOverlay: 0.66, fogNear: 0.85, fogFar: 1.9,
  },
}

const mod = (n, m) => ((n % m) + m) % m

function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  // draw the rect off-canvas and keep only its blurred shadow (works everywhere, unlike ctx.filter)
  ctx.shadowColor = 'rgba(0,0,0,1)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetX = 1000
  ctx.fillRect(-1000 + 56, 64, 144, 136)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function poolTexture() {
  // a soft cone of light from a ceiling spot: elliptical, fading to nothing at every edge
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.translate(128, 40)
  ctx.scale(1, 2.6)
  const g = ctx.createRadialGradient(0, 0, 4, 0, 30, 118)
  g.addColorStop(0, 'rgba(255,238,210,0.9)')
  g.addColorStop(0.35, 'rgba(255,226,186,0.38)')
  g.addColorStop(0.75, 'rgba(255,220,175,0.08)')
  g.addColorStop(1, 'rgba(255,220,170,0)')
  ctx.fillStyle = g
  ctx.fillRect(-128, -40, 256, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Grayscale vertex shading so plain MeshBasicMaterials still read as a lit room. */
function shadeByHeight(geo, minY, maxY, fn) {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / (maxY - minY)
    const v = fn(t)
    colors.set([v, v, v], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function shadeByRadius(geo, radius, fn) {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / radius
    const v = fn(r)
    colors.set([v, v, v], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

export function createGallery({ container, projects, manager, reducedMotion = false, lowPower = false }) {
  const N = projects.length
  const SLOTS = N * Math.max(1, Math.ceil(MIN_SLOTS / N))
  const STEP = TAU / SLOTS
  const R = (SLOTS * FRAME_W * SPACING) / TAU

  const listeners = { center: [], open: [], interact: [] }
  const emit = (type, ...args) => listeners[type].forEach((fn) => fn(...args))

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  const canvas = renderer.domElement

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xffffff, 20, 60)
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200)

  // ---------- room ----------
  const wallH = CEIL_Y - FLOOR_Y
  const wallGeo = new THREE.CylinderGeometry(R, R, wallH, 192, 12, true)
  wallGeo.translate(0, FLOOR_Y + wallH / 2, 0)
  shadeByHeight(wallGeo, FLOOR_Y, CEIL_Y, (t) =>
    t < 0.06 ? 0.8 + (t / 0.06) * 0.12 : t < 0.4 ? 0.92 + ((t - 0.06) / 0.34) * 0.08 : 1 - (t - 0.4) * 0.06,
  )
  const wallMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })
  scene.add(new THREE.Mesh(wallGeo, wallMat))

  const ceilGeo = new THREE.CircleGeometry(R, 192)
  shadeByRadius(ceilGeo, R, (r) => 1 - r * 0.05)
  const ceilMat = new THREE.MeshBasicMaterial({ vertexColors: true })
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = CEIL_Y
  scene.add(ceiling)

  const coveMat = new THREE.MeshBasicMaterial({ fog: false })
  const cove = new THREE.Mesh(new THREE.TorusGeometry(R - 0.25, 0.02, 6, 256), coveMat)
  cove.rotation.x = Math.PI / 2
  cove.position.y = CEIL_Y - 0.5
  scene.add(cove)

  let reflector = null
  if (!lowPower) {
    reflector = new Reflector(new THREE.CircleGeometry(R, 128), {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x8a8a8a,
    })
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = FLOOR_Y - 0.002
    scene.add(reflector)
  }
  const floorGeo = new THREE.CircleGeometry(R, 192)
  shadeByRadius(floorGeo, R, (r) => 1 - r * r * 0.12)
  const floorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: !!reflector, depthWrite: false })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR_Y
  scene.add(floor)

  // ---------- frames ----------
  const posterTextures = createPosterTextures(projects, manager, renderer)
  const posterMats = posterTextures.map(
    (map) => new THREE.MeshBasicMaterial({ map, toneMapped: false }),
  )
  const frameMat = new THREE.MeshBasicMaterial()
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, depthWrite: false, color: 0x000000,
  })
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })

  const borderGeo = new THREE.BoxGeometry(FRAME_W + BORDER * 2, FRAME_H + BORDER * 2, 0.09)
  const posterGeo = new THREE.PlaneGeometry(FRAME_W, FRAME_H)
  const shadowGeo = new THREE.PlaneGeometry(FRAME_W * 1.75, FRAME_H * 1.95)
  const poolGeo = new THREE.PlaneGeometry(FRAME_W * 1.45, FRAME_H * 2.9)

  const ring = new THREE.Group()
  scene.add(ring)
  const slots = []
  const hitTargets = []
  for (let s = 0; s < SLOTS; s++) {
    const pi = s % N
    const theta = s * STEP
    const g = new THREE.Group()
    const rf = R - 0.34
    g.position.set(rf * Math.sin(theta), FRAME_Y, -rf * Math.cos(theta))
    g.lookAt(0, FRAME_Y, 0)

    const art = new THREE.Group() // scaled on hover
    const border = new THREE.Mesh(borderGeo, frameMat)
    const poster = new THREE.Mesh(posterGeo, posterMats[pi])
    poster.position.z = 0.047
    art.add(border, poster)

    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.set(0, -0.16, -0.08)
    const pool = new THREE.Mesh(poolGeo, poolMat)
    pool.position.set(0, FRAME_H * 0.55, -0.075)
    g.add(pool, shadow, art)
    ring.add(g)

    poster.userData.slot = s
    border.userData.slot = s
    hitTargets.push(poster, border)
    slots.push({ s, pi, group: g, art, poster, hover: 0 })
  }

  // ---------- theme (cross-fades between palettes) ----------
  const COLOR_KEYS = ['bg', 'wall', 'floor', 'ceiling', 'frame', 'cove']
  const NUM_KEYS = ['shadow', 'pool', 'floorOverlay', 'fogNear', 'fogFar']
  const cur = { c: {}, n: {} }
  COLOR_KEYS.forEach((k) => (cur.c[k] = new THREE.Color(PALETTES.light[k])))
  NUM_KEYS.forEach((k) => (cur.n[k] = PALETTES.light[k]))
  let theme = 'light'
  let themeTween = null

  function applyPalette() {
    const { c, n } = cur
    renderer.setClearColor(c.bg)
    scene.fog.color.copy(c.bg)
    wallMat.color.copy(c.wall)
    ceilMat.color.copy(c.ceiling)
    floorMat.color.copy(c.floor)
    floorMat.opacity = n.floorOverlay
    frameMat.color.copy(c.frame)
    coveMat.color.copy(c.cove)
    shadowMat.opacity = n.shadow
    poolMat.opacity = n.pool
    poolMat.visible = n.pool > 0.01
    scene.fog.near = baseDist * n.fogNear
    scene.fog.far = baseDist + R * n.fogFar
  }

  function setTheme(name, animate = false) {
    theme = name
    const to = PALETTES[name]
    cove.visible = name === 'dark'
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
  let baseDist = R // camera distance to the front frame
  let slotPx = 300 // on-screen pixels per slot (for drag)
  function layout() {
    width = container.clientWidth || window.innerWidth
    height = container.clientHeight || window.innerHeight
    const aspect = width / height
    renderer.setSize(width, height, false)
    camera.aspect = aspect
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    // how much of the screen width the centred frame should take
    const frac = aspect < 0.75 ? 0.7 : aspect < 1.2 ? 0.36 : 0.165
    let d = FRAME_W / (frac * 2 * tanHalf * aspect)
    d = Math.max(d, FRAME_H / (0.42 * 2 * tanHalf)) // never taller than 42% of the screen
    baseDist = THREE.MathUtils.clamp(d, 4, R * 1.85)
    slotPx = ((FRAME_W * SPACING) / (2 * tanHalf * aspect * baseDist)) * width
    scene.fog.near = baseDist * cur.n.fogNear
    scene.fog.far = baseDist + R * cur.n.fogFar
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
  let dolly = 0 // 0 = normal, 1 = right up to the centred frame
  let dollyTween = null
  let intro = { t: 1, from: 0 } // intro walk-in (1 = done)
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
    return hit ? hit.object.userData.slot : -1
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!interactive) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1
      const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
      target += THREE.MathUtils.clamp(d, -120, 120) * 0.0024
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
    down = { x: e.clientX, y: e.clientY, t: performance.now(), lastX: e.clientX, lastT: performance.now(), startTarget: target }
    velocity = 0
  })
  canvas.addEventListener('pointermove', (e) => {
    if (down) {
      const dx = e.clientX - down.x
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true
        canvas.classList.add('is-dragging')
        emit('interact')
      }
      if (dragging) {
        target = down.startTarget - dx / slotPx
        const now = performance.now()
        const dt = Math.max(1, now - down.lastT)
        const v = (-(e.clientX - down.lastX) / slotPx / dt) * 1000
        velocity = velocity * 0.7 + v * 0.3
        down.lastX = e.clientX
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
    if (e.key === 'ArrowRight' || e.key === 'd') goTo(1)
    else if (e.key === 'ArrowLeft' || e.key === 'a') goTo(-1)
    else if (e.key === 'Enter' && document.activeElement === document.body) emit('open', currentPi)
    else return
    e.preventDefault()
  })

  // ---------- loop ----------
  const clock = new THREE.Clock()
  const lookTarget = new THREE.Vector3()
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  let running = true

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    const rawDt = Math.min(clock.getDelta(), 0.25) // real time, for tweens (stays correct at low fps)
    const dt = Math.min(rawDt, 0.05) // clamped, for spring/easing stability
    const now = performance.now()

    if (!dragging && now - lastWheel > 170) target = Math.round(target)
    const k = 1 - Math.exp(-dt * (reducedMotion ? 30 : 6.5))
    offset += (target - offset) * k
    if (Math.abs(target - offset) < 0.0005) offset = target
    ring.rotation.y = offset * STEP

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
    if (intro.t < 1) intro.t = Math.min(1, intro.t + rawDt / intro.dur)
    const walk = intro.t < 1 ? 1 - easeInOut(intro.t) : 0

    // hover lift
    for (const sl of slots) {
      const want = sl.s === hovered && interactive ? 1 : 0
      sl.hover += (want - sl.hover) * (1 - Math.exp(-dt * 10))
      sl.art.scale.setScalar(1 + sl.hover * 0.035)
      sl.art.position.z = sl.hover * 0.12
    }

    // camera: base distance, pulled in by dolly, pushed back during intro walk-in
    const closeDist = FRAME_H * 0.9 + 0.3
    const dist = THREE.MathUtils.lerp(baseDist, closeDist, dolly) + walk * R * 0.9
    camera.position.set(0, FRAME_Y - 0.05 + walk * 0.25, -R + dist)
    // a little lag-yaw while sliding makes it feel like turning your head
    const lag = THREE.MathUtils.clamp((target - offset) * 0.03, -0.06, 0.06)
    lookTarget.set(0, FRAME_Y - 0.1, -R)
    camera.lookAt(lookTarget)
    camera.rotateY(-lag + tilt.yaw - walk * 0.5)
    camera.rotateX(tilt.pitch)

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
    /** Walk in from the doorway. */
    playIntro(dur = 2.6) {
      if (reducedMotion) return
      intro = { t: 0, dur }
      target = offset = -3
      setTimeout(() => (target = 0), 250)
    },
    /** Move the camera toward (1) or away from (0) the centred frame. */
    dollyTo(to, dur = 0.7) {
      if (reducedMotion) dur = 0.01
      return new Promise((done) => {
        dollyTween = { from: dolly, to, t: 0, dur, done }
      })
    },
    /** Screen rect of the centred poster. */
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
    // hooks for later modules
    _internals: { scene, slots, posterMats, posterTextures, renderer, camera, FRAME_W, FRAME_H, BORDER, R },
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

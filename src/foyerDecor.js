// The foyer's fittings: crystal chandeliers, a classical doorway (fluted columns, an entablature
// and a pair of marble urns), a carpet runner, a cornice and a coffered ceiling.
// All built from primitives with matcaps and canvas textures, so nothing extra is downloaded.
import * as THREE from 'three'
import { canvasTexture, dotTexture, matcap } from './materials.js'

const marbleMatcap = () =>
  matcap([[0, '#fffdf8'], [0.35, '#ece5da'], [0.7, '#b3aa9d'], [1, '#4a443c']], 0.55)
const crystalMatcap = () =>
  matcap([[0, '#ffffff'], [0.25, '#f4f8ff'], [0.5, '#9fb0c8'], [0.72, '#ffffff'], [1, '#2a3140']], 1)

/**
 * A crystal chandelier hanging from the ceiling: a brass stem, two tiers of curved arms with
 * candles, and crystal drops on every arm and in a swag below. Static, like the real thing.
 */
export function chandelier({ brass, ceilingY, drop = 1.5, scale = 1 }) {
  const g = new THREE.Group()
  const crystal = new THREE.MeshMatcapMaterial({ matcap: crystalMatcap(), fog: false })
  const candleMat = new THREE.MeshBasicMaterial({ color: 0xf6efe2, fog: false })
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfff1cc, fog: false })
  const glowMat = new THREE.SpriteMaterial({
    map: dotTexture(), color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  })
  const s = scale

  // ceiling rose and the rod down to the body
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.26 * s, 0.05 * s, 32), brass)
  rose.position.y = ceilingY - 0.025 * s
  g.add(rose)
  const top = ceilingY - drop * s
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, drop * s, 8), brass)
  rod.position.y = top + (drop * s) / 2
  g.add(rod)

  // the stem: a turned brass baluster
  const profile = [
    [0, 0.42], [0.03, 0.42], [0.05, 0.36], [0.035, 0.3], [0.06, 0.2], [0.11, 0.08], [0.12, 0],
    [0.09, -0.08], [0.05, -0.14], [0.07, -0.22], [0.04, -0.3], [0.05, -0.38], [0.02, -0.46], [0, -0.48],
  ].map(([r, y]) => new THREE.Vector2(r * s, y * s))
  const stem = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), brass)
  stem.position.y = top - 0.42 * s
  g.add(stem)
  const cy = stem.position.y // the body's centre

  // arms with candles: a lower tier of 8 and an upper tier of 6
  const drops = [] // crystal positions (local), filled below
  const candleGeo = new THREE.CylinderGeometry(0.02 * s, 0.022 * s, 0.13 * s, 12)
  const cupGeo = new THREE.CylinderGeometry(0.055 * s, 0.025 * s, 0.03 * s, 20)
  const flameGeo = new THREE.SphereGeometry(0.018 * s, 12, 8).scale(1, 1.7, 1)
  const tiers = [
    { n: 8, r: 0.62, y0: -0.02, rise: 0.16, sag: 0.3, off: 0 },
    { n: 6, r: 0.36, y0: 0.2, rise: 0.14, sag: 0.18, off: Math.PI / 6 },
  ]
  for (const t of tiers) {
    for (let i = 0; i < t.n; i++) {
      const a = t.off + (i / t.n) * Math.PI * 2
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const p0 = dir.clone().multiplyScalar(0.07 * s).setY(cy + t.y0 * s)
      const p2 = dir.clone().multiplyScalar(t.r * s).setY(cy + (t.y0 + t.rise) * s)
      const p1 = dir.clone().multiplyScalar(t.r * 0.8 * s).setY(cy + (t.y0 - t.sag) * s)
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 24, 0.012 * s, 8), brass))
      const cup = new THREE.Mesh(cupGeo, brass)
      cup.position.copy(p2)
      g.add(cup)
      const candle = new THREE.Mesh(candleGeo, candleMat)
      candle.position.copy(p2).setY(p2.y + 0.08 * s)
      g.add(candle)
      const flame = new THREE.Mesh(flameGeo, flameMat)
      flame.position.copy(p2).setY(p2.y + 0.17 * s)
      g.add(flame)
      const halo = new THREE.Sprite(glowMat)
      halo.position.copy(flame.position)
      halo.scale.setScalar(0.32 * s)
      g.add(halo)
      // a short string of drops under each cup
      for (let k = 0; k < 2; k++) drops.push([p2.x, p2.y - (0.06 + k * 0.07) * s, p2.z, k === 1 ? 1.25 : 0.9])
    }
  }
  // a swag of crystals looping between the lower arms, and a chain under the stem
  const swagR = 0.5 * s
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    const sag = Math.abs(Math.sin(a * 4)) * 0.12 * s // dips between the 8 arms
    drops.push([Math.cos(a) * swagR, cy - 0.12 * s - sag, Math.sin(a) * swagR, 0.6])
  }
  for (let k = 0; k < 4; k++) drops.push([0, cy - (0.52 + k * 0.07) * s, 0, 0.8])
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 * s, 1), crystal)
  ball.position.y = cy - 0.84 * s
  g.add(ball)

  const dropGeo = new THREE.OctahedronGeometry(0.028 * s).scale(1, 1.8, 1)
  const inst = new THREE.InstancedMesh(dropGeo, crystal, drops.length)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const v = new THREE.Vector3()
  drops.forEach(([x, y, z, k], i) => {
    q.setFromAxisAngle(v.set(0, 1, 0), i * 0.7)
    inst.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(k, k, k)))
  })
  g.add(inst)

  // the warm light it throws around itself
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: 0xffc98a, transparent: true, opacity: 0.22, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }))
  aura.position.y = cy
  aura.scale.setScalar(2.6 * s)
  g.add(aura)
  return g
}

/** A fluted marble column with a simple base and capital, standing on the floor. */
export function column({ height, radius = 0.19 }) {
  const g = new THREE.Group()
  const marble = new THREE.MeshMatcapMaterial({ matcap: marbleMatcap(), fog: false })
  const base = 0.26
  const cap = 0.24
  const shaftH = height - base - cap
  // fluting: 20 shallow grooves cut into the shaft, with a slight taper toward the top
  const shaft = new THREE.CylinderGeometry(radius * 0.9, radius, shaftH, 120, 8, false)
  const pos = shaft.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 1e-4) continue
    const a = Math.atan2(z, x)
    const k = 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * 10)), 3)
    pos.setX(i, x * k)
    pos.setZ(i, z * k)
  }
  shaft.computeVertexNormals()
  const sh = new THREE.Mesh(shaft, marble)
  sh.position.y = base + shaftH / 2
  g.add(sh)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.7, 0.12, radius * 2.7), marble)
  plinth.position.y = 0.06
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.05, 0.05, 12, 48).rotateX(Math.PI / 2), marble)
  torus.position.y = 0.17
  const torus2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.03, 12, 48).rotateX(Math.PI / 2), marble)
  torus2.position.y = 0.235
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 0.9, 0.12, 48), marble)
  echinus.position.y = height - cap + 0.08
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.7, 0.1, radius * 2.7), marble)
  abacus.position.y = height - 0.05
  g.add(plinth, torus, torus2, echinus, abacus)
  return g
}

/** A turned marble urn with handles, about 0.6 tall. */
export function urn() {
  const marble = new THREE.MeshMatcapMaterial({ matcap: marbleMatcap(), fog: false })
  const profile = [
    [0, 0], [0.13, 0], [0.13, 0.03], [0.08, 0.05], [0.06, 0.1], [0.07, 0.13], [0.15, 0.2],
    [0.2, 0.3], [0.2, 0.37], [0.16, 0.44], [0.1, 0.48], [0.09, 0.52], [0.14, 0.56], [0.14, 0.59], [0.11, 0.59],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const g = new THREE.Group()
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), marble))
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 24, Math.PI), marble)
    handle.position.set(s * 0.17, 0.46, 0)
    handle.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2
    g.add(handle)
  }
  return g
}

/** An oxblood runner with a gold border and a quiet diamond pattern, lying flat. */
export function runner(width, length) {
  const tex = canvasTexture(256, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#4b1218'
    ctx.fillRect(0, 0, w, h)
    // pile: fine streaks
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`
      ctx.fillRect(0, y, w, 1)
    }
    ctx.strokeStyle = 'rgba(120,32,40,0.9)'
    ctx.lineWidth = 2
    for (let y = -64; y < h + 64; y += 64) {
      ctx.beginPath()
      ctx.moveTo(w / 2, y)
      ctx.lineTo(w * 0.8, y + 32)
      ctx.lineTo(w / 2, y + 64)
      ctx.lineTo(w * 0.2, y + 32)
      ctx.closePath()
      ctx.stroke()
    }
    ctx.fillStyle = '#b89150'
    ctx.fillRect(14, 0, 6, h)
    ctx.fillRect(w - 20, 0, 6, h)
    ctx.fillRect(28, 0, 2, h)
    ctx.fillRect(w - 30, 0, 2, h)
  })
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, length / (width * 4))
  tex.anisotropy = 8
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshBasicMaterial({ map: tex, color: 0xb8a89a, fog: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

/** Coffered ceiling: a grid of dark beams with a thin brass line along each. */
export function coffers({ width, depth, y, spacing = 2.2, brass }) {
  const g = new THREE.Group()
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x1b1714, fog: false })
  const beamH = 0.22
  for (let x = -width / 2; x <= width / 2 + 1e-3; x += spacing) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, beamH, depth), beamMat)
    b.position.set(x, y - beamH / 2, 0)
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, depth), brass)
    line.position.set(x, y - beamH - 0.005, 0)
    g.add(b, line)
  }
  for (let z = -depth / 2; z <= depth / 2 + 1e-3; z += spacing) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(width, beamH, 0.16), beamMat)
    b.position.set(0, y - beamH / 2, z)
    const line = new THREE.Mesh(new THREE.BoxGeometry(width, 0.01, 0.02), brass)
    line.position.set(0, y - beamH - 0.005, z)
    g.add(b, line)
  }
  return g
}

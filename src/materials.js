// Shared procedural textures and shading helpers for the museum (gallery + foyer).
import * as THREE from 'three'

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export const shadowTexture = () =>
  canvasTexture(256, 256, (ctx) => {
    // draw the rect off-canvas and keep only its blurred shadow (works everywhere, unlike ctx.filter)
    ctx.shadowColor = 'rgba(0,0,0,1)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetX = 1000
    ctx.fillRect(-1000 + 56, 64, 144, 136)
  })

export const poolTexture = () =>
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

export const beamTexture = () =>
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

export const dotTexture = () =>
  canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
  })

export const spillTexture = () =>
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

/** Polished marble: soft clouding and fine veins, drawn so the tile repeats without seams. */
export function marbleTexture() {
  const S = 1024
  const t = canvasTexture(S, S, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, S, S)
    const wrapDraw = (draw) => {
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        ctx.save()
        ctx.translate(dx, dy)
        draw()
        ctx.restore()
      }
    }
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 70; i++) {
      const x = rnd() * S, y = rnd() * S, r = 60 + rnd() * 180, a = 0.025 + rnd() * 0.035
      wrapDraw(() => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(120,114,104,${a})`)
        g.addColorStop(1, 'rgba(120,114,104,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
      })
    }
    for (let v = 0; v < 9; v++) {
      const pts = []
      let x = rnd() * S, y = rnd() * S, ang = rnd() * Math.PI * 2
      let turn = 0
      for (let k = 0; k < 110; k++) {
        pts.push([x, y])
        turn = turn * 0.85 + (rnd() - 0.5) * 0.08 // slow, flowing bends
        ang += turn
        x += Math.cos(ang) * 9
        y += Math.sin(ang) * 9
      }
      const strength = 0.07 + rnd() * 0.1
      for (const [w, a] of [[9, strength * 0.12], [3, strength * 0.35], [1, strength]]) {
        wrapDraw(() => {
          ctx.strokeStyle = `rgba(92,86,78,${a})`
          ctx.lineWidth = w
          ctx.lineJoin = ctx.lineCap = 'round'
          ctx.beginPath()
          pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
          ctx.stroke()
        })
      }
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(9, 9)
  t.anisotropy = 8
  return t
}

/** Grayscale vertex shading so plain MeshBasicMaterials still read as a lit room. */
export function shade(geo, fn) {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const v = fn(pos.getX(i), pos.getY(i), pos.getZ(i))
    colors.set([v, v, v], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

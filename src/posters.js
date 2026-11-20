import * as THREE from 'three'

export const POSTER_ASPECT = 16 / 10

function hueFromSlug(slug) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

const comingSoonCache = new Map()

/** A generated poster for projects that are not live yet. */
export function comingSoonCanvas(project, w = 1280, h = 800) {
  const key = `${project.slug}:${w}`
  if (comingSoonCache.has(key)) return comingSoonCache.get(key)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const hue = hueFromSlug(project.slug)
  const s = w / 1280

  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, `hsl(${hue} 42% 20%)`)
  bg.addColorStop(1, `hsl(${(hue + 40) % 360} 50% 9%)`)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // fine diagonal hatching
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 2 * s
  for (let x = -h; x < w; x += 22 * s) {
    ctx.beginPath()
    ctx.moveTo(x, h)
    ctx.lineTo(x + h, 0)
    ctx.stroke()
  }

  const pad = 80 * s
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `600 ${26 * s}px Archivo, sans-serif`
  ctx.textBaseline = 'top'
  ctx.letterSpacing = `${6 * s}px`
  ctx.fillText(project.kicker.toUpperCase(), pad, pad)

  // big title, shrunk to fit
  let size = 150 * s
  ctx.letterSpacing = `${-2 * s}px`
  do {
    ctx.font = `800 ${size}px Archivo, sans-serif`
    size -= 4 * s
  } while (ctx.measureText(project.title.toUpperCase()).width > w - pad * 2 && size > 40 * s)
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(project.title.toUpperCase(), pad, h * 0.56)

  ctx.letterSpacing = `${2 * s}px`
  ctx.font = `400 ${30 * s}px Archivo, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(project.tech.join('  ·  '), pad, h * 0.56 + 64 * s)

  // stamp
  ctx.save()
  ctx.translate(w - pad - 200 * s, h - pad - 70 * s)
  ctx.rotate(-0.12)
  ctx.strokeStyle = '#ffd23f'
  ctx.lineWidth = 6 * s
  ctx.strokeRect(-200 * s, -52 * s, 400 * s, 104 * s)
  ctx.fillStyle = '#ffd23f'
  ctx.font = `800 ${46 * s}px Archivo, sans-serif`
  ctx.letterSpacing = `${8 * s}px`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('COMING SOON', 4 * s, 2 * s)
  ctx.restore()

  comingSoonCache.set(key, c)
  return c
}

const srcCache = new Map()
/** URL usable in <img> for a project's poster. */
export function posterSrc(project) {
  if (project.url) return `/posters/${project.slug}.jpg`
  if (!srcCache.has(project.slug)) {
    srcCache.set(project.slug, comingSoonCanvas(project, 960, 600).toDataURL('image/jpeg', 0.88))
  }
  return srcCache.get(project.slug)
}

export function videoSrc(project) {
  return project.url ? `/posters/${project.slug}.webm` : null
}

/** One texture per project (live = screenshot, otherwise generated poster). */
export function createPosterTextures(projects, manager, renderer) {
  const loader = new THREE.TextureLoader(manager)
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return projects.map((p) => {
    const tex = p.url ? loader.load(posterSrc(p)) : new THREE.CanvasTexture(comingSoonCanvas(p))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = aniso
    return tex
  })
}

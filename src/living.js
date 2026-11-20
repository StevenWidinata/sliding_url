// Living artworks: the centred frame swaps its screenshot for a muted loop of the live site.
// Only one video plays at a time; everything else stays a still image.
import * as THREE from 'three'
import { videoSrc } from './posters.js'

export function createLiving({ gallery, detail, projects, reducedMotion }) {
  const { posterMats, posterTextures } = gallery._internals
  const saveData = navigator.connection && navigator.connection.saveData
  const enabled = !reducedMotion && !saveData
  const entries = new Map()
  let active = -1
  let timer = null

  function entry(pi) {
    if (!enabled || !projects[pi].url) return null
    if (entries.has(pi)) return entries.get(pi)
    const v = document.createElement('video')
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.setAttribute('aria-hidden', 'true')
    v.preload = 'auto'
    v.src = videoSrc(projects[pi])
    const tex = new THREE.VideoTexture(v)
    tex.colorSpace = THREE.SRGBColorSpace
    const e = { v, tex, ready: false, failed: false }
    v.addEventListener('playing', () => {
      e.ready = true
      v.classList.add('is-playing')
      if (active === pi) posterMats[pi].map = tex
    })
    v.addEventListener('error', () => {
      e.failed = true
      posterMats[pi].map = posterTextures[pi]
    })
    entries.set(pi, e)
    return e
  }

  function stop(pi) {
    const e = entries.get(pi)
    if (!e) return
    e.v.pause()
    posterMats[pi].map = posterTextures[pi]
  }

  function activate(pi) {
    if (active === pi) return
    if (active >= 0 && !(detail.isOpen && detail.current === active)) stop(active)
    active = pi
    clearTimeout(timer)
    // small delay so flicking past frames does not start a dozen downloads
    timer = setTimeout(() => {
      if (active !== pi) return
      const e = entry(pi)
      if (!e || e.failed) return
      if (e.ready) posterMats[pi].map = e.tex
      e.v.play().catch(() => {})
    }, 380)
  }

  gallery.on('center', activate)

  // the detail view shows the same loop over its poster image
  detail.on('fill', (pi, media) => {
    media.querySelectorAll('video').forEach((v) => v.remove())
    const e = entry(pi)
    if (!e || e.failed) return
    media.appendChild(e.v)
    e.v.play().catch(() => {})
  })

  document.addEventListener('visibilitychange', () => {
    const e = entries.get(active)
    if (!e) return
    document.hidden ? e.v.pause() : e.v.play().catch(() => {})
  })
}

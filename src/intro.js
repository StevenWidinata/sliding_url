// Exhibition entrance: title card + loading line, then the doors slide open into the gallery.
export function createIntro({ manager, count, reducedMotion, onEnter }) {
  const root = document.createElement('div')
  root.className = 'intro'
  const name = 'STEVEN WIDINATA'
  root.innerHTML = `
    <div class="intro__door intro__door--l"></div>
    <div class="intro__door intro__door--r"></div>
    <div class="intro__content">
      <p class="intro__kicker">Now showing · An exhibition in ${count} works</p>
      <h1 class="intro__title" aria-label="${name}">${[...name]
        .map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`)
        .join('')}</h1>
      <p class="intro__sub">— Collected Works —</p>
      <div class="intro__load" role="progressbar" aria-label="Loading the gallery" aria-valuemin="0" aria-valuemax="100">
        <span class="intro__bar"></span>
      </div>
      <button class="intro__enter" type="button" disabled>
        <span class="intro__enter-label">Hanging the works…</span>
      </button>
      <p class="intro__note">Sound on for the full experience${matchMedia('(pointer: coarse)').matches ? '' : ' · Esc to leave a room'}</p>
    </div>
  `
  document.body.appendChild(root)
  const bar = root.querySelector('.intro__bar')
  const load = root.querySelector('.intro__load')
  const btn = root.querySelector('.intro__enter')
  const label = root.querySelector('.intro__enter-label')
  requestAnimationFrame(() => root.classList.add('is-in'))

  let progress = 0
  const setProgress = (p) => {
    progress = Math.max(progress, p)
    bar.style.transform = `scaleX(${progress})`
    load.setAttribute('aria-valuenow', Math.round(progress * 100))
  }
  const shownAt = performance.now()
  const ready = () => {
    setProgress(1)
    const delay = Math.max(0, 1300 - (performance.now() - shownAt))
    setTimeout(() => {
      root.classList.add('is-ready')
      btn.disabled = false
      label.textContent = 'Enter the gallery'
      btn.focus({ preventScroll: true })
    }, delay)
  }
  manager.onProgress = (_url, loaded, total) => setProgress(total ? loaded / total : 1)
  manager.onLoad = ready
  manager.onError = () => {} // a missing poster should never block the entrance
  // nothing queued (or very slow network): never trap the visitor
  setTimeout(() => !root.classList.contains('is-ready') && ready(), 9000)

  btn.addEventListener('click', () => {
    if (root.classList.contains('is-leaving')) return
    root.classList.add('is-leaving')
    onEnter()
    setTimeout(() => root.remove(), reducedMotion ? 300 : 1900)
  })

  return { el: root, ready }
}

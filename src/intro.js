// Exhibition entrance over the live 3D foyer. The title is lettered on the foyer wall, so this layer
// only holds what the scene can't: the loading line, the Enter button and a title for screen readers.
// Enter (or picking a work on the wall) walks you through the doorway.
export function createIntro({ manager, count, reducedMotion, onEnter, onReady = () => {} }) {
  const root = document.createElement('div')
  root.className = 'intro'
  const touch = matchMedia('(pointer: coarse)').matches
  // on narrow portrait screens the hang sits outside the view, so don't point at it
  const wallInView = !matchMedia('(max-aspect-ratio: 1/1)').matches
  const note = [
    'Sound on',
    wallInView && (touch ? 'or tap a work on the wall' : 'or click a work on the wall'),
    !touch && 'Esc leaves a room',
  ].filter(Boolean).join(' · ')
  const noteText = note === 'Sound on' ? 'Sound on for the full experience' : note
  root.innerHTML = `
    <h1 class="sr-only">Steven Widinata, collected works: an exhibition of ${count} projects</h1>
    <div class="intro__foot">
      <div class="intro__load" role="progressbar" aria-label="Loading the gallery" aria-valuemin="0" aria-valuemax="100">
        <span class="intro__bar"></span>
      </div>
      <button class="intro__enter" type="button" disabled>
        <span class="intro__enter-label">Hanging the works</span>
      </button>
      <p class="intro__note">${noteText}</p>
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
  let isReady = false
  const ready = () => {
    setProgress(1)
    const delay = Math.max(0, 1300 - (performance.now() - shownAt))
    setTimeout(() => {
      if (isReady) return
      isReady = true
      root.classList.add('is-ready')
      btn.disabled = false
      label.textContent = 'Enter the gallery'
      onReady()
    }, delay)
  }
  manager.onProgress = (_url, loaded, total) => setProgress(total ? loaded / total : 1)
  manager.onLoad = ready
  manager.onError = () => {} // a missing poster should never block the entrance
  // nothing queued (or very slow network): never trap the visitor
  setTimeout(() => !isReady && ready(), 9000)

  /** Leave the entrance; `pi` walks straight to that work. */
  const enter = (pi = -1) => {
    if (!isReady || root.classList.contains('is-leaving')) return
    root.classList.add('is-leaving')
    onEnter(pi)
    setTimeout(() => root.remove(), reducedMotion ? 300 : 1900)
  }
  btn.addEventListener('click', () => enter())
  // Enter or Space anywhere on the entrance goes in, without stealing focus for a ring on load
  const onKey = (e) => {
    if (!document.body.contains(root)) return window.removeEventListener('keydown', onKey)
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) {
      e.preventDefault()
      enter()
    }
  }
  window.addEventListener('keydown', onKey)

  return {
    el: root,
    ready,
    enter,
    /** The 3D foyer is drawing behind: let it show through. */
    sceneReady: () => root.classList.add('has-scene'),
  }
}

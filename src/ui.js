// Gallery HUD: brand mark, centred-work caption, arrows, hint, and the top-right pill bar.
const pad = (n) => String(n).padStart(2, '0')

export function createHud(root, projects, { onPrev, onNext, onOpen }) {
  root.innerHTML = `
    <a class="brand" href="/" aria-label="Steven Widinata, collected works">
      <span class="brand__mark"></span>
      <span class="brand__text">Steven Widinata<em>Collected Works</em></span>
    </a>
    <div class="pills" role="toolbar" aria-label="Gallery controls"></div>
    <div class="caption" aria-live="polite">
      <p class="caption__meta"><span class="caption__no"></span><span class="caption__kicker"></span></p>
      <h1 class="caption__title"></h1>
      <p class="caption__status"></p>
      <button class="caption__enter" type="button">Enter the project <span aria-hidden="true">→</span></button>
    </div>
    <button class="arrow arrow--prev" type="button" aria-label="Previous project">←</button>
    <button class="arrow arrow--next" type="button" aria-label="Next project">→</button>
    <p class="hint">Scroll, drag or use ← → to walk the gallery</p>
    <nav class="sr-only" aria-label="All projects">
      <ul>${projects
        .map((p) => `<li>${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.title}</a>` : `${p.title} (coming soon)`}</li>`)
        .join('')}</ul>
    </nav>
  `
  const $ = (s) => root.querySelector(s)
  const caption = $('.caption')
  $('.arrow--prev').addEventListener('click', onPrev)
  $('.arrow--next').addEventListener('click', onNext)
  $('.caption__enter').addEventListener('click', onOpen)

  let swapTimer
  return {
    pills: $('.pills'),
    setProject(pi) {
      const p = projects[pi]
      caption.classList.add('is-swapping')
      clearTimeout(swapTimer)
      swapTimer = setTimeout(() => {
        $('.caption__no').textContent = `No. ${pad(pi + 1)} / ${pad(projects.length)}`
        $('.caption__kicker').textContent = p.kicker
        $('.caption__title').textContent = p.title
        caption.classList.toggle('is-soon', !p.url)
        caption.classList.remove('is-swapping')
      }, 140)
    },
    setStatus(html) {
      $('.caption__status').innerHTML = html
    },
    hideHint() {
      $('.hint').classList.add('is-hidden')
    },
    setVisible(v) {
      root.classList.toggle('is-hidden', !v)
    },
  }
}

/** Small helper for the top-right pill buttons other modules add. */
export function addPill(bar, { label, title, onClick, order = 0 }) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'pill'
  b.style.order = order
  b.innerHTML = label
  if (title) {
    b.title = title
    b.setAttribute('aria-label', title)
  }
  b.addEventListener('click', onClick)
  bar.appendChild(b)
  return b
}

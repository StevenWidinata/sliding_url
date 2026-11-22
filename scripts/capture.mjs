// Captures a poster screenshot and a short scrolling video loop of every live project.
// Usage: npm run capture            (all live projects)
//        npm run capture recallzy   (only the given slugs)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { projects } from '../src/projects.js'

const OUT = new URL('../public/posters/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const VIEW = { width: 1280, height: 800 }
const CLIP_SECONDS = 6

function findFfmpeg() {
  const root = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'ms-playwright')
    : join(homedir(), '.cache', 'ms-playwright')
  const dir = existsSync(root) && readdirSync(root).find((d) => d.startsWith('ffmpeg-'))
  if (!dir) return null
  const exe = readdirSync(join(root, dir)).find((f) => f.startsWith('ffmpeg'))
  return exe ? join(root, dir, exe) : null
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Per-site steps that run after the page loads, so the poster shows the app doing its job
// instead of an empty start screen.
const STEPS = {
  async trustped(page) {
    // analyse the site's own example store and film the result
    const input = page.locator('input').first()
    await input.pressSequentially('11111', { delay: 60 })
    const done = page.waitForResponse((r) => r.url().includes('/api/predict'), { timeout: 150000 })
    await page.getByRole('button', { name: /analisis/i }).click()
    await done
    await sleep(2000)
  },
  async acel_academy(page) {
    // everything is behind a login; use the demo account from .env.local (never committed)
    const { ACEL_DEMO_EMAIL: email, ACEL_DEMO_PASSWORD: password } = process.env
    if (!email || !password) {
      console.warn('\n  no ACEL_DEMO_EMAIL / ACEL_DEMO_PASSWORD in .env.local; capturing the login page')
      return
    }
    await page.fill('input[type=email]', email)
    await page.fill('input[type=password]', password)
    await page.click('button[type=submit]')
    await page.waitForURL(/dashboard/, { timeout: 60000 })
    await page.waitForLoadState('networkidle').catch(() => {})
    await sleep(2500)
  },
}

// load KEY=value pairs from .env.local (for demo logins) without adding a dependency
try {
  const envFile = new URL('../.env.local', import.meta.url)
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch {}

async function smoothScroll(page, seconds) {
  // Glide down over most of the clip, then ease back up, so the loop is roughly seamless.
  await page.evaluate(async (ms) => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    const dist = Math.min(max, innerHeight * 1.6)
    const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2
    const start = performance.now()
    await new Promise((done) => {
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms)
        const y = t < 0.65 ? ease(t / 0.65) * dist : ease(1 - (t - 0.65) / 0.35) * dist
        scrollTo(0, y)
        t < 1 ? requestAnimationFrame(step) : done()
      }
      requestAnimationFrame(step)
    })
  }, seconds * 1000)
}

async function captureOne(browser, project, ffmpeg) {
  const tmp = join(tmpdir(), `sliding_url_${project.slug}_${Date.now()}`)
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: VIEW },
  })
  const t0 = Date.now()
  const page = await context.newPage()
  try {
    await page.goto(project.url, { waitUntil: 'networkidle', timeout: 45000 })
  } catch {
    await page.goto(project.url, { waitUntil: 'load', timeout: 45000 })
  }
  await sleep(3500) // let intros/animations settle
  if (STEPS[project.slug]) await STEPS[project.slug](page)
  await page.screenshot({ path: join(OUT, `${project.slug}.jpg`), type: 'jpeg', quality: 82 })
  const startOffset = (Date.now() - t0) / 1000
  await smoothScroll(page, CLIP_SECONDS)
  await sleep(200)
  const video = page.video()
  await context.close()
  const raw = await video.path()

  if (ffmpeg) {
    const out = join(OUT, `${project.slug}.webm`)
    rmSync(out, { force: true })
    execFileSync(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-ss', startOffset.toFixed(2), '-i', raw, '-t', String(CLIP_SECONDS),
      '-vf', 'scale=960:-2', '-an', '-c:v', 'libvpx-vp9', '-b:v', '700k', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
      out,
    ])
  } else {
    renameSync(raw, join(OUT, `${project.slug}.webm`))
  }
  rmSync(tmp, { recursive: true, force: true })
}

const only = process.argv.slice(2)
const live = projects.filter((p) => p.url && (!only.length || only.includes(p.slug)))
mkdirSync(OUT, { recursive: true })
const ffmpeg = findFfmpeg()
if (!ffmpeg) console.warn('Playwright ffmpeg not found; videos will be untrimmed. Run: npx playwright install ffmpeg')

const browser = await chromium.launch()
for (const p of live) {
  process.stdout.write(`${p.slug.padEnd(16)} ${p.url} ... `)
  try {
    await captureOne(browser, p, ffmpeg)
    console.log('ok')
  } catch (err) {
    console.log('FAILED:', err.message.split('\n')[0])
  }
}
await browser.close()

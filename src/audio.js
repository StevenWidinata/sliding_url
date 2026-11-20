// Generative ambient soundtrack, synthesised live with the Web Audio API.
// Nothing is sampled or downloaded, so there is no copyright to worry about.
// Slow lush pad chords + a soft sub, random pentatonic "gallery bells", and a long synthetic reverb.

const STORE_KEY = 'sliding_url:muted'
const VOLUME = 0.32
const CHORD_SECONDS = 9

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

// D major colours: Dmaj9 → Bm9 → Gmaj7(#11) → A6sus
const PROGRESSION = [
  [50, 54, 57, 61, 64],
  [47, 50, 54, 57, 61],
  [43, 47, 50, 54, 61],
  [45, 50, 52, 54, 59],
]
const BELLS = [74, 76, 78, 81, 83, 86, 88] // D major pentatonic, upper register

function readMuted() {
  try {
    return localStorage.getItem(STORE_KEY) === '1'
  } catch {
    return false
  }
}

export function createAudio() {
  let ctx = null
  let master, music, sfx, padFilter
  let muted = readMuted()
  let started = false
  let timer = null
  let nextChord = 0
  let chordIndex = 0
  let nextBell = 0
  const listeners = []

  function impulse(seconds = 5, decay = 2.6) {
    const rate = ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    comp.connect(ctx.destination)

    master = ctx.createGain()
    master.gain.value = 0
    master.connect(comp)

    const reverb = ctx.createConvolver()
    reverb.buffer = impulse()
    const wet = ctx.createGain()
    wet.gain.value = 0.6
    reverb.connect(wet).connect(master)

    music = ctx.createGain()
    music.gain.value = 1
    const dry = ctx.createGain()
    dry.gain.value = 0.55
    music.connect(dry).connect(master)
    music.connect(reverb)

    sfx = ctx.createGain()
    sfx.gain.value = 0.9
    sfx.connect(master)
    const sfxVerb = ctx.createGain()
    sfxVerb.gain.value = 0.25
    sfx.connect(sfxVerb).connect(reverb)

    // the pad breathes: a very slow LFO on its low-pass filter
    padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 1100
    padFilter.Q.value = 0.4
    padFilter.connect(music)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.045
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 420
    lfo.connect(lfoDepth).connect(padFilter.frequency)
    lfo.start()
  }

  function padNote(hz, t0, dur, level) {
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(level, t0 + 3.2)
    env.gain.setValueAtTime(level, t0 + dur - 0.5)
    env.gain.linearRampToValueAtTime(0, t0 + dur + 4.5)
    env.connect(padFilter)
    for (const [type, cents, mix] of [['sine', -5, 1], ['triangle', 6, 0.45]]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = hz
      o.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = mix
      o.connect(g).connect(env)
      o.start(t0)
      o.stop(t0 + dur + 4.8)
    }
  }

  function chord(t0) {
    const notes = PROGRESSION[chordIndex % PROGRESSION.length]
    chordIndex++
    notes.forEach((m, i) => padNote(midiHz(m), t0 + i * 0.12, CHORD_SECONDS, 0.05 - i * 0.004))
    padNote(midiHz(notes[0] - 12), t0, CHORD_SECONDS, 0.06) // sub
  }

  function bell(t0, midi = BELLS[Math.floor(Math.random() * BELLS.length)], level = 0.03, out = music) {
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain()
    if (pan.pan) pan.pan.value = Math.random() * 1.2 - 0.6
    pan.connect(out)
    const hz = midiHz(midi)
    for (const [ratio, amp, decay] of [[1, 1, 2.8], [2.76, 0.32, 1.1], [5.4, 0.1, 0.5]]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz * ratio
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(level * amp, t0 + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
      o.connect(g).connect(pan)
      o.start(t0)
      o.stop(t0 + decay + 0.05)
    }
  }

  function schedule() {
    const horizon = ctx.currentTime + 2.5
    while (nextChord < horizon) {
      chord(nextChord)
      nextChord += CHORD_SECONDS
    }
    while (nextBell < horizon) {
      if (Math.random() < 0.8) bell(nextBell)
      nextBell += 1.4 + Math.random() * 2.8
    }
  }

  function fadeTo(v, seconds) {
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(v, now + seconds)
  }

  function startLoop() {
    if (timer) return
    nextChord = Math.max(nextChord, ctx.currentTime + 0.1)
    nextBell = Math.max(nextBell, ctx.currentTime + 2)
    schedule()
    timer = setInterval(schedule, 700)
  }

  function stopLoop() {
    clearInterval(timer)
    timer = null
  }

  async function play() {
    if (ctx.state !== 'running') await ctx.resume()
    startLoop()
    fadeTo(VOLUME, 3)
  }

  async function pause() {
    fadeTo(0, 0.6)
    await new Promise((r) => setTimeout(r, 650))
    if (muted || document.hidden) {
      stopLoop()
      await ctx.suspend()
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!started || muted) return
    document.hidden ? pause() : play()
  })

  const notify = () => listeners.forEach((fn) => fn(muted))

  return {
    /** Must be called from a user gesture (the Enter button). */
    start() {
      if (started) return
      started = true
      try {
        build()
      } catch {
        return
      }
      if (!muted) play()
      notify()
    },
    get muted() {
      return muted
    },
    toggle() {
      muted = !muted
      try {
        localStorage.setItem(STORE_KEY, muted ? '1' : '0')
      } catch {}
      if (ctx) muted ? pause() : play()
      else if (!muted) this.start()
      notify()
    },
    onChange(fn) {
      listeners.push(fn)
    },
    /** soft wooden tick when a new work slides into the centre */
    tick() {
      if (!ctx || muted || ctx.state !== 'running') return
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(1500, t)
      o.frequency.exponentialRampToValueAtTime(700, t + 0.05)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.025, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      o.connect(g).connect(sfx)
      o.start(t)
      o.stop(t + 0.1)
    },
    /** two-note chime for entering / leaving a work */
    chime(up = true) {
      if (!ctx || muted || ctx.state !== 'running') return
      const t = ctx.currentTime
      const [a, b] = up ? [81, 86] : [86, 81]
      bell(t, a, 0.05, sfx)
      bell(t + 0.11, b, 0.05, sfx)
    },
  }
}

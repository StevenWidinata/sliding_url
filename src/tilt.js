// Tilt-to-look: on phones, tilting the device turns your head a few degrees in the gallery.
const MAX_YAW = (6 * Math.PI) / 180
const MAX_PITCH = (4 * Math.PI) / 180
const clamp = (v, a) => Math.max(-a, Math.min(a, v))

export function createTilt({ gallery, reducedMotion }) {
  const supported =
    'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches && !reducedMotion
  if (!supported) return { request() {} }

  let base = null
  let targetYaw = 0
  let targetPitch = 0
  let yaw = 0
  let pitch = 0
  let running = false

  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0
    // left-right and front-back tilt, corrected for landscape
    let lr = e.gamma
    let fb = e.beta
    if (angle === 90) [lr, fb] = [e.beta, -e.gamma]
    else if (angle === -90 || angle === 270) [lr, fb] = [-e.beta, e.gamma]
    if (!base) base = { lr, fb }
    // slowly re-centre, so a new way of holding the phone becomes the new "straight ahead"
    base.lr += (lr - base.lr) * 0.008
    base.fb += (fb - base.fb) * 0.008
    targetYaw = clamp(((lr - base.lr) * Math.PI) / 180 * 0.5, MAX_YAW)
    targetPitch = clamp(((fb - base.fb) * Math.PI) / 180 * 0.35, MAX_PITCH)
  }

  function loop() {
    yaw += (targetYaw - yaw) * 0.12
    pitch += (targetPitch - pitch) * 0.12
    gallery.setTilt(-yaw, -pitch)
    requestAnimationFrame(loop)
  }

  function listen() {
    window.addEventListener('deviceorientation', onOrient)
    if (!running) {
      running = true
      loop()
    }
  }

  return {
    /** Call from a user gesture: iOS asks for motion permission here. */
    request() {
      const D = window.DeviceOrientationEvent
      if (typeof D.requestPermission === 'function') {
        D.requestPermission()
          .then((r) => r === 'granted' && listen())
          .catch(() => {})
      } else {
        listen()
      }
    },
  }
}

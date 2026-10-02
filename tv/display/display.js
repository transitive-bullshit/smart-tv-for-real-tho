// Read-only projection; no microphones, device commands or cloud credentials.
const title = document.getElementById('title')
const message = document.getElementById('message')
const status = document.getElementById('status')
const button = document.getElementById('dismiss')
let generation = 0
let pending
let retry
let expiry
let stopped = false
let lastActivity = 0
const hostname = window.location?.hostname ?? ''
const local =
  ['localhost', '127.0.0.1'].includes(hostname) ||
  hostname.endsWith('.localhost')
const query = new URLSearchParams(window.location?.search ?? '')
const mirror = local && query.has('mirror')
const preview = local && !mirror && query.has('preview')
const browserView = preview || mirror
function render(frame) {
  document.body.classList.toggle('page-hidden', document.hidden)
  if (browserView)
    status.textContent =
      frame.preview === false
        ? 'Live controller preview'
        : 'Local visual preview · no device commands'
  title.textContent = frame.title
  message.textContent = frame.message
  document.getElementById('detail').textContent = frame.detail ?? ''
  document.getElementById('source').textContent = frame.source ?? 'ROOM'
  document.getElementById('phase').textContent =
    {
      idle: 'ROOM LINK',
      listening: 'LISTENING',
      working: 'IN MOTION',
      speaking: 'VOICE LINK',
      success: 'ALL SET',
      error: 'ATTENTION'
    }[frame.visual] ?? 'ROOM LINK'
  document.getElementById('connection').textContent =
    preview && frame.preview !== false
      ? 'PREVIEW'
      : frame.mode === 'simulation'
        ? 'SIMULATION'
        : 'LIVE LINK'
  document.body.dataset.visual = [
    'idle',
    'listening',
    'working',
    'speaking',
    'success',
    'error'
  ].includes(frame.visual)
    ? frame.visual
    : 'idle'
  document.body.dataset.motion = ['full', 'subtle', 'static'].includes(
    frame.motion
  )
    ? frame.motion
    : 'full'
  window.roomVisuals?.update(frame)
  if (
    !browserView &&
    frame.visual !== 'idle' &&
    frame.updatedAt > lastActivity
  ) {
    lastActivity = frame.updatedAt
    clearTimeout(expiry)
    expiry = setTimeout(dismiss, 300000)
  }
}
document.addEventListener('visibilitychange', () =>
  document.body.classList.toggle('page-hidden', document.hidden)
)

function dismiss() {
  if (mirror) return
  if (stopped) return
  stopped = true
  generation++
  pending?.abort()
  clearTimeout(retry)
  clearTimeout(expiry)
  status.textContent = 'Close requested'
  if (preview) {
    document.getElementById('hud').style.opacity = '0'
    return
  }
  window.roomVisuals?.stop()
  window.close()
}
button.addEventListener('click', dismiss)
if (!browserView) button.focus()
window.addEventListener('keydown', (event) => {
  if (event.keyCode === 461 || event.key === 'Escape') {
    event.preventDefault()
    dismiss()
  }
})
window.addEventListener('pagehide', dismiss)
expiry = setTimeout(dismiss, 300000)

function connect(params) {
  if (stopped) return
  const run = ++generation
  pending?.abort()
  clearTimeout(retry)
  clearTimeout(expiry)
  expiry = setTimeout(dismiss, 300000)
  try {
    const url = new URL(
      mirror ? '/api/display/frame' : params.url,
      window.location?.href
    )
    const octets = url.hostname.split('.').map(Number)
    const privateIP =
      octets.length === 4 &&
      octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (octets[0] === 10 ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31))
    if (
      !mirror &&
      (!privateIP ||
        url.protocol !== 'http:' ||
        url.username ||
        url.password ||
        url.pathname !== '/display/state' ||
        url.search ||
        url.hash ||
        typeof params.token !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(params.token))
    ) {
      throw new Error('Invalid display connection')
    }
    async function poll() {
      if (stopped || run !== generation) return
      const controller = new AbortController()
      pending = controller
      const timeout = setTimeout(() => controller.abort(), 3000)
      let again = true
      try {
        const headers = {}
        if (!mirror) {
          headers.Authorization = 'Bearer ' + params.token
          if (window.roomVisuals?.diagnostics)
            headers['X-Room-Display'] = JSON.stringify(
              window.roomVisuals.diagnostics()
            )
        }
        const response = await fetch(url.href, {
          headers,
          credentials: 'omit',
          cache: 'no-store',
          signal: controller.signal
        })
        if (run !== generation || stopped) return
        if (response.status === 401) {
          again = false
          throw new Error('Relaunch from the controller to reconnect')
        }
        if (!response.ok) throw new Error('Controller unavailable')
        const frame = await response.json()
        if (run !== generation || stopped) return
        if (
          !['live', 'simulation'].includes(frame.mode) ||
          typeof frame.title !== 'string' ||
          typeof frame.message !== 'string' ||
          frame.title.length > 160 ||
          frame.message.length > 240
        ) {
          throw new Error('Invalid controller response')
        }
        if (!mirror && frame.dismiss === true) {
          dismiss()
          return
        }
        render(mirror ? { ...frame, preview: false } : frame)
        status.textContent = mirror
          ? 'Live reference preview · no device commands'
          : (frame.mode === 'simulation'
              ? 'SIMULATION · NO HARDWARE'
              : 'Live controller activity') + ' · Back to dismiss'
      } catch (err) {
        if (run !== generation || stopped) return
        window.roomVisuals?.update({
          visual: 'error',
          motion: 'static',
          inputLevel: 0,
          outputLevel: 0
        })
        document.body.dataset.visual = 'error'
        document.getElementById('detail').textContent = ''
        title.textContent = 'Controller unavailable'
        message.textContent = again
          ? 'Waiting to reconnect. Check the laptop.'
          : err.message
        status.textContent = mirror
          ? 'Controller offline · preview is stale'
          : 'No live confirmation · Back to dismiss'
      } finally {
        clearTimeout(timeout)
        if (again && run === generation && !stopped)
          retry = setTimeout(poll, 100)
      }
    }
    void poll()
  } catch {
    title.textContent = 'Connection needed'
    message.textContent = 'Launch this panel from the laptop controller.'
    status.textContent = 'No connection · Back to dismiss'
  }
}
// LG supplies launch parameters through these events; tokens are never packaged.
document.addEventListener('webOSLaunch', (event) => connect(event.detail))
document.addEventListener('webOSRelaunch', (event) => connect(event.detail))

if (browserView) {
  document.body.classList.add(mirror ? 'mirror' : 'preview')
  document.getElementById('preview-controls').hidden = !preview
  clearTimeout(expiry)
  window.roomHud = {
    mode: mirror ? 'mirror' : 'lab',
    render,
    show() {
      stopped = false
      document.getElementById('hud').style.opacity = '1'
    }
  }
  if (mirror) {
    const resize = () =>
      document.body.style.setProperty(
        '--mirror-scale',
        Math.min(
          1,
          (window.innerWidth - 24) / 800,
          (window.innerHeight - 24) / 400
        )
      )
    resize()
    window.addEventListener('resize', resize)
    connect({ url: '/api/display/frame' })
    clearTimeout(expiry)
  }
}

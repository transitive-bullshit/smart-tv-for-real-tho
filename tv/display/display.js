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
const preview =
  ['localhost', '127.0.0.1'].includes(window.location?.hostname) &&
  new URLSearchParams(window.location.search).has('preview')
const controls = document.getElementById('preview-controls')
const stateChoice = document.getElementById('preview-state')
const motionChoice = document.getElementById('preview-motion')
function render(frame) {
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
    preview && stateChoice.value !== 'live'
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
  if (frame.visual !== 'idle' && frame.updatedAt > lastActivity) {
    lastActivity = frame.updatedAt
    clearTimeout(expiry)
    expiry = setTimeout(dismiss, 300000)
  }
}
document.addEventListener('visibilitychange', () =>
  document.body.classList.toggle('page-hidden', document.hidden)
)

function dismiss() {
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
  window.close()
}
button.addEventListener('click', dismiss)
button.focus()
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
    const url = new URL(params.url)
    const octets = url.hostname.split('.').map(Number)
    const privateIP =
      octets.length === 4 &&
      octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (octets[0] === 10 ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31))
    if (
      !privateIP ||
      url.protocol !== 'http:' ||
      url.username ||
      url.password ||
      url.pathname !== '/display/state' ||
      url.search ||
      url.hash ||
      typeof params.token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(params.token)
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
        const response = await fetch(url.href, {
          headers: { Authorization: 'Bearer ' + params.token },
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
        if (frame.dismiss === true) {
          dismiss()
          return
        }
        render(frame)
        status.textContent =
          (frame.mode === 'simulation'
            ? 'SIMULATION · NO HARDWARE'
            : 'Live controller activity') + ' · Back to dismiss'
      } catch (err) {
        if (run !== generation || stopped) return
        document.body.dataset.visual = 'error'
        document.getElementById('detail').textContent = ''
        title.textContent = 'Controller unavailable'
        message.textContent = again
          ? 'Waiting to reconnect. Check the laptop.'
          : err.message
        status.textContent = 'No live confirmation · Back to dismiss'
      } finally {
        clearTimeout(timeout)
        if (again && run === generation && !stopped)
          retry = setTimeout(poll, 500)
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

if (preview) {
  document.body.classList.add('preview')
  controls.hidden = false
  clearTimeout(expiry)
  const examples = {
    idle: ['Your room. Your software.', 'Ready when you are.', ''],
    listening: ['I’m listening.', 'Say what you have in mind.', ''],
    working: ['Finding your video', 'On it.', 'Jamiroquai · Virtual Insanity'],
    speaking: ['Right here with you.', 'Playing Virtual Insanity.', ''],
    success: [
      'Playing your selection',
      'Done',
      'Jamiroquai · Virtual Insanity'
    ],
    error: ['Connection interrupted', 'Reconnect from the controller.', '']
  }
  async function previewFrame() {
    if (stopped) return
    try {
      if (stateChoice.value === 'live') {
        const response = await fetch('/api/display/frame', {
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('Unavailable')
        render(await response.json())
      } else {
        const [heading, text, detail] = examples[stateChoice.value]
        render({
          title: heading,
          message: text,
          detail,
          visual: stateChoice.value,
          motion: motionChoice.value,
          source: 'YOUTUBE',
          mode: 'simulation'
        })
      }
    } catch {
      render({
        title: 'Controller offline',
        message: 'Choose a preview state above.',
        visual: 'error',
        motion: 'static'
      })
    }
    retry = setTimeout(previewFrame, 500)
  }
  void previewFrame()
}

import { coverFrame, defaults, slides, smooth } from './model.js'
import { loadImage } from './load-image.js'
import { screenSaverGuard } from './guard.js'
import './style.css'

interface PlatformWindow extends Window {
  webOSSystem?: { launchParams?: string; platformBack?: () => void }
  PalmSystem?: { launchParams?: string; platformBack?: () => void }
}
const platform =
  (window as PlatformWindow).webOSSystem ??
  (window as PlatformWindow).PalmSystem
const native = Boolean(platform)
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T
const input = (id: string) => el<HTMLInputElement>(id)
const film = el<HTMLVideoElement>('film')
const modeSelect = el<HTMLSelectElement>('mode')
const chrome = el('chrome')
const events: { at: string; message: string }[] = []
const started = performance.now()
let cleanupGuard = () => {}
let current = 0
let elapsed = 0
let seconds: number = defaults.seconds
let zoom: number = defaults.zoom
let paused = false
let scrubbing = false
let mode = 'images'
let filmAttempt = 0
let controls = !native
let toastTimer: ReturnType<typeof setTimeout>
const focus = slides.map((slide) => ({
  x: slide.x as number,
  y: slide.y as number
}))
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const available: number[] = []
const photos = slides.map((slide) => {
  const img = new Image()
  img.alt = slide.title
  img.style.opacity = '0'
  img.style.width = slide.width + 'px'
  img.style.height = slide.height + 'px'
  el('photos').append(img)
  return img
})
function log(message: string) {
  events.push({ at: new Date().toISOString(), message })
  if (events.length > 100) events.shift()
}
function toast(message: string) {
  clearTimeout(toastTimer)
  el('toast').textContent = message
  el('toast').hidden = false
  toastTimer = setTimeout(() => {
    el('toast').hidden = true
  }, 5500)
}
function updateGuard() {
  cleanupGuard()
  cleanupGuard = () => {}
  const report = (message: string) => {
    el('guard-status').textContent = message
    log(message)
  }
  if (document.hidden) {
    report('Guard released · app hidden')
    return
  }
  if (mode !== 'images') {
    report('Guard off · full-screen video experiment')
    return
  }
  if (!input('guard').checked) {
    report('Guard off')
    return
  }
  cleanupGuard = screenSaverGuard(report)
}
function showControls(show: boolean) {
  controls = show
  chrome.hidden = !show
  el('reveal').hidden = show || native
  if (show && native) modeSelect.focus()
}
function syncLabels() {
  const slide = slides[current]!
  el('title').textContent = slide.title
  el('number').textContent = '0' + (current + 1) + ' / 02'
  el<HTMLSelectElement>('scene').value = String(current)
  input('x').value = String(focus[current]!.x)
  input('y').value = String(focus[current]!.y)
  input('seconds').value = String(seconds)
  input('zoom').value = String(zoom)
  el('seconds-value').textContent = seconds + 's'
  el('zoom-value').textContent = Math.round(zoom * 100) + '%'
  el('x-value').textContent = Math.round(focus[current]!.x * 100) + '%'
  el('y-value').textContent = Math.round(focus[current]!.y * 100) + '%'
  el('play').textContent = paused ? 'Play' : 'Pause'
}
function adjacentScene(direction = 1) {
  const indices = mode === 'video' ? slides.map((_, index) => index) : available
  return (
    indices[
      (indices.indexOf(current) + direction + indices.length) % indices.length
    ] ?? current
  )
}
function scene(index: number) {
  if (mode === 'images' && !available.includes(index)) return
  current = (index + slides.length) % slides.length
  elapsed = 0
  scrubbing = false
  if (mode === 'video') film.currentTime = current === 0 ? 0 : defaults.seconds
  syncLabels()
}
function stopFilm() {
  filmAttempt++
  film.pause()
}
async function resumeFilm() {
  const attempt = ++filmAttempt
  try {
    await film.play()
  } catch {
    if (
      attempt !== filmAttempt ||
      mode !== 'video' ||
      paused ||
      document.hidden
    )
      return
    paused = true
    toast('Film could not start. Press Play or run pnpm ambient:render.')
    log('Video play rejected')
    syncLabels()
  }
}
async function setMode(next: string) {
  mode = next === 'video' ? 'video' : 'images'
  modeSelect.value = mode
  film.hidden = mode !== 'video'
  el('photos').hidden = mode === 'video'
  el('image-controls').hidden = mode === 'video'
  el('focus').hidden = true
  el('mode-note').textContent =
    mode === 'video'
      ? 'Fixed render · 30s per scene · 8% zoom. Motion and dissolves are baked into the silent film.'
      : reduced.matches
        ? 'Reduced motion is on: still images and direct cuts.'
        : 'Cover framing · 3-second dissolves · original images bundled locally.'
  updateGuard()
  if (mode === 'video') {
    if (!film.getAttribute('src')) film.src = 'media/ambient-loop.mp4'
    if (!paused) await resumeFilm()
  } else stopFilm()
  log('Mode: ' + mode)
}
async function play() {
  paused = !paused
  if (scrubbing) {
    scrubbing = false
    if (elapsed >= seconds) elapsed = 0
  }
  if (mode === 'video') {
    if (paused) stopFilm()
    else await resumeFilm()
  }
  syncLabels()
}
function exit() {
  cleanupGuard()
  stopFilm()
  if (native) {
    if (platform?.platformBack) platform.platformBack()
    else window.close()
  } else if (document.fullscreenElement) void document.exitFullscreen()
  else showControls(!controls)
}
function launch(params: unknown) {
  if (!params || typeof params !== 'object') return
  const data = params as Record<string, unknown>
  if (typeof data.guard === 'boolean') input('guard').checked = data.guard
  if (data.mode === 'images' || data.mode === 'video') {
    paused = false
    syncLabels()
    void setMode(data.mode)
  }
}
function parseLaunch(raw?: string) {
  try {
    launch(JSON.parse(raw || '{}'))
  } catch {
    log('Ignored malformed launch parameters')
  }
}
modeSelect.onchange = () => {
  void setMode(modeSelect.value)
}
el<HTMLSelectElement>('scene').onchange = (event) =>
  scene(Number((event.target as HTMLSelectElement).value))
input('seconds').oninput = () => {
  seconds = Number(input('seconds').value)
  elapsed = 0
  syncLabels()
}
input('zoom').oninput = () => {
  zoom = Number(input('zoom').value)
  syncLabels()
}
for (const axis of ['x', 'y'] as const)
  input(axis).oninput = () => {
    focus[current]![axis] = Number(input(axis).value)
    syncLabels()
  }
input('progress').oninput = () => {
  paused = true
  scrubbing = true
  if (mode === 'video') {
    stopFilm()
    if (Number.isFinite(film.duration))
      film.currentTime =
        Number(input('progress').value) * Math.max(0, film.duration - 0.05)
  } else elapsed = Number(input('progress').value) * (seconds + defaults.fade)
  syncLabels()
}
input('guard').onchange = updateGuard
el('hide').onclick = () => showControls(false)
el('reveal').onclick = () => showControls(true)
el('previous').onclick = () => scene(adjacentScene(-1))
el('next').onclick = () => scene(adjacentScene())
el('play').onclick = () => {
  void play()
}
el('fullscreen').onclick = () => {
  showControls(false)
  if (!native && !document.fullscreenElement)
    void document.documentElement
      .requestFullscreen()
      .catch(() => toast('Full screen unavailable'))
}
el('export').onclick = () => {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          mode,
          guard: input('guard').checked,
          seconds,
          zoom,
          focus,
          elapsedSeconds: (performance.now() - started) / 1000,
          events
        },
        null,
        2
      )
    ],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ambient-diagnostics.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
film.addEventListener('error', () => {
  if (mode !== 'video') return
  paused = true
  syncLabels()
  toast('Film unavailable. Build it with pnpm ambient:render.')
  log('Video error: ' + film.error?.code)
})
document.addEventListener('visibilitychange', () => {
  el('lifecycle').textContent = document.hidden
    ? 'Hidden · animation suspended'
    : 'Visible · ' + new Date().toLocaleTimeString()
  log('Visibility: ' + !document.hidden)
  updateGuard()
  if (document.hidden) stopFilm()
  else if (mode === 'video' && !paused) void resumeFilm()
})
window.addEventListener('pagehide', () => {
  cleanupGuard()
  stopFilm()
})
document.addEventListener('webOSLaunch', (event) =>
  launch((event as CustomEvent).detail)
)
document.addEventListener('webOSRelaunch', (event) => {
  launch((event as CustomEvent<{ mode?: string; guard?: boolean }>).detail)
  showControls(false)
})
document.addEventListener('keydown', (event) => {
  if (event.keyCode === 461 || event.key === 'Escape') {
    event.preventDefault()
    exit()
    return
  }
  if (native && controls && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    const items = Array.from(
      el('panel').querySelectorAll<HTMLElement>(
        'button, select, input, summary'
      )
    ).filter((item) => item.getClientRects().length > 0)
    const index = items.indexOf(document.activeElement as HTMLElement)
    items[
      (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
        items.length
    ]?.focus()
    return
  }
  if (
    native &&
    controls &&
    event.target instanceof HTMLSelectElement &&
    ['ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    event.preventDefault()
    const select = event.target
    select.selectedIndex =
      (select.selectedIndex +
        (event.key === 'ArrowRight' ? 1 : -1) +
        select.options.length) %
      select.options.length
    select.dispatchEvent(new Event('change'))
    return
  }
  const editing = ['INPUT', 'SELECT', 'BUTTON', 'SUMMARY'].includes(
    (event.target as HTMLElement)?.tagName
  )
  if (editing && controls) return
  if (event.key.toLowerCase() === 'h' || (event.key === 'Enter' && !controls)) {
    event.preventDefault()
    showControls(!controls)
  } else if (event.key === ' ') {
    event.preventDefault()
    void play()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    scene(adjacentScene())
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    scene(adjacentScene(-1))
  }
})
reduced.addEventListener('change', () => {
  void setMode(mode)
})
function draw(index: number, time: number, opacity: number) {
  const slide = slides[index]!
  const point = focus[index]!
  const frame = coverFrame(
    slide.width,
    slide.height,
    innerWidth,
    innerHeight,
    point.x,
    point.y,
    reduced.matches ? 0 : zoom * smooth(time)
  )
  photos[index]!.style.transform =
    `translate3d(${frame.x}px,${frame.y}px,0) scale(${frame.width / slide.width})`
  photos[index]!.style.opacity = String(opacity)
  return frame
}
let last = performance.now()
function tick(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  if (!document.hidden && mode === 'images' && available.length > 0) {
    if (!paused) elapsed += dt
    if (!scrubbing && elapsed >= seconds + defaults.fade) {
      elapsed -= seconds
      current = adjacentScene()
      syncLabels()
    }
    const next = adjacentScene()
    const fade =
      scrubbing || reduced.matches
        ? 0
        : smooth((elapsed - seconds) / defaults.fade)
    photos[current]!.style.zIndex = '0'
    if (next !== current) photos[next]!.style.zIndex = '1'
    const frame = draw(current, elapsed / (seconds + defaults.fade), 1)
    if (next !== current)
      draw(
        next,
        Math.max(0, elapsed - seconds) / (seconds + defaults.fade),
        fade
      )
    el('focus').hidden = !input('show-focus').checked || !controls
    el('focus').style.left = frame.x + focus[current]!.x * frame.width + 'px'
    el('focus').style.top = frame.y + focus[current]!.y * frame.height + 'px'
    if (document.activeElement !== input('progress'))
      input('progress').value = String(elapsed / (seconds + defaults.fade))
  } else if (mode === 'video' && Number.isFinite(film.duration)) {
    if (document.activeElement !== input('progress'))
      input('progress').value = String(film.currentTime / film.duration)
    const next = film.currentTime < defaults.seconds ? 0 : 1
    if (next !== current) {
      current = next
      syncLabels()
    }
  }
  requestAnimationFrame(tick)
}
el('controller').hidden = native
el('fullscreen').textContent = native ? 'Clean view' : 'Full screen'
syncLabels()
showControls(controls)
void setMode(new URLSearchParams(location.search).get('mode') ?? 'images')
parseLaunch(platform?.launchParams)
photos.forEach((photo, index) => {
  void loadImage(photo, 'media/' + slides[index]!.file)
    .then(({ width, height }) => {
      available.push(index)
      available.sort((a, b) => a - b)
      if (available.length === 1) {
        current = index
        elapsed = 0
        syncLabels()
      }
      log(slides[index]!.file + ' loaded: ' + width + '×' + height)
      el('image-status').textContent =
        available.length + '/' + slides.length + ' images loaded'
    })
    .catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Image loading failed'
      log(message)
      el('image-status').textContent = message
      toast('Could not load ' + slides[index]!.title + '. See diagnostics.')
    })
})
requestAnimationFrame(tick)
if (native) toast('Room Ambient · Back to leave · OK for controls')

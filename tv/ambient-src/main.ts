import { coverFrame, defaults, slides, smooth } from './model.js'
import { PhotoPool } from './photo-pool.js'
import { AmbientPlaylist } from './playlist.js'
import { screenSaverGuard } from './guard.js'
import './style.css'

interface PlatformWindow extends Window {
  webOSSystem?: { launchParams?: string }
  PalmSystem?: { launchParams?: string }
}
const platform =
  (window as PlatformWindow).webOSSystem ??
  (window as PlatformWindow).PalmSystem
const native = Boolean(platform)
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T
const input = (id: string) => el<HTMLInputElement>(id)
const chrome = el('chrome')
const events: { at: string; message: string }[] = []
const started = performance.now()
let cleanupGuard = () => {}
let elapsed = 0
let seconds: number = defaults.seconds
let zoom: number = defaults.zoom
let paused = false
let scrubbing = false
let controls = !native
let toastTimer: ReturnType<typeof setTimeout>
const focus = slides.map((slide) => ({
  x: slide.x as number,
  y: slide.y as number
}))
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const available: number[] = slides.map((_, index) => index)
const playlist = new AmbientPlaylist(available)
let current = playlist.current!
const verified = new Set<number>()
let requestedScene: number | undefined
let requestedDirection: -1 | 0 | 1 = 0
const photos = new PhotoPool(
  el('photos'),
  (index) => {
    verified.add(index)
    log(slides[index]!.file + ' loaded')
    if (requestedScene === index) scene(index, requestedDirection)
    updateImageStatus()
  },
  (index, error) => {
    const position = available.indexOf(index)
    if (position >= 0) available.splice(position, 1)
    playlist.remove(index)
    const message =
      error instanceof Error ? error.message : 'Image loading failed'
    log(message)
    toast('Could not load ' + slides[index]!.title + '. See diagnostics.')
    el<HTMLSelectElement>('scene').options[index]!.disabled = true
    if (requestedScene === index) requestedScene = undefined
    if (current === index && available.length) {
      current = playlist.current!
      elapsed = 0
    }
    syncLabels()
    preparePhotos()
    updateImageStatus()
  }
)
function updateImageStatus() {
  el('image-status').textContent =
    verified.size +
    '/' +
    slides.length +
    ' images visited · ' +
    (slides.length - available.length) +
    ' unavailable'
}
function preparePhotos() {
  photos.retain(
    available.length
      ? [
          current,
          adjacentScene(),
          ...(requestedScene === undefined ? [] : [requestedScene])
        ]
      : []
  )
}
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
  if (show && native) el('scene').focus()
  else if (!show && document.activeElement instanceof HTMLElement)
    document.activeElement.blur()
}
function syncLabels() {
  const slide = slides[current]!
  el('title').textContent = slide.title
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
function adjacentScene(direction: -1 | 1 = 1) {
  return playlist.peek(direction) ?? current
}
function scene(index: number, direction: -1 | 0 | 1 = 0) {
  if (!available.includes(index)) return
  requestedScene = index
  requestedDirection = direction
  preparePhotos()
  if (!photos.get(index)) return
  requestedScene = undefined
  if (direction && playlist.peek(direction) === index) playlist.move(direction)
  else playlist.select(index)
  current = playlist.current!
  elapsed = 0
  scrubbing = false
  syncLabels()
  preparePhotos()
}
function updateMotionNote() {
  el('motion-note').textContent = reduced.matches
    ? 'Reduced motion is on: still images and direct cuts.'
    : 'Shuffled playlist · cover framing · 3-second dissolves.'
}
function play() {
  paused = !paused
  if (scrubbing) {
    scrubbing = false
    if (elapsed >= seconds) elapsed = 0
  }
  syncLabels()
}
function back() {
  if (controls) {
    showControls(false)
    return
  }
  if (native) {
    cleanupGuard()
    // platformBack() asks for confirmation; close the packaged app directly.
    window.close()
  } else if (document.fullscreenElement) void document.exitFullscreen()
  else showControls(true)
}
function launch(params: unknown) {
  if (!params || typeof params !== 'object') return
  const data = params as Record<string, unknown>
  if (typeof data.guard === 'boolean') input('guard').checked = data.guard
  paused = false
  syncLabels()
  updateGuard()
}
function parseLaunch(raw?: string) {
  try {
    launch(JSON.parse(raw || '{}'))
  } catch {
    log('Ignored malformed launch parameters')
  }
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
  elapsed = Number(input('progress').value) * (seconds + defaults.fade)
  syncLabels()
}
input('guard').onchange = updateGuard
el('hide').onclick = () => showControls(false)
el('reveal').onclick = () => showControls(true)
el('previous').onclick = () => scene(adjacentScene(-1), -1)
el('next').onclick = () => scene(adjacentScene(), 1)
el('play').onclick = () => {
  play()
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
document.addEventListener('visibilitychange', () => {
  el('lifecycle').textContent = document.hidden
    ? 'Hidden · animation suspended'
    : 'Visible · ' + new Date().toLocaleTimeString()
  log('Visibility: ' + !document.hidden)
  updateGuard()
})
window.addEventListener('pagehide', () => {
  cleanupGuard()
  photos.retain([])
})
document.addEventListener('webOSLaunch', (event) =>
  launch((event as CustomEvent).detail)
)
document.addEventListener('webOSRelaunch', (event) => {
  launch((event as CustomEvent<{ guard?: boolean }>).detail)
  showControls(false)
})
document.addEventListener('keydown', (event) => {
  if (event.keyCode === 461 || event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (!event.repeat) back()
    return
  }
  if (
    controls &&
    event.key === 'Enter' &&
    event.target instanceof HTMLInputElement &&
    event.target.type === 'checkbox'
  ) {
    event.preventDefault()
    // Remote OK sends Enter; a native HTML checkbox otherwise only toggles on Space.
    // Synthetic click also dispatches input/change and preserves pointer behavior.
    event.target.click()
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
    play()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    scene(adjacentScene(), 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    scene(adjacentScene(-1), -1)
  }
})
reduced.addEventListener('change', updateMotionNote)
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
  const image = photos.get(index)
  if (!image) return frame
  image.hidden = false
  image.style.transform = `translate3d(${frame.x}px,${frame.y}px,0) scale(${frame.width / slide.width})`
  image.style.opacity = String(opacity)
  return frame
}
let last = performance.now()
function tick(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  if (!document.hidden && photos.get(current)) {
    if (!paused) elapsed += dt
    if (!photos.get(adjacentScene()) && !scrubbing)
      elapsed = Math.min(elapsed, seconds)
    if (
      !scrubbing &&
      elapsed >= seconds + defaults.fade &&
      requestedScene === undefined
    ) {
      elapsed -= seconds
      playlist.move()
      current = playlist.current!
      syncLabels()
      preparePhotos()
    }
    const next = adjacentScene()
    const fade =
      scrubbing || reduced.matches
        ? 0
        : smooth((elapsed - seconds) / defaults.fade)
    photos.get(current)!.style.zIndex = '0'
    const nextPhoto = photos.get(next)
    if (next !== current && nextPhoto) nextPhoto.style.zIndex = '1'
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
  }
  requestAnimationFrame(tick)
}
slides.forEach((slide, index) => {
  el<HTMLSelectElement>('scene').add(new Option(slide.title, String(index)))
})
el('controller').hidden = native
el('fullscreen').textContent = native ? 'Clean view' : 'Full screen'
syncLabels()
showControls(controls)
updateMotionNote()
parseLaunch(platform?.launchParams)
preparePhotos()
requestAnimationFrame(tick)
if (native) toast('Room Ambient · Back to leave · OK for controls')

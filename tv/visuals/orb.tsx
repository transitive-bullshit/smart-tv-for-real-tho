import { useEffect, useRef } from 'react'
import { MODE_FRAMES, paintFrame, resolvePreset } from 'thinking-orbs/engine'
import { scaleCounts, scaleRadii } from 'thinking-orbs'
import type { OrbState } from 'thinking-orbs'

const metrics = new WeakMap<
  HTMLCanvasElement,
  { frames: number; fps: number; paused: boolean }
>()
export function readOrbMetrics(element: HTMLCanvasElement | null) {
  return element ? metrics.get(element) : undefined
}

// Keep the upstream geometry and painter; draw at TV resolution instead of stretching a 64px bitmap.
export function Orb({
  pattern,
  size,
  speed,
  dots,
  dotSize,
  color,
  paused,
  level
}: {
  pattern: OrbState
  size: number
  speed: number
  dots: number
  dotSize: number
  color: string
  paused: boolean
  level: () => number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const clock = useRef(0.6)
  const readLevel = useRef(level)
  useEffect(() => {
    readLevel.current = level
  }, [level])
  useEffect(() => {
    const element = canvas.current!
    const ctx = element.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    element.width = Math.round(size * dpr)
    element.height = Math.round(size * dpr)
    const preset = resolvePreset(pattern, 64)
    const opts = scaleRadii(scaleCounts(preset.opts, dots), dotSize)
    const tint = {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16)
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let last = 0
    let visible = true
    let envelope = 0
    const stats = { frames: 0, fps: 0, paused: true }
    metrics.set(element, stats)
    let sampledAt = performance.now()
    let sampledFrames = 0
    function draw(now: number) {
      frame = 0
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0)
      last = now
      const still = paused || reduce.matches
      stats.paused = still
      if (!still) clock.current += dt * speed * preset.speed
      envelope +=
        ((still ? 0 : readLevel.current()) - envelope) *
        (1 - Math.exp(-dt * 14))
      const pulse = 1 + envelope * 0.045
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, size, size)
      ctx!.translate(size / 2, size / 2)
      ctx!.scale(pulse, pulse)
      ctx!.translate(-size / 2, -size / 2)
      paintFrame(
        ctx!,
        MODE_FRAMES[preset.mode](size, clock.current, opts),
        true,
        tint
      )
      stats.frames++
      if (!still && visible && !document.hidden)
        frame = requestAnimationFrame(draw)
    }
    function refresh() {
      cancelAnimationFrame(frame)
      frame = 0
      last = 0
      if (!document.hidden && visible) draw(performance.now())
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      refresh()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', refresh)
    reduce.addEventListener('change', refresh)
    refresh()
    // webOS can become visible between mounting and listener registration.
    // Recover a stopped loop without depending on a visibility event arriving.
    const watchdog = setInterval(() => {
      const now = performance.now()
      stats.fps = Math.round(
        ((stats.frames - sampledFrames) * 1000) / (now - sampledAt)
      )
      sampledFrames = stats.frames
      sampledAt = now
      stats.paused = paused || reduce.matches || document.hidden || !visible
      if (!frame && !stats.paused) refresh()
    }, 1000)
    return () => {
      clearInterval(watchdog)
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      reduce.removeEventListener('change', refresh)
    }
  }, [pattern, size, speed, dots, dotSize, color, paused])
  return (
    <canvas
      ref={canvas}
      style={{ width: size, height: size }}
      aria-hidden='true'
    />
  )
}

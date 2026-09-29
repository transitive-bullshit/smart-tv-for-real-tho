import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { VoiceBeam } from 'voice-glow'
import { ThinkingOrb } from 'thinking-orbs'
import type { DisplayFrame, MotionMode } from '../../src/display.js'
import {
  assistantStates,
  defaultVisualOptions,
  orbPatterns,
  resolveOrb,
  styleNames,
  visualOptionsSchema,
  visualStyles
} from '../../src/visual-options.js'
import type { AssistantState, VisualOptions } from '../../src/visual-options.js'
import { Orb } from './orb.js'
import './visuals.css'

type Frame = Partial<DisplayFrame> & { preview?: boolean }
declare global {
  interface Window {
    roomVisuals?: { update: (frame: Frame) => void; stop: () => void }
    roomHud?: { render: (frame: Frame) => void; show: () => void }
  }
}
const preview =
  ['localhost', '127.0.0.1'].includes(location.hostname) &&
  new URLSearchParams(location.search).has('preview')
const preferenceKey = 'smart-tv.visual-lab.v1'
let frame: Frame = { visual: 'idle', motion: 'full' }
let audio = { input: 0, output: 0, at: 0 }
let revision = ''
const listeners = new Set<() => void>()
window.roomVisuals = {
  update(next) {
    audio = {
      input: next.inputLevel ?? 0,
      output: next.outputLevel ?? 0,
      at: performance.now()
    }
    const {
      inputLevel: _input,
      outputLevel: _output,
      updatedAt: _time,
      ...presentation
    } = next
    const key = JSON.stringify(presentation)
    if (key !== revision) {
      revision = key
      frame = next
      listeners.forEach((listener) => listener())
    }
  },
  stop() {
    root.unmount()
  }
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const getFrame = () => frame
const labels = {
  idle: 'Idle',
  listening: 'Listening',
  working: 'Thinking',
  speaking: 'Speaking',
  success: 'Complete',
  error: 'Error'
}
const examples: Record<AssistantState, [string, string, string]> = {
  idle: ['Your room. Your software.', 'Ready when you are.', ''],
  listening: ['I’m listening.', 'Say what you have in mind.', ''],
  working: ['Finding your video', 'On it.', 'Jamiroquai · Virtual Insanity'],
  speaking: [
    'Playing your selection',
    'Here you go.',
    'Jamiroquai · Virtual Insanity'
  ],
  success: ['You’re all set.', 'Enjoy.', 'Jamiroquai · Virtual Insanity'],
  error: ['Connection interrupted', 'Reconnect from the controller.', '']
}
const patternDescriptions = {
  working: 'Tilted orbits',
  searching: 'Scanning globe',
  solving: 'Turning bands',
  listening: 'Latitude waves',
  connecting: 'Constellation',
  weaving: 'Braided strands',
  composing: 'Flowing ribbons',
  breathing: 'Soft ring',
  shaping: 'Morphing outline'
}
function readPreferences(): VisualOptions {
  try {
    const saved = visualOptionsSchema.safeParse(
      JSON.parse(localStorage.getItem(preferenceKey) ?? 'null')
    )
    return saved.success ? saved.data : structuredClone(defaultVisualOptions)
  } catch {
    return structuredClone(defaultVisualOptions)
  }
}
function Range({
  label,
  value,
  min,
  max,
  step = 0.05,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className='lab-range'>
      <span>
        {label}
        <output>{Number(value.toFixed(2))}</output>
      </span>
      <input
        type='range'
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
function App() {
  const live = useSyncExternalStore(subscribe, getFrame)
  const [options, setOptions] = useState<VisualOptions>(() =>
    preview ? readPreferences() : defaultVisualOptions
  )
  const [scenario, setScenario] = useState<AssistantState | 'live'>('listening')
  const [motion, setMotion] = useState<MotionMode>('full')
  const [sound, setSound] = useState<'demo' | 'manual'>('demo')
  const [manualLevel, setManualLevel] = useState(0.45)
  const [cycling, setCycling] = useState(false)
  const [scene, setScene] = useState('cinema')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [reduced, setReduced] = useState(
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const selected = preview ? options : (live.appearance ?? defaultVisualOptions)
  const visual = live.visual ?? 'idle'
  const activeMotion = preview ? motion : (live.motion ?? 'full')
  const paused = hidden || reduced || activeMotion === 'static'
  const style = visualStyles[selected.style]
  const pattern = resolveOrb(selected, visual)
  const signal = useRef({ scenario, visual, sound, manualLevel, paused })
  useEffect(() => {
    signal.current = { scenario, visual, sound, manualLevel, paused }
  }, [scenario, visual, sound, manualLevel, paused])
  const readLevel = useCallback(() => {
    const current = signal.current
    if (current.paused || !['listening', 'speaking'].includes(current.visual))
      return 0
    if (!preview || current.scenario === 'live') {
      if (performance.now() - audio.at > 750) return 0
      return current.visual === 'listening' ? audio.input : audio.output
    }
    if (current.sound === 'manual') return current.manualLevel
    const t = performance.now() / 1000
    const syllables = Math.pow(
      Math.max(0, Math.sin(t * 7.2) * 0.45 + Math.sin(t * 12.7) * 0.25 + 0.3),
      1.5
    )
    const phrase = Math.max(0, Math.sin(t * 1.3))
    return Math.min(1, syllables * phrase * 0.8)
  }, [])
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => setReduced(media.matches)
    document.addEventListener('visibilitychange', visibility)
    media.addEventListener('change', preference)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      media.removeEventListener('change', preference)
    }
  }, [])
  useEffect(() => {
    const core = document.getElementById('orb-root')!
    core.style.width =
      core.style.height =
      core.style.flexBasis =
        `${selected.size}px`
    document.body.style.setProperty(
      '--accent',
      visual === 'error' ? '#ffbd84' : style.color
    )
  }, [selected.size, style.color, visual])
  useEffect(() => {
    if (!preview) return
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(options))
    } catch {
      /* Preview remains usable without storage. */
    }
  }, [options])
  useEffect(() => {
    if (!preview) return
    document.body.dataset.scene = scene
    document.body.dataset.motion = motion
  }, [scene, motion])
  useEffect(() => {
    if (!preview) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const abort = new AbortController()
    async function refresh() {
      if (scenario === 'live') {
        try {
          const response = await fetch('/api/display/frame', {
            cache: 'no-store',
            signal: abort.signal
          })
          if (!response.ok) throw new Error('Controller unavailable')
          const next = (await response.json()) as DisplayFrame
          if (!stopped)
            window.roomHud?.render({ ...next, motion, preview: false })
        } catch {
          if (!stopped)
            window.roomHud?.render({
              visual: 'error',
              motion,
              title: 'Controller offline',
              message: 'Select a preview state to keep exploring.',
              preview: false
            })
        }
        if (!stopped)
          timer = setTimeout(() => {
            void refresh()
          }, 100)
      } else {
        const [title, message, detail] = examples[scenario]
        window.roomHud?.render({
          visual: scenario,
          motion,
          title,
          message,
          detail,
          source: 'YOUTUBE',
          mode: 'simulation',
          preview: true
        })
      }
    }
    void refresh()
    return () => {
      stopped = true
      clearTimeout(timer)
      abort.abort()
    }
  }, [scenario, motion])
  useEffect(() => {
    if (!cycling) return
    const sequence: AssistantState[] = [
      'idle',
      'listening',
      'working',
      'speaking',
      'success'
    ]
    let index = 0
    const timer = setInterval(() => {
      index = (index + 1) % sequence.length
    }, 3500)
    return () => clearInterval(timer)
  }, [cycling])
  function change(patch: Partial<VisualOptions>) {
    setSaved('')
    setOptions((current) => ({ ...current, ...patch }))
  }
  async function saveToTV() {
    setSaving(true)
    try {
      const response = await fetch('/api/display/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      if (!response.ok) throw new Error('Could not save. Check the controller.')
      setSaved('Saved for the TV. Applies to the new panel; no launch needed.')
    } catch (err) {
      setSaved(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      {createPortal(
        <Orb
          pattern={pattern}
          size={selected.size}
          speed={
            selected.speed *
            style.speed *
            (activeMotion === 'subtle' ? 0.45 : 1)
          }
          dots={selected.dots * style.dots}
          dotSize={selected.dotSize}
          color={visual === 'error' ? '#ffbd84' : style.color}
          paused={paused}
          level={readLevel}
        />,
        document.getElementById('orb-root')!
      )}
      {createPortal(
        <VoiceBeam
          theme='dark'
          colorVariant={style.beam}
          level={readLevel}
          processing={visual === 'working'}
          processingLevel={0.24}
          processingDuration={1.8}
          processingTravel={0.8}
          strength={selected.glow}
          active={selected.glow > 0}
          paused={paused}
          idle={0.025}
          sensitivity={1}
          attack={0.12}
          release={0.3}
          reach={0.8}
          bend={14}
          scale={0.8}
          distortion={0}
          bandStrength={0.3}
          bandAberration={0.1}
          glowHeight={0.65}
          bloomOpacity={0.65}
          staticColors
          borderRadius={20}
          style={{ width: '100%', height: '100%' }}
        >
          <div className='beam-surface' />
        </VoiceBeam>,
        document.getElementById('glow-root')!
      )}
      {preview &&
        createPortal(
          <>
            <header className='lab-header'>
              <a href='/'>S / TV</a>
              <span>VISUAL LAB</span>
              <p>A presence for your room.</p>
              <small>Local preview · your TV stays as it is.</small>
              <button type='button' onClick={() => window.roomHud?.show()}>
                Show panel
              </button>
            </header>
            <aside className='lab-sidebar' aria-label='Visual playground'>
              <div className='lab-title'>
                <div>
                  <p className='lab-eyebrow'>THINKING ORBS + VOICE GLOW</p>
                  <h2>Make it feel like yours.</h2>
                </div>
                <a
                  href='https://libraries.dev/orbs'
                  target='_blank'
                  rel='noreferrer'
                  aria-label='Thinking Orbs source'
                >
                  ↗
                </a>
              </div>
              <section>
                <h3>
                  01 <span>Design direction</span>
                </h3>
                <div className='style-grid'>
                  {styleNames.map((name) => (
                    <button
                      key={name}
                      type='button'
                      className='style-card'
                      aria-pressed={options.style === name}
                      onClick={() => change({ style: name })}
                    >
                      <i style={{ background: visualStyles[name].color }} />
                      <strong>{visualStyles[name].name}</strong>
                      <small>{visualStyles[name].description}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3>
                  02 <span>Orb pattern</span>
                  <button
                    type='button'
                    className='lab-text-button'
                    aria-pressed={options.pattern === 'auto'}
                    onClick={() => change({ pattern: 'auto' })}
                  >
                    Follow state
                  </button>
                </h3>
                <p className='lab-help'>
                  {options.pattern === 'auto'
                    ? `Following state → ${pattern}`
                    : `Pinned to ${pattern} across all states.`}
                </p>
                <div className='pattern-grid'>
                  {orbPatterns.map((name) => (
                    <button
                      key={name}
                      type='button'
                      className='pattern-card'
                      aria-pressed={options.pattern === name}
                      onClick={() => change({ pattern: name })}
                    >
                      <ThinkingOrb
                        state={name}
                        size={64}
                        theme='dark'
                        color={style.color}
                        paused={paused}
                        speed={0.65}
                      />
                      <strong>{name}</strong>
                      <small>{patternDescriptions[name]}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3>
                  03 <span>Assistant state</span>
                  <button
                    type='button'
                    className='lab-text-button'
                    aria-pressed={cycling}
                    onClick={() => setCycling(!cycling)}
                  >
                    {cycling ? 'Stop sequence' : 'Play sequence'}
                  </button>
                </h3>
                <div className='state-grid'>
                  {assistantStates.map((name) => (
                    <button
                      key={name}
                      type='button'
                      aria-pressed={scenario === name}
                      onClick={() => {
                        setCycling(false)
                        setScenario(name)
                      }}
                    >
                      {labels[name]}
                    </button>
                  ))}
                  <button
                    type='button'
                    aria-pressed={scenario === 'live'}
                    onClick={() => {
                      setCycling(false)
                      setScenario('live')
                    }}
                  >
                    Live session
                  </button>
                </div>
                <p className='lab-help'>
                  {scenario === 'live'
                    ? 'Follows your existing controller voice session. No new microphone or AI connection.'
                    : 'Preview states and audio are simulated. No device commands.'}
                </p>
              </section>
              <section className='lab-tuning'>
                <h3>
                  04 <span>Light & motion</span>
                </h3>
                <Range
                  label='Glow strength'
                  value={options.glow}
                  min={0}
                  max={0.8}
                  onChange={(glow) => change({ glow })}
                />
                <Range
                  label='Orb size'
                  value={options.size}
                  min={80}
                  max={200}
                  step={4}
                  onChange={(size) => change({ size })}
                />
                <Range
                  label='Motion speed'
                  value={options.speed}
                  min={0.2}
                  max={2}
                  onChange={(speed) => change({ speed })}
                />
                <label className='lab-select'>
                  Audio source
                  <select
                    value={sound}
                    disabled={scenario === 'live'}
                    onChange={(event) =>
                      setSound(event.target.value as 'demo' | 'manual')
                    }
                  >
                    <option value='demo'>Demo speech envelope</option>
                    <option value='manual'>Manual level</option>
                  </select>
                </label>
                {sound === 'manual' && scenario !== 'live' && (
                  <Range
                    label='Voice level'
                    value={manualLevel}
                    min={0}
                    max={1}
                    onChange={setManualLevel}
                  />
                )}
                <label className='lab-select'>
                  Motion
                  <select
                    value={motion}
                    onChange={(event) =>
                      setMotion(event.target.value as MotionMode)
                    }
                  >
                    <option value='full'>Full</option>
                    <option value='subtle'>Subtle</option>
                    <option value='static'>Paused / static</option>
                  </select>
                </label>
                {reduced && (
                  <p className='lab-help'>
                    System reduced motion is on; animation is paused.
                  </p>
                )}
                <label className='lab-select'>
                  Backdrop
                  <select
                    value={scene}
                    onChange={(event) => setScene(event.target.value)}
                  >
                    <option value='cinema'>Cinema · dark</option>
                    <option value='daylight'>Daylight · bright</option>
                    <option value='grid'>Transparency grid</option>
                  </select>
                </label>
              </section>
              <details>
                <summary>Particle tuning & state mapping</summary>
                <Range
                  label='Particle density'
                  value={options.dots}
                  min={0.4}
                  max={1.8}
                  onChange={(dots) => change({ dots })}
                />
                <Range
                  label='Particle weight'
                  value={options.dotSize}
                  min={0.6}
                  max={1.8}
                  onChange={(dotSize) => change({ dotSize })}
                />
                {assistantStates.map((state) => (
                  <label className='lab-select' key={state}>
                    {labels[state]}
                    <select
                      value={options.mapping[state]}
                      onChange={(event) =>
                        change({
                          mapping: {
                            ...options.mapping,
                            [state]: event.target.value
                          }
                        })
                      }
                    >
                      {orbPatterns.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <p className='lab-help'>
                  Mappings apply when “Follow state” is selected.
                </p>
              </details>
              <footer className='lab-footer'>
                <button
                  type='button'
                  className='lab-primary'
                  disabled={saving}
                  onClick={() => {
                    void saveToTV()
                  }}
                >
                  {saving ? 'Saving…' : 'Use this look on TV'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setOptions(structuredClone(defaultVisualOptions))
                    setMotion('full')
                    setSound('demo')
                  }}
                >
                  Reset look
                </button>
                <p role='status'>
                  {saved || 'Your local choices are remembered automatically.'}
                </p>
                <small>
                  Thinking Orbs · Jakub Antalik + Alexandr Brinza
                  <br />
                  Voice Glow · Jakub Antalik · MIT
                </small>
              </footer>
            </aside>
            <div className='lab-stage-label'>
              <span>
                {visualStyles[options.style].name} / {pattern}
              </span>
              <span>
                {scenario === 'live' ? 'LIVE CONTROLLER' : 'PREVIEW'} ·{' '}
                {reduced || motion === 'static' ? 'STATIC' : 'ANIMATED'}
              </span>
            </div>
          </>,
          document.getElementById('preview-controls')!
        )}
    </>
  )
}
const root = createRoot(document.getElementById('visual-root')!)
root.render(<App />)

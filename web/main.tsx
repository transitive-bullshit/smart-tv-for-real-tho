import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type {
  Candidate,
  Config,
  Result,
  RoomState,
  ToolName,
  Trace
} from '../src/contracts.js'
import { api } from './api.js'
import { Voice } from './voice.js'
import { Journeys } from './journeys.js'
import { HudControls } from './hud-controls.js'
import type { DisplayFrame, MotionMode } from '../src/display.js'
import './style.css'

interface Status {
  gameAliases: string[]
  config: Config
  credentials: { openai: boolean; youtube: boolean }
  pairing: Record<string, boolean>
  state: RoomState
  traces: Trace[]
  candidates: Candidate[]
  boot: unknown[]
  display?: {
    enabled: boolean
    autoRestore: boolean
    motion: MotionMode
    frame: DisplayFrame
  }
}
interface Catalog {
  apps: { id: string; title: string }[]
  inputs: { id: string; label: string; appId: string }[]
  info: unknown
  warnings?: string[]
}
interface XboxCatalog {
  consoles: { id: string; name: string }[]
  games: { id: string; name: string }[]
}
function App() {
  const [status, setStatus] = useState<Status>()
  const [config, setConfig] = useState<Config>()
  const [message, setMessage] = useState('Connecting to the local controller…')
  const [voiceStatus, setVoiceStatus] = useState('Voice disconnected')
  const [voiceConnected, setVoiceConnected] = useState(false)
  const [actionError, setActionError] = useState('')
  const [openMic, setOpenMic] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>()
  const [xbox, setXbox] = useState<XboxCatalog>()
  const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')
  const [version, setVersion] = useState('')
  const [code, setCode] = useState('')
  const [signInUrl, setSignInUrl] = useState('')
  const [videoId, setVideoId] = useState('')
  const [key, setKey] = useState('')
  const [ytKey, setYtKey] = useState('')
  const [pending, setPending] = useState(0)
  const [overlayResult, setOverlayResult] = useState<Result>()
  const [clock, setClock] = useState(() => Date.now())
  const voice = useRef<Voice | null>(null)
  const display = location.pathname === '/display'
  const refresh = async () => {
    const next = await api<Status>('status')
    setStatus(next)
    setMessage((old) =>
      old === 'Connecting to the local controller…'
        ? 'Controller ready. Connect your devices in Room setup.'
        : old
    )
    setClock(Date.now())
    setConfig((old) => old ?? next.config)
  }
  useEffect(() => {
    voice.current = new Voice(setVoiceStatus, () => setVoiceConnected(false))
    const initial = setTimeout(() => {
      void refresh().catch((err) => setMessage(String(err)))
    }, 0)
    const timer = setInterval(() => {
      void refresh().catch(() =>
        setMessage('Controller unavailable. Restart pnpm dev.')
      )
    }, 1500)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
      voice.current?.close()
    }
  }, [])
  async function run(fn: () => Promise<unknown>) {
    setPending((n) => n + 1)
    setActionError('')
    try {
      await fn()
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
      setMessage(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setPending((n) => n - 1)
    }
  }
  async function tool(name: ToolName, args: unknown = {}) {
    await run(async () => {
      const result = await api<Result>('tool', { name, arguments: args })
      setMessage(result.outcome.toUpperCase() + ' · ' + result.message)
    })
  }
  async function save(next: Config) {
    voice.current?.close()
    setVoiceConnected(false)
    setVoiceStatus('Voice disconnected')
    await api('config', next)
    setConfig(next)
    setMessage('Room saved. Reconnecting configured devices.')
  }
  async function pairTV() {
    if (!config) return
    setMessage('Connecting to LG. Accept the pairing prompt on the TV.')
    const found = await api<Catalog>('setup', {
      action: 'tv.connect',
      host: config.tvHost
    })
    setCatalog(found)
    const youtube = found.apps.find((a) => a.title.toLowerCase() === 'youtube')
    const input = found.inputs.find((i) =>
      /hdmi[_ ]?3/i.test(i.id + ' ' + i.label)
    )
    // Populate only IDs actually returned by this television.
    const next = {
      ...config,
      youtubeAppId: youtube?.id ?? config.youtubeAppId,
      xboxInputId: input?.id ?? config.xboxInputId,
      xboxInputAppId: input?.appId ?? config.xboxInputAppId
    }
    await save(next)
    setMessage(
      [
        'LG paired. Check the discovered YouTube and HDMI 3 mappings below.',
        ...(found.warnings ?? [])
      ].join(' ')
    )
  }
  const state = status?.state
  const last = status?.traces.at(-1)
  const mode = status?.config.mode ?? 'live'
  return (
    <main className={display ? 'display' : ''}>
      <header>
        <a className='brand' href='/'>
          SMART TV<span>for real tho.</span>
        </a>
        <div className={'mode ' + mode}>
          {mode === 'live' ? 'LIVE DEVICE MODE' : 'SIMULATION · NO HARDWARE'}
        </div>
        <a href={display ? '/' : '/hud/?preview=1'}>
          {display ? 'Operator' : 'Visual lab'} ↗
        </a>
      </header>
      <section className='hero' aria-live='polite'>
        <div className={'orb ' + (pending ? 'working' : '')}>
          <div />
        </div>
        <div>
          <p className='eyebrow'>YOUR ROOM. YOUR SOFTWARE.</p>
          <h1>{pending ? 'On it.' : 'Make yourself heard.'}</h1>
          <p className='voice-status'>{voiceStatus}</p>
          <p className='feedback'>
            {status?.display?.frame.detail || 'Music. Games. Your voice.'}
          </p>
        </div>
      </section>
      <section className='states'>
        {(['tv', 'youtube', 'xbox'] as const).map((device) => {
          const item = state?.[device]
          return (
            <article key={device}>
              <p className='eyebrow'>
                <span className={item?.connected ? 'dot on' : 'dot'} />
                {device === 'tv'
                  ? 'LG · webOS 25'
                  : device === 'youtube'
                    ? 'NATIVE YOUTUBE'
                    : 'XBOX · HDMI 3'}
              </p>
              <h2>
                {device === 'tv'
                  ? (state?.tv.appId ?? 'No observation')
                  : device === 'youtube'
                    ? (state?.youtube.videoId ?? 'No video observed')
                    : (state?.xbox.activeTitle ?? 'No title observed')}
              </h2>
              <p>
                {device === 'tv'
                  ? 'Volume ' +
                    (state?.tv.volume ?? '—') +
                    ' · ' +
                    (state?.tv.soundOutput ?? 'output unknown')
                  : device === 'youtube'
                    ? (state?.youtube.playback ?? 'unknown')
                    : item?.connected
                      ? 'Console responding'
                      : 'Not connected'}
              </p>
              <small>
                {item?.observedAt
                  ? 'Observed ' +
                    Math.floor((clock - item.observedAt) / 1000) +
                    's ago'
                  : 'Awaiting device data'}
              </small>
            </article>
          )
        })}
      </section>
      {display ? (
        <p className='display-note'>
          {last?.action.replaceAll('_', ' ')} · {last?.phase}
          <br />
          Laptop display preview. The separate TV overlay probe is available in
          Room controls.
        </p>
      ) : (
        <>
          <section className='panel voice-panel'>
            <div>
              <h2>Talk to the room</h2>
              <p>
                Keep the laptop’s microphone and speakers active when the TV
                changes inputs.
              </p>
            </div>
            <div className='controls'>
              <button
                className='primary'
                disabled={pending > 0 || voiceConnected}
                onClick={() =>
                  void run(async () => {
                    if (config?.mode === 'live' && config.tvHost)
                      await api('setup', {
                        action: 'tv.connect',
                        host: config.tvHost
                      })
                    const muted = await api<Result>('tool', {
                      name: 'set_room_volume',
                      arguments: { level: 0 }
                    })
                    if (muted.outcome === 'failed')
                      throw new Error(muted.message)
                    if (status?.display?.enabled && config?.mode === 'live') {
                      await api('display/options', {
                        motion: status.display.motion,
                        autoRestore: true
                      })
                      await api('display/overlay', { action: 'launch' })
                    }
                    await voice.current?.connect(openMic)
                    setVoiceConnected(true)
                    setMessage('Demo session ready. Follow the journeys below.')
                  })
                }
              >
                Start demo session
              </button>
              <label className='check'>
                <input
                  type='checkbox'
                  checked={openMic}
                  disabled={voiceConnected}
                  onChange={(e) => setOpenMic(e.target.checked)}
                />
                Open mic
              </label>
              <button
                onClick={() =>
                  void run(async () => {
                    if (voiceConnected) {
                      voice.current?.close()
                      setVoiceConnected(false)
                      setVoiceStatus('Voice disconnected')
                      await api('cancel', {})
                    } else {
                      await voice.current?.connect(openMic)
                      setVoiceConnected(true)
                    }
                  })
                }
              >
                {voiceConnected ? 'Disconnect voice' : 'Connect voice'}
              </button>
              {!openMic && (
                <button
                  className='primary'
                  disabled={!voiceConnected}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    void voice.current?.talk(true)
                  }}
                  onPointerUp={() => {
                    void voice.current?.talk(false)
                  }}
                  onPointerCancel={() => {
                    void voice.current?.talk(false)
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                      e.preventDefault()
                      void voice.current?.talk(true)
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      void voice.current?.talk(false)
                    }
                  }}
                >
                  Hold to talk
                </button>
              )}
              <button
                onClick={() =>
                  void run(async () => {
                    await api('cancel', {})
                    setMessage(
                      'Pending actions cancelled. Commands already sent may have reached the device.'
                    )
                  })
                }
              >
                Cancel pending action
              </button>
            </div>
          </section>
          {actionError && (
            <p className='action-error' role='alert'>
              {actionError}
            </p>
          )}
          <HudControls display={status?.display} refresh={refresh} />
          <Journeys traces={status?.traces ?? []} />
          <details className='panel'>
            <summary>Controller feedback</summary>
            <p role='status'>{message}</p>
          </details>
          <div className='columns'>
            <section className='panel'>
              <p className='eyebrow'>01 / MUSIC</p>
              <h2>Play something.</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void tool('find_youtube_video', {
                    song: song || undefined,
                    artist: artist || undefined,
                    version
                  })
                }}
              >
                <label>
                  Song
                  <input
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    placeholder='Blinding Lights'
                  />
                </label>
                <div className='row'>
                  <label>
                    Artist
                    <input
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder='The Weeknd'
                    />
                  </label>
                  <label>
                    Version
                    <input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder='Music video / live'
                    />
                  </label>
                </div>
                <button className='primary' type='submit'>
                  Search YouTube
                </button>
              </form>
              <div className='candidates'>
                {status?.candidates.map((c) => (
                  <button
                    key={c.candidateId}
                    onClick={() =>
                      void tool('play_youtube_video', {
                        candidate_id: c.candidateId
                      })
                    }
                  >
                    <strong>{c.title}</strong>
                    <small>{c.channel}</small>
                    <span>Play on TV →</span>
                  </button>
                ))}
              </div>
              <div className='controls'>
                <button
                  onClick={() =>
                    void tool('control_video', { action: 'pause' })
                  }
                >
                  Pause
                </button>
                <button
                  onClick={() =>
                    void tool('control_video', { action: 'resume' })
                  }
                >
                  Continue
                </button>
                <button onClick={() => void tool('return_to_xbox')}>
                  Back to Xbox
                </button>
              </div>
            </section>
            <section className='panel'>
              <p className='eyebrow'>02 / ROOM</p>
              <h2>Take control.</h2>
              <div className='controls'>
                {(status?.gameAliases ?? []).map((alias) => (
                  <button
                    key={alias}
                    onClick={() =>
                      void tool('start_game', { game_alias: alias })
                    }
                  >
                    Launch {alias}
                  </button>
                ))}
              </div>
              <div className='controls'>
                <button
                  onClick={() => void tool('set_room_volume', { level: 15 })}
                >
                  Volume 15
                </button>
                <button
                  onClick={() => void tool('change_room_volume', { delta: -3 })}
                >
                  Quieter −3
                </button>
                <button
                  onClick={() => void tool('change_room_volume', { delta: 3 })}
                >
                  Louder +3
                </button>
              </div>
              <div className='controls'>
                <button
                  onClick={() => void tool('show_home', { target: 'xbox' })}
                >
                  Xbox Home
                </button>
                <button
                  onClick={() => void tool('show_home', { target: 'tv' })}
                >
                  TV Home
                </button>
                <button onClick={() => void tool('get_room_state')}>
                  Refresh observations
                </button>
              </div>
              <p className='muted'>
                Command acceptance is separate from observed state. Check the
                physical picture and sound during hardware probes.
              </p>
              <details>
                <summary>Legacy overlay diagnostics</summary>
                <p>
                  Requires the installed Developer Mode probe. The panel closes
                  after 60 seconds. Launch may briefly interrupt the picture.
                  These controls cancel pending media actions.
                </p>
                <div className='controls'>
                  {(['launch', 'close'] as const).map((action) => (
                    <button
                      key={action}
                      disabled={mode !== 'live' || pending > 0}
                      onClick={() =>
                        void run(async () => {
                          const result = await api<Result>('probe/overlay', {
                            action
                          })
                          setOverlayResult(result)
                          setMessage(
                            result.outcome.toUpperCase() +
                              ' · ' +
                              result.message
                          )
                        })
                      }
                    >
                      {action === 'launch'
                        ? 'Show TV overlay'
                        : 'Hide TV overlay'}
                    </button>
                  ))}
                </div>
                <p>
                  Live activity panel:{' '}
                  {status?.display?.enabled ? 'feed enabled' : 'feed disabled'}.
                </p>
                <div className='controls'>
                  {(['launch', 'close'] as const).map((action) => (
                    <button
                      key={action}
                      disabled={
                        mode !== 'live' ||
                        pending > 0 ||
                        !status?.display?.enabled
                      }
                      onClick={() =>
                        void run(async () => {
                          const result = await api<Result>('display/overlay', {
                            action
                          })
                          setOverlayResult(result)
                          setMessage(
                            result.outcome.toUpperCase() +
                              ' · ' +
                              result.message
                          )
                        })
                      }
                    >
                      {action === 'launch'
                        ? 'Show live TV panel'
                        : 'Hide live TV panel'}
                    </button>
                  ))}
                </div>
                {overlayResult && (
                  <pre>{JSON.stringify(overlayResult, null, 2)}</pre>
                )}
              </details>
              <details>
                <summary>Known-video diagnostic</summary>
                <p>
                  This tests playback without search and does not pass the
                  retrieval milestone.
                </p>
                <label>
                  YouTube video ID
                  <input
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    placeholder='11-character video ID'
                  />
                </label>
                <button
                  onClick={() =>
                    void run(async () => {
                      const r = await api<Result>('probe/video', { videoId })
                      setMessage(r.outcome + ' · ' + r.message)
                    })
                  }
                >
                  Run native playback probe
                </button>
                <button
                  disabled={pending > 0 || status?.config.mode !== 'live'}
                  onClick={() =>
                    void run(async () => {
                      const r = await api<Result>('probe/youtube-close', {})
                      setMessage(r.outcome + ' · ' + r.message)
                    })
                  }
                >
                  Close native YouTube for reopen test
                </button>
                <p>
                  Open YouTube first, close it here, then run the playback
                  probe. This interrupts its current video.
                </p>
              </details>
            </section>
          </div>
          <details className='panel setup' open={!status?.config.tvHost}>
            <summary>Room setup & connections</summary>
            {config && (
              <>
                <p>
                  LG 86UA8450PSA · webOS 25 · 33.31.61. Xbox on HDMI 3; soundbar
                  on HDMI 2.
                </p>
                <div className='columns'>
                  <div>
                    <h3>Television</h3>
                    <label>
                      TV IPv4 address
                      <input
                        value={config.tvHost}
                        onChange={(e) =>
                          setConfig({ ...config, tvHost: e.target.value })
                        }
                        placeholder='192.168.1.…'
                      />
                    </label>
                    <button onClick={() => void run(pairTV)}>
                      Pair / reconnect LG
                    </button>
                    {catalog && (
                      <>
                        <label>
                          Native YouTube
                          <select
                            value={config.youtubeAppId}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                youtubeAppId: e.target.value
                              })
                            }
                          >
                            <option value=''>Select app</option>
                            {catalog.apps.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Xbox HDMI
                          <select
                            value={config.xboxInputId}
                            onChange={(e) => {
                              const input = catalog.inputs.find(
                                (i) => i.id === e.target.value
                              )
                              if (input)
                                setConfig({
                                  ...config,
                                  xboxInputId: input.id,
                                  xboxInputAppId: input.appId
                                })
                            }}
                          >
                            <option value=''>Select input</option>
                            {catalog.inputs.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <h3>YouTube receiver</h3>
                    <p>
                      Open YouTube on the TV → Settings → Link with TV code.
                    </p>
                    <label>
                      TV code
                      <input
                        autoComplete='off'
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </label>
                    <button
                      onClick={() =>
                        void run(async () => {
                          await api('setup', { action: 'youtube.pair', code })
                          setCode('')
                          setMessage('Receiver paired.')
                        })
                      }
                    >
                      Pair YouTube
                    </button>
                    <button
                      onClick={() =>
                        void run(async () => {
                          await api('setup', { action: 'youtube.connect' })
                          setMessage('Receiver connected.')
                        })
                      }
                    >
                      Reconnect receiver
                    </button>
                  </div>
                  <div>
                    <h3>Xbox account & game</h3>
                    <button
                      onClick={() =>
                        void run(async () => {
                          const result = await api<{ url: string }>('setup', {
                            action: 'xbox.auth'
                          })
                          setMessage(
                            'Use the Microsoft sign-in link below, then load consoles.'
                          )
                          setSignInUrl(result.url)
                        })
                      }
                    >
                      Sign in with Microsoft
                    </button>
                    {signInUrl && (
                      <p>
                        <a
                          href={signInUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          Continue to Microsoft sign-in ↗
                        </a>
                      </p>
                    )}
                    <button
                      onClick={() =>
                        void run(async () => {
                          setXbox(
                            await api<XboxCatalog>('setup', {
                              action: 'xbox.catalog',
                              consoleId: config.consoleId
                            })
                          )
                        })
                      }
                    >
                      Load consoles / games
                    </button>
                    {xbox && (
                      <>
                        <label>
                          Console
                          <select
                            value={config.consoleId}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                consoleId: e.target.value
                              })
                            }
                          >
                            <option value=''>Select console</option>
                            {xbox.consoles.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>Select a console, then load games again.</p>
                        <label>
                          Demo game
                          <select
                            defaultValue=''
                            onChange={(e) => {
                              const game = xbox.games.find(
                                (g) => g.id === e.target.value
                              )
                              if (game)
                                setConfig({
                                  ...config,
                                  games: {
                                    ...config.games,
                                    [game.name]: game.id
                                  }
                                })
                            }}
                          >
                            <option value=''>Choose installed game</option>
                            {xbox.games.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <h3>API access</h3>
                    <p>
                      Keys stay on this Mac. OpenAI:{' '}
                      {status?.credentials.openai ? 'configured' : 'missing'} ·
                      YouTube:{' '}
                      {status?.credentials.youtube ? 'configured' : 'missing'}
                    </p>
                    <label>
                      OpenAI key
                      <input
                        type='password'
                        autoComplete='off'
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder='Leave blank to keep current key'
                      />
                    </label>
                    <label>
                      YouTube Data API key
                      <input
                        type='password'
                        autoComplete='off'
                        value={ytKey}
                        onChange={(e) => setYtKey(e.target.value)}
                      />
                    </label>
                    <button
                      onClick={() =>
                        void run(async () => {
                          const values: { openai?: string; youtube?: string } =
                            {}
                          if (key) values.openai = key
                          if (ytKey) values.youtube = ytKey
                          await api('secrets', values)
                          setKey('')
                          setYtKey('')
                          setMessage('Keys saved locally.')
                        })
                      }
                    >
                      Save keys
                    </button>
                  </div>
                </div>
                <div className='controls'>
                  <label>
                    Mode
                    <select
                      value={config.mode}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mode: e.target.value as Config['mode']
                        })
                      }
                    >
                      <option value='live'>Live devices</option>
                      <option value='simulation'>Explicit simulation</option>
                    </select>
                  </label>
                  <label>
                    Maximum volume
                    <input
                      type='number'
                      min='1'
                      max='100'
                      value={config.maxVolume}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          maxVolume: Number(e.target.value)
                        })
                      }
                    />
                  </label>
                  <button
                    className='primary'
                    onClick={() => void run(() => save(config))}
                  >
                    Save room
                  </button>
                </div>
                <p className='muted'>
                  Simulation does not pair devices and never replaces a failed
                  live connection. Reconnect voice after saving room settings.
                </p>
              </>
            )}
          </details>
          <section className='panel'>
            <p className='eyebrow'>EVENT TIMELINE</p>
            <ol className='timeline'>
              {status?.traces
                .slice(-12)
                .reverse()
                .map((t, i) => (
                  <li key={t.requestId + t.phase + i}>
                    <time>{new Date(t.at).toLocaleTimeString()}</time>
                    <strong>{t.action.replaceAll('_', ' ')}</strong>
                    <span>
                      {t.mode} · {t.phase} · {t.elapsedMs} ms
                    </span>
                    {t.detail && <small>{t.detail}</small>}
                  </li>
                ))}
            </ol>
          </section>
        </>
      )}
      <footer>
        Personal software for a room you already own.{' '}
        <span>S / TV · Private room controller</span>
      </footer>
    </main>
  )
}
createRoot(document.querySelector('#root')!).render(<App />)

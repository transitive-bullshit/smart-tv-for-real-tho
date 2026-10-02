import { useEffect, useState } from 'react'
import { api } from './api.js'
import type { DisplayFrame, MotionMode } from '../src/display.js'
import { displayVersion } from '../src/display-health.js'
import type { DisplayHealth } from '../src/display-health.js'
interface Display {
  enabled: boolean
  autoRestore: boolean
  motion: MotionMode
  frame: DisplayFrame
  health?: DisplayHealth
}
export function HudControls({
  display,
  refresh
}: {
  display?: Display
  refresh: () => Promise<void>
}) {
  const [error, setError] = useState('')
  const [installed, setInstalled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const health = display?.health
  const seen = health?.lastSeen ? now - health.lastSeen : Infinity
  const report =
    health?.reportedAt && now - health.reportedAt < 4000 ? health.report : null
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action unavailable')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className='panel hud-controls' id='live-panel'>
      <div>
        <p className='eyebrow'>LIVE PANEL / {displayVersion}</p>
        <h2>What the room should show.</h2>
        <p>
          The TV renderer, following the live voice, motion, and saved
          appearance.
        </p>
      </div>
      <iframe
        className='hud-mirror'
        src='/hud/?mirror=1'
        title='Live TV panel preview'
      />
      <div className='hud-health' role='status'>
        <span>
          {display?.frame.dismiss
            ? 'TV panel requested hidden · preview stays visible'
            : 'TV panel requested visible'}
        </span>
        <span>
          {seen >= 4000
            ? 'TV feed not reporting'
            : report
              ? `TV ${report.version} · ${report.fps} fps${report.hidden ? ' · window hidden' : report.paused ? ' · motion paused' : ''}`
              : 'TV feed connected · render rate unavailable'}
        </span>
      </div>
      <p className='muted'>
        Live reference preview, not a video capture. The TV report measures its
        own canvas; no report means the physical panel is unverified.
      </p>
      <div className='controls'>
        <a className='button-link' href='/hud/?preview=1'>
          Open visual lab
        </a>
        <a className='button-link' href='/hud/?mirror=1'>
          Open live preview
        </a>
        <button
          disabled={busy || !display?.enabled}
          onClick={() =>
            void run(() => api('display/overlay', { action: 'launch' }))
          }
        >
          Show TV panel
        </button>
        <button
          disabled={busy || !display?.enabled}
          onClick={() =>
            void run(() => api('display/overlay', { action: 'close' }))
          }
        >
          Hide TV panel
        </button>
        <label>
          Motion
          <select
            disabled={busy}
            value={display?.motion ?? 'full'}
            onChange={(e) =>
              void run(() =>
                api('display/options', {
                  motion: e.target.value,
                  autoRestore: display?.autoRestore ?? false
                })
              )
            }
          >
            <option value='full'>Full · expressive motion</option>
            <option value='subtle'>Subtle · slower motion</option>
            <option value='static'>Static · no animation</option>
          </select>
        </label>
        <label className='check'>
          <input
            type='checkbox'
            disabled={busy || !display?.enabled}
            checked={display?.autoRestore ?? false}
            onChange={(e) =>
              void run(() =>
                api('display/options', {
                  motion: display?.motion ?? 'full',
                  autoRestore: e.target.checked
                })
              )
            }
          />
          Restore after source changes
        </label>
      </div>
      {!display?.enabled && (
        <p>
          TV display feed is off. The visual lab still works locally. See the
          runbook to enable the LAN feed.
        </p>
      )}
      <button
        disabled={busy || !display?.enabled}
        onClick={() =>
          void run(async () => {
            await api('display/install', {})
            setInstalled(true)
          })
        }
      >
        {busy
          ? 'Working…'
          : installed
            ? `TV update installed · ${displayVersion}`
            : `Install TV update · ${displayVersion}`}
      </button>
      <p className='muted'>
        Install TV panel {displayVersion} for animation recovery and render
        diagnostics. Hide also turns off automatic restoration. Back on the
        remote dismisses the current panel.
      </p>
      {error && <p role='alert'>{error}</p>}
    </section>
  )
}

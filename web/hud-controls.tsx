import { useState } from 'react'
import { api } from './api.js'
import type { DisplayFrame, MotionMode } from '../src/display.js'
interface Display {
  enabled: boolean
  autoRestore: boolean
  motion: MotionMode
  frame: DisplayFrame
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
    <section className='panel hud-controls'>
      <div>
        <p className='eyebrow'>THE NATIVE OVERLAY / 0.0.3</p>
        <h2>A little future. In your living room.</h2>
        <p>Voice-reactive light, clear intent, and your content underneath.</p>
      </div>
      <div className='controls'>
        <a
          className='button-link'
          href='/hud/?preview=1'
          target='_blank'
          rel='noreferrer'
        >
          Open visual lab ↗
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
            <option value='full'>Full · orbital motion</option>
            <option value='subtle'>Subtle · voice only</option>
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
            ? 'TV update installed · 0.0.3'
            : 'Install TV update · 0.0.3'}
      </button>
      <p className='muted'>
        Install TV panel 0.0.3 once for the new visuals. Hide also turns off
        automatic restoration. Back on the remote dismisses the current panel.
      </p>
      {error && <p role='alert'>{error}</p>}
    </section>
  )
}

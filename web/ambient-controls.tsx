import { useEffect, useState } from 'react'
import type { Result } from '../src/contracts.js'
import type { AmbientCommand } from '../src/ambient-options.js'
import type { AmbientAutoStatus } from '../src/ambient-auto.js'
import { api } from './api.js'
export function AmbientControls({ live }: { live: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [guard, setGuard] = useState('saved')
  async function run(action: 'install' | 'images' | 'close') {
    setBusy(true)
    setMessage('')
    try {
      if (action === 'install') {
        await api('ambient/install', {})
        setMessage(
          'Room Ambient 0.0.9 installed. Open the slideshow when ready.'
        )
      } else {
        const command: AmbientCommand = {
          action: action === 'close' ? 'close' : 'launch'
        }
        if (action === 'images' && guard !== 'saved')
          command.guard = guard === 'on'
        const result = await api<Result>('ambient/control', command)
        setMessage(result.message)
        if (action === 'images' && result.outcome === 'accepted')
          setGuard('saved')
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Ambient action unavailable'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className='panel'>
      <p className='eyebrow'>ROOM AMBIENT / 0.0.9</p>
      <h2>A screen worth leaving on.</h2>
      <p>
        Your wallpapers, slowly moving. Explore the framing locally, then launch
        the separate full-screen TV app.
      </p>
      <div className='controls'>
        <a className='button-link' href='/ambient/?preview=1'>
          Open ambient lab
        </a>
        <button disabled={busy || !live} onClick={() => void run('install')}>
          Install ambient app
        </button>
        <button disabled={busy || !live} onClick={() => void run('images')}>
          Show slideshow on TV
        </button>
        <button disabled={busy || !live} onClick={() => void run('close')}>
          Close ambient app
        </button>
      </div>
      <label>
        Slideshow idle guard
        <select
          value={guard}
          onChange={(event) => setGuard(event.target.value)}
        >
          <option value='saved'>Use saved TV setting</option>
          <option value='on'>Enable and remember on TV</option>
          <option value='off'>Disable and remember on TV</option>
        </select>
      </label>
      <p className='muted'>
        TV launch sets room volume to zero and hides the assistant panel. This
        opens a foreground app.
      </p>
      <AutomaticAmbientControls live={live} />
      <p className='muted'>
        See docs/ambient-screensaver.md for the live TV checks.
      </p>
      {message && <p role='status'>{message}</p>}
    </section>
  )
}

function AutomaticAmbientControls({ live }: { live: boolean }) {
  const [status, setStatus] = useState<AmbientAutoStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const next = await api<AmbientAutoStatus>('ambient/automatic')
        if (active) {
          setStatus(next)
          setError('')
        }
      } catch {
        if (active)
          setError(
            'Controller unavailable. Automatic opening requires the local server.'
          )
      }
    }
    void refresh()
    const timer = setInterval(() => {
      void refresh()
    }, 3000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])
  async function save(enabled: boolean, cooldownSeconds: number) {
    setBusy(true)
    try {
      setStatus(
        await api<AmbientAutoStatus>('ambient/automatic', {
          enabled,
          cooldownSeconds
        })
      )
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save automatic opening.'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <fieldset>
      <legend>Automatic ambient · experimental</legend>
      <label className='check'>
        <input
          type='checkbox'
          checked={status?.config.enabled ?? false}
          disabled={!live || busy || !status}
          onChange={(e) =>
            void save(e.target.checked, status?.config.cooldownSeconds ?? 60)
          }
        />
        Open Room Ambient when LG Home enters its screensaver
      </label>
      <label>
        Pause after dismissal or a controller command
        <select
          value={status?.config.cooldownSeconds ?? 60}
          disabled={!live || busy || !status}
          onChange={(e) =>
            void save(status?.config.enabled ?? false, Number(e.target.value))
          }
        >
          <option value={60}>1 minute</option>
          <option value={180}>3 minutes</option>
          <option value={600}>10 minutes</option>
        </select>
      </label>
      <p className='muted'>
        Keep this Mac awake and the controller running. Uses LG’s screensaver
        signal; this is not a timer for time spent browsing Home. YouTube, Xbox
        and powered-off states are excluded.
      </p>
      <p role='status'>
        {error || status?.message || 'Reading automatic ambient settings…'}
      </p>
      {status && (
        <details>
          <summary>
            Automatic activation diagnostics · {status.launches} accepted
            launches this session
          </summary>
          <p className='muted'>
            {status.observation
              ? [
                  status.observation.appId,
                  status.observation.powerState,
                  status.observation.processing,
                  new Date(status.observation.observedAt).toLocaleTimeString()
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'No current TV observation.'}
          </p>
          <ul>
            {status.events.map((event, i) => (
              <li key={i}>
                {new Date(event.at).toLocaleTimeString()} · {event.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </fieldset>
  )
}

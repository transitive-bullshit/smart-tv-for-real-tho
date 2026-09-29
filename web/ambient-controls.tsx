import { useState } from 'react'
import type { Result } from '../src/contracts.js'
import type { AmbientCommand } from '../src/ambient-options.js'
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
          'Room Ambient 0.0.8 installed. Open the slideshow when ready.'
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
      <p className='eyebrow'>ROOM AMBIENT / 0.0.8</p>
      <h2>A screen worth leaving on.</h2>
      <p>
        Your wallpapers, slowly moving. Explore the framing locally, then launch
        the separate full-screen TV app.
      </p>
      <div className='controls'>
        <a
          className='button-link'
          href='/ambient/?preview=1'
          target='_blank'
          rel='noreferrer'
        >
          Open ambient lab ↗
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
        opens a foreground app. Automatic activation from other apps is not
        implemented.
      </p>
      <p className='muted'>
        See docs/ambient-screensaver.md for the live TV checks.
      </p>
      {message && <p role='status'>{message}</p>}
    </section>
  )
}

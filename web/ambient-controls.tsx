import { useState } from 'react'
import type { Result } from '../src/contracts.js'
import { api } from './api.js'
export function AmbientControls({ live }: { live: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [guard, setGuard] = useState(false)
  async function run(action: 'install' | 'images' | 'video' | 'close') {
    setBusy(true)
    setMessage('')
    try {
      if (action === 'install') {
        await api('ambient/install', {})
        setMessage(
          'Room Ambient 0.0.2 installed. Choose a playback mode when ready.'
        )
      } else {
        const result = await api<Result>('ambient/control', {
          action: action === 'close' ? 'close' : 'launch',
          mode: action === 'video' ? 'video' : 'images',
          guard: action === 'images' && guard
        })
        setMessage(result.message)
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
      <p className='eyebrow'>ROOM AMBIENT / 0.0.2</p>
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
        <button disabled={busy || !live} onClick={() => void run('video')}>
          Show film on TV
        </button>
        <button disabled={busy || !live} onClick={() => void run('close')}>
          Close ambient app
        </button>
      </div>
      <label className='check'>
        <input
          type='checkbox'
          checked={guard}
          onChange={(event) => setGuard(event.target.checked)}
        />
        Try private idle guard with the slideshow
      </label>
      <p className='muted'>
        TV launch sets room volume to zero and hides the assistant panel. Image
        controls are exploratory; the bundled film uses the default framing.
        This opens a foreground app; automatic system screensaver replacement is
        unverified.
      </p>
      <p className='muted'>
        <a href='/ambient/?mode=video' target='_blank' rel='noreferrer'>
          Preview the silent film ↗
        </a>{' '}
        · See docs/ambient-screensaver.md for the single-session TV test.
      </p>
      {message && <p role='status'>{message}</p>}
    </section>
  )
}

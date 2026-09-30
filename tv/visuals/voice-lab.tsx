import { useCallback, useEffect, useRef, useState } from 'react'
import { Voice } from '../../web/voice.js'
import type { DisplayFrame } from '../../src/display.js'
import type { AssistantState } from '../../src/visual-options.js'
import { AudioPreview, inlineAudio } from './audio-preview.js'
import type { AudioPreviewPhase } from './audio-preview.js'
import requestAudio from './audio/request.mp3?inline'
import replyAudio from './audio/reply.mp3?inline'

export type LabScenario = AssistantState | 'live' | 'audio'
type Props = {
  scenario: LabScenario
  onScenario: (scenario: LabScenario) => void
  onLevel: (read: () => number) => void
  present: (frame: Partial<DisplayFrame>) => void
}
const messages = {
  listening: [
    'I’m listening.',
    'Recorded request',
    'Hey, can you help me find something calm to watch tonight?'
  ],
  working: ['Finding the right mood', 'A moment to think.', ''],
  speaking: [
    'Something for a slower evening',
    'Recorded assistant reply',
    'Of course. Something quiet for a slower evening. How about a nature documentary?'
  ],
  success: ['Ready when you are.', 'Replay or try your own voice.', '']
} as const

export function VoiceLab({ scenario, onScenario, onLevel, present }: Props) {
  const [mode, setMode] = useState<'demo' | 'voice'>('demo')
  const [playing, setPlaying] = useState(false)
  const [connection, setConnection] = useState<
    'offline' | 'connecting' | 'ready'
  >('offline')
  const [pressed, setPressed] = useState(false)
  const [status, setStatus] = useState('A short conversation. Hear it. See it.')
  const [file, setFile] = useState<File>()
  const [volume, setVolume] = useState(0.65)
  const demo = useRef<AudioPreview | null>(null)
  const voice = useRef<Voice | null>(null)
  const generation = useRef(0)
  const callbacks = useRef({ onScenario, present })
  useEffect(() => {
    callbacks.current = { onScenario, present }
  }, [onScenario, present])

  const stopDemo = useCallback(() => {
    generation.current++
    if (demo.current) setStatus('Playback stopped. Ready to replay.')
    demo.current?.close()
    demo.current = null
    onLevel(() => 0)
    setPlaying(false)
  }, [onLevel])
  const disconnect = useCallback(() => {
    generation.current++
    if (voice.current) setStatus('Voice disconnected.')
    voice.current?.close()
    voice.current = null
    setConnection('offline')
    setPressed(false)
  }, [])
  useEffect(() => {
    if (scenario !== 'audio' && demo.current) stopDemo()
    if (scenario !== 'live' && voice.current) disconnect()
  }, [scenario, stopDemo, disconnect])
  useEffect(() => {
    const release = () => {
      setPressed(false)
      void voice.current?.talk(false)
    }
    const hidden = () => {
      if (!document.hidden) return
      release()
      if (demo.current) {
        stopDemo()
        setStatus('Playback stopped. Ready to replay.')
        callbacks.current.onScenario('idle')
      }
    }
    const close = () => {
      generation.current++
      demo.current?.close()
      voice.current?.close()
      onLevel(() => 0)
    }
    window.addEventListener('blur', release)
    window.addEventListener('pagehide', close)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', release)
      window.removeEventListener('pagehide', close)
      document.removeEventListener('visibilitychange', hidden)
      close()
    }
  }, [onLevel, stopDemo])

  async function play() {
    stopDemo()
    disconnect()
    onScenario('audio')
    setPlaying(true)
    setStatus('Loading audio…')
    const run = ++generation.current
    try {
      const player = (demo.current = new AudioPreview())
      player.volume(volume)
      onLevel(player.level)
      await player.play(
        file ? () => file.arrayBuffer() : () => inlineAudio(requestAudio),
        () => inlineAudio(replyAudio),
        (phase: AudioPreviewPhase) => {
          if (generation.current !== run) return
          const [title, message, detail] = messages[phase]
          setStatus(
            {
              listening: 'You · recorded audio',
              working: 'Thinking…',
              speaking: 'Assistant · recorded reply',
              success: 'Conversation complete'
            }[phase]
          )
          callbacks.current.present({
            visual: phase,
            title,
            message,
            detail: phase === 'listening' && file ? file.name : detail,
            source: 'AUDIO DEMO',
            mode: 'simulation'
          })
        }
      )
      if (generation.current === run) {
        stopDemo()
        setStatus('Ready to replay.')
        onScenario('idle')
      }
    } catch (err) {
      if (generation.current !== run) return
      stopDemo()
      setStatus(
        err instanceof Error
          ? err.message
          : 'Could not play this audio. Try an MP3 or WAV file.'
      )
      onScenario('idle')
    }
  }

  async function connect() {
    stopDemo()
    disconnect()
    onScenario('live')
    setConnection('connecting')
    setStatus('Connecting… Allow microphone access when asked.')
    const run = ++generation.current
    const session = new Voice(setStatus, () => {
      setConnection('offline')
      setPressed(false)
    })
    voice.current = session
    try {
      // Voice.connect closes any previous connection first.
      const pending = session.connect(false)
      setConnection('connecting')
      await pending
      if (generation.current === run) setConnection('ready')
    } catch (err) {
      if (generation.current === run)
        setStatus(
          err instanceof Error ? err.message : 'Voice unavailable. Try again.'
        )
    }
  }
  function talk(down: boolean) {
    setPressed(down)
    void voice.current?.talk(down)
  }

  return (
    <section className='voice-lab' aria-label='Try voice and glow'>
      <div className='voice-lab-heading'>
        <h2>Try the conversation</h2>
        <div className='voice-lab-tabs' aria-label='Voice test mode'>
          {(['demo', 'voice'] as const).map((name) => (
            <button
              key={name}
              type='button'
              aria-pressed={mode === name}
              onClick={() => {
                stopDemo()
                disconnect()
                onScenario('idle')
                setMode(name)
                setStatus(
                  name === 'demo'
                    ? 'A short conversation. Hear it. See it.'
                    : 'Connect, then hold to talk.'
                )
              }}
            >
              {name === 'demo' ? 'Audio demo' : 'Live voice'}
            </button>
          ))}
        </div>
      </div>
      <div className='voice-lab-actions'>
        {mode === 'demo' ? (
          <>
            <button
              type='button'
              className='voice-lab-primary'
              onClick={() => {
                if (playing) {
                  stopDemo()
                  onScenario('idle')
                  setStatus('Playback stopped. Ready to replay.')
                } else void play()
              }}
            >
              {playing
                ? 'Stop audio'
                : file
                  ? 'Play my clip'
                  : 'Play conversation'}
            </button>
            <label className='voice-lab-file'>
              <span>{file ? 'Change clip' : 'Use an audio file'}</span>
              <input
                type='file'
                accept='audio/*'
                aria-label='Choose audio file'
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  if (!selected) return
                  stopDemo()
                  onScenario('idle')
                  if (selected.size > 10 * 1024 * 1024) {
                    setStatus(
                      'Choose an audio file under 10 MB and 30 seconds.'
                    )
                  } else {
                    setFile(selected)
                    setStatus(selected.name)
                  }
                  event.target.value = ''
                }}
              />
            </label>
            {file && (
              <button
                type='button'
                onClick={() => {
                  stopDemo()
                  setFile(undefined)
                  onScenario('idle')
                  setStatus('Sample conversation selected.')
                }}
              >
                Use sample
              </button>
            )}
            <label className='voice-lab-volume'>
              Volume
              <input
                aria-label='Demo volume'
                type='range'
                min='0'
                max='1'
                step='0.05'
                value={volume}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setVolume(value)
                  demo.current?.volume(value)
                }}
              />
            </label>
          </>
        ) : (
          <>
            <button
              type='button'
              onClick={() => {
                if (connection === 'offline') void connect()
                else {
                  disconnect()
                  onScenario('idle')
                  setStatus('Voice disconnected.')
                }
              }}
            >
              {connection === 'connecting'
                ? 'Cancel connection'
                : connection === 'ready'
                  ? 'Disconnect'
                  : 'Connect voice'}
            </button>
            <button
              type='button'
              className='voice-lab-primary'
              aria-pressed={pressed}
              disabled={connection !== 'ready'}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.currentTarget.setPointerCapture(event.pointerId)
                talk(true)
              }}
              onPointerUp={() => talk(false)}
              onPointerCancel={() => talk(false)}
              onLostPointerCapture={() => talk(false)}
              onBlur={() => talk(false)}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  if (!event.repeat) talk(true)
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  talk(false)
                }
              }}
            >
              {pressed ? 'Listening…' : 'Hold to talk'}
            </button>
          </>
        )}
      </div>
      <p className='voice-lab-status' role='status'>
        {status}
      </p>
      <p className='voice-lab-note'>
        {mode === 'demo'
          ? 'Recorded request + reply · local playback · no AI or device actions'
          : 'Real assistant · uses your microphone · can control your room'}
      </p>
    </section>
  )
}

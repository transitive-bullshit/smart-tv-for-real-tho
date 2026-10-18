import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VoiceBeam } from 'voice-glow'
import { Orb } from '../../tv/visuals/orb.js'
import {
  defaultVisualOptions,
  resolveOrb,
  visualStyles
} from '../../src/visual-options.js'
import type { AssistantState } from '../../src/visual-options.js'
import room from './assets/evening-room.webp'
import pinkSculpture from './assets/pink-sculpture.jpg'
import quietShore from './assets/quiet-shore.jpg'
import cloudWorkshop from './assets/cloud-workshop.jpg'
import './style.css'

type Scene = 'ambient' | 'music' | 'live' | 'game'
type Moment = { state: AssistantState; visible: boolean; line: string }
const scenes = [
  { url: pinkSculpture, title: 'The shape of possibility' },
  { url: quietShore, title: 'The quiet shore' },
  { url: cloudWorkshop, title: 'The workshop above the clouds' }
]
const requests = [
  {
    label: 'Play something mellow',
    request: 'Play something mellow.',
    reply: 'A little room to breathe.',
    scene: 'music',
    title: 'Just ask.',
    description: 'Less typing with a remote. More of what you came here for.'
  },
  {
    label: 'Actually, the live version',
    request: 'Actually, the live version.',
    reply: 'Same song. Live this time.',
    scene: 'live',
    title: 'Change your mind.',
    description:
      'A correction is part of the conversation. You keep the context.'
  },
  {
    label: 'Back to my game',
    request: 'Back to my game.',
    reply: 'Back to your game.',
    scene: 'game',
    title: 'Pick up where you left off.',
    description:
      'Your console stays on HDMI. The assistant gets out of the way.'
  },
  {
    label: 'Show me the ambient screen',
    request: 'A little quiet, please.',
    reply: 'Make room for quiet.',
    scene: 'ambient',
    title: 'Give the room something back.',
    description:
      'When the watching stops, the screen can become something worth looking at.'
  }
] satisfies {
  label: string
  request: string
  reply: string
  scene: Scene
  title: string
  description: string
}[]

const resting: Moment = { state: 'idle', visible: false, line: '' }
const style = visualStyles.ember
const options = defaultVisualOptions
const localLinks = import.meta.env.DEV && location.pathname.startsWith('/demo/')

function Demo() {
  const [scene, setScene] = useState<Scene>('ambient')
  const [art, setArt] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [moment, setMoment] = useState<Moment>(resting)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [focus, setFocus] = useState(false)
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [imageError, setImageError] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const reader = useRef(moment.state)
  const experience = useRef<HTMLElement>(null)

  useEffect(() => {
    reader.current = moment.state
  }, [moment.state])
  const level = useCallback(() => {
    if (!['listening', 'speaking'].includes(reader.current)) return 0
    // This public demo deliberately uses an illustrative envelope, never a microphone.
    const t = performance.now() / 1000
    return Math.max(0, Math.sin(t * 8) * 0.35 + Math.sin(t * 13) * 0.15 + 0.25)
  }, [])
  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  useEffect(() => cancel, [cancel])
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        cancel()
        setPlaying(false)
        setMoment(resting)
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [cancel])

  function later(callback: () => void, delay: number) {
    timers.current.push(setTimeout(callback, delay))
  }
  function showRequest(index: number) {
    const request = requests[index]!
    setSelected(index)
    setMoment({ state: 'listening', visible: true, line: request.request })
    later(
      () => setMoment({ state: 'working', visible: true, line: 'On it.' }),
      950
    )
    later(() => {
      setScene(request.scene)
      setMoment({ state: 'speaking', visible: true, line: request.reply })
    }, 1700)
    later(
      () => setMoment({ state: 'success', visible: true, line: request.reply }),
      3200
    )
    later(() => setMoment(resting), 4500)
  }
  function choose(index: number) {
    cancel()
    setPlaying(false)
    // Ambient activation on the real TV is idle-driven, not a voice tool.
    if (index === 3) {
      setSelected(index)
      setScene('ambient')
      setMoment(resting)
      return
    }
    showRequest(index)
  }
  function playStory() {
    cancel()
    if (playing) {
      setPlaying(false)
      setMoment(resting)
      return
    }
    setPlaying(true)
    setScene('game')
    showRequest(0)
    later(() => showRequest(1), 5500)
    later(() => showRequest(2), 11000)
    later(() => {
      setSelected(3)
      setScene('ambient')
      setMoment(resting)
      setPlaying(false)
    }, 16500)
  }
  function replayFromTop() {
    experience.current?.scrollIntoView({
      behavior: reduced ? 'instant' : 'smooth',
      block: 'start'
    })
    if (!playing) playStory()
  }
  const current = requests[selected ?? 3]!
  const backdrop =
    scene === 'game'
      ? cloudWorkshop
      : scene === 'ambient'
        ? scenes[art]!.url
        : quietShore
  const displayedTitle =
    scene === 'ambient'
      ? scenes[art]!.title
      : scene === 'game'
        ? 'Afterlight'
        : 'A little room to breathe'

  return (
    <>
      <a className='skip-link' href='#experience'>
        Skip to the interactive demo
      </a>
      <header className='site-header'>
        <a
          className='wordmark'
          href='#top'
          aria-label='Smart TV, for real tho home'
        >
          <span className='brand-orb' />
          smart tv<span className='wordmark-aside'>for real tho</span>
        </a>
        <nav aria-label='Main navigation'>
          <a href='#how-it-works'>The idea</a>
          <a href='#prototype'>The prototype</a>
          <button className='nav-demo' onClick={replayFromTop}>
            Try the room
          </button>
        </nav>
      </header>
      <main id='top'>
        <section className='intro' aria-labelledby='headline'>
          <p className='eyebrow'>YOUR ROOM. YOUR SOFTWARE.</p>
          <h1 id='headline'>
            A smart TV.
            <br />
            <span>For real, this time.</span>
          </h1>
          <p className='intro-copy'>
            Say what you want. Change your mind.
            <br className='mobile-break' /> Make yourself at home.
          </p>
        </section>
        <section
          id='experience'
          ref={experience}
          className={`experience${focus ? ' focused' : ''}${paused || reduced ? ' still' : ''}`}
          aria-label='Interactive fictional TV demo'
        >
          <div className='experience-bar'>
            <span className='demo-label'>
              INTERACTIVE DEMO <span>/</span> A FICTIONAL ROOM
            </span>
            <div>
              <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? 'Enable motion' : 'Pause motion'}
              </button>
              <button aria-pressed={focus} onClick={() => setFocus(!focus)}>
                {focus ? 'Show the room' : 'Focus on TV'}
              </button>
            </div>
          </div>
          <div className='room-viewport'>
            <div className='room-scene'>
              <img
                className='room-image'
                src={room}
                alt='A warm evening living room with a television above a walnut console, a lamp, and a view of the city'
                fetchPriority='high'
                width='1672'
                height='941'
              />
              <div
                className={`television scene-${scene}`}
                aria-label={`Simulated TV: ${displayedTitle}`}
              >
                <img
                  key={backdrop}
                  className='screen-art'
                  src={backdrop}
                  alt=''
                  onLoad={() => setImageError(false)}
                  onError={() => setImageError(true)}
                />
                {imageError && (
                  <div className='image-error'>
                    The artwork couldn’t load. Refresh to try again.
                  </div>
                )}
                <div className='screen-shade' />
                {scene === 'ambient' ? (
                  <div className='ambient-caption'>
                    <span>ROOM AMBIENT</span>
                    <p>{displayedTitle}</p>
                  </div>
                ) : scene === 'game' ? (
                  <div className='game-content'>
                    <span>A FICTIONAL ADVENTURE</span>
                    <h2>AFTERLIGHT</h2>
                    <p>Your next chapter is waiting.</p>
                    <span className='game-continue'>CONTINUE YOUR JOURNEY</span>
                  </div>
                ) : (
                  <div className='music-content'>
                    <span>
                      EVENING SESSIONS{' '}
                      {scene === 'live' ? '/ LIVE' : '/ STUDIO'}
                    </span>
                    <h2>
                      A little room
                      <br />
                      to breathe
                    </h2>
                    <p>
                      {scene === 'live'
                        ? 'The same song. A different feeling.'
                        : 'A fictional soundtrack for a slower evening.'}
                    </p>
                    <div className='playback-line'>
                      <span />
                    </div>
                  </div>
                )}
                <div
                  className={`demo-overlay${moment.visible ? ' visible' : ''}`}
                  aria-hidden='true'
                >
                  <div className='demo-orb'>
                    <Orb
                      pattern={resolveOrb(options, moment.state)}
                      size={options.size}
                      speed={options.speed * style.speed}
                      dots={options.dots * style.dots}
                      dotSize={options.dotSize}
                      color={style.color}
                      paused={paused || reduced || !moment.visible}
                      level={level}
                    />
                  </div>
                  <div className='overlay-copy'>
                    <span>
                      {moment.state === 'working'
                        ? 'Thinking'
                        : moment.state === 'success'
                          ? 'All yours'
                          : moment.state}
                    </span>
                    <p>{moment.line}</p>
                  </div>
                  <div className='demo-beam'>
                    <VoiceBeam
                      theme='dark'
                      colorVariant='gold'
                      colors={[
                        '#ffa35c',
                        '#ffbd84',
                        '#ffe0b3',
                        '#d97545',
                        '#ffbd84'
                      ]}
                      level={level}
                      processing={moment.state === 'working'}
                      strength={options.glow}
                      paused={paused || reduced || !moment.visible}
                      active={moment.visible}
                      idle={0.025}
                      borderRadius={14}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <div className='beam-fill' />
                    </VoiceBeam>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='demo-console'>
            <div className='demo-caption' aria-live='polite' aria-atomic='true'>
              <span>
                {selected === null
                  ? 'SETTLE IN'
                  : `0${selected + 1} / ${selected === 3 ? 'AMBIENT' : 'A CONVERSATION'}`}
              </span>
              <p>{moment.visible ? moment.line : current.title}</p>
            </div>
            <div className='request-buttons' aria-label='Try a request'>
              {requests.map((request, index) => (
                <button
                  key={request.scene}
                  aria-pressed={selected === index}
                  onClick={() => choose(index)}
                >
                  {index < 3 && (
                    <span className='request-quote' aria-hidden='true'>
                      “
                    </span>
                  )}
                  {request.label}
                  {index < 3 && (
                    <span className='request-quote' aria-hidden='true'>
                      ”
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className='demo-foot'>
              <button className='story-button' onClick={playStory}>
                <span aria-hidden='true'>{playing ? 'Ⅱ' : '▶'}</span>
                {playing ? 'Stop the story' : 'Play the story'}
              </button>
              <p>Scripted preview · no microphone or API key · sound off</p>
              {scene === 'ambient' && (
                <button
                  className='next-art'
                  onClick={() => setArt((art + 1) % scenes.length)}
                >
                  Next artwork
                </button>
              )}
            </div>
          </div>
        </section>
        <section
          className='story-section'
          id='how-it-works'
          aria-labelledby='story-heading'
        >
          <div className='story-intro'>
            <p className='eyebrow'>LESS REMOTE. MORE ROOM.</p>
            <h2 id='story-heading'>
              The biggest screen in your home <br />
              should feel at home.
            </h2>
            <p>
              We got beautiful screens. Then we filled them with menus. <br />
              What if getting to what you want felt more like a conversation?
            </p>
          </div>
          <div className='story-beats'>
            <article>
              <span className='beat-number'>01 / ASK</span>
              <h3>Say it your way.</h3>
              <p>
                Ask for a music video. Correct the song. Skip ahead. Keep the
                conversation going without starting over.
              </p>
              <button
                onClick={() => {
                  choose(0)
                  experience.current?.scrollIntoView({
                    behavior: reduced ? 'instant' : 'smooth'
                  })
                }}
              >
                Try a request
              </button>
            </article>
            <article>
              <span className='beat-number'>02 / PLAY</span>
              <h3>Your screen stays yours.</h3>
              <p>
                A small presence listens, responds, and recedes. Native YouTube.
                Your Xbox on HDMI. The content takes center stage.
              </p>
              <button
                onClick={() => {
                  choose(2)
                  experience.current?.scrollIntoView({
                    behavior: reduced ? 'instant' : 'smooth'
                  })
                }}
              >
                Back to the game
              </button>
            </article>
            <article>
              <span className='beat-number'>03 / EXHALE</span>
              <h3>Let the room be a room.</h3>
              <p>
                When LG Home goes idle, personal artwork can take over. A quiet
                screen that changes the feeling of the space.
              </p>
              <button
                onClick={() => {
                  choose(3)
                  experience.current?.scrollIntoView({
                    behavior: reduced ? 'instant' : 'smooth'
                  })
                }}
              >
                See the ambient screen
              </button>
            </article>
          </div>
        </section>
        <section
          className='prototype-section'
          id='prototype'
          aria-labelledby='prototype-heading'
        >
          <div>
            <p className='eyebrow'>BUILT IN A REAL LIVING ROOM</p>
            <h2 id='prototype-heading'>A personal experiment.</h2>
            <p>
              A local controller connects OpenAI voice to an LG TV and Xbox. The
              assistant appears on the TV; your apps stay native. The first
              release is for technical owners who like making their devices
              their own.
            </p>
            <button className='primary-button' onClick={replayFromTop}>
              Try the room
            </button>
          </div>
          <div className='prototype-details'>
            <details>
              <summary>What’s real today?</summary>
              <p>
                Spoken YouTube playback, Xbox control, the baseline transparent
                TV overlay, and ambient art have worked on the owner’s TV. The
                newer Ember animation and complete recovery flow still need
                their final on-device checks.
              </p>
            </details>
            <details>
              <summary>What am I trying here?</summary>
              <p>
                A scripted simulation in a fictional room, using the project’s
                actual orb renderer and selected artwork. Music and game screens
                are fictional; timing is illustrative. The final jump to ambient
                compresses an idle wait. Nothing connects to a TV, records your
                voice, or calls an AI service.
              </p>
            </details>
            <details>
              <summary>Can I use it on my own TV?</summary>
              <p>
                This is an experimental personal project. The local setup uses
                an LG webOS TV, Developer Mode for the TV apps, and an awake
                computer on the same network. Xbox and live voice are optional.
                Broader TV compatibility is unverified.
              </p>
            </details>
            <details>
              <summary>Where’s the live AI voice?</summary>
              <p>
                It works in the local controller and voice lab with your own
                OpenAI key and microphone. This public room preview uses
                scripted requests and sample state.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer>
        <a className='wordmark' href='#top'>
          <span className='brand-orb' />
          smart tv<span className='wordmark-aside'>for real tho</span>
        </a>
        <p>A little less friction. A little more home.</p>
        <nav aria-label='Public project links'>
          {!import.meta.env.DEV && (
            <a href='./THIRD-PARTY-NOTICES.txt'>Open-source credits</a>
          )}
          <span>Source coming soon</span>
        </nav>
        {localLinks && (
          <nav aria-label='Local project tools'>
            <a href='/'>Controller</a>
            <a href='/hud/?preview=1'>Voice &amp; overlay lab</a>
            <a href='/ambient/?preview=1'>Ambient lab</a>
          </nav>
        )}
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Demo />)

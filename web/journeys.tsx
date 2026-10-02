import { useState } from 'react'
import { z } from 'zod'
import type { Trace } from '../src/contracts.js'

const journeys = [
  {
    id: 'room',
    name: '01 / Take control of the room',
    time: '2 min',
    start: 'TV awake, Xbox signed in. Keep volume zero for the silent pass.',
    steps: [
      '“Open Hades on Xbox.” → HDMI 3 and Hades; panel returns over the game.',
      '“Go to Xbox Home.” → dashboard, same HDMI.',
      '“Back to TV Home.” → LG Home; panel returns.',
      '“Set volume to zero.” → stays silent. Save audible volume checks for the optional sound pass.'
    ],
    check:
      'All destinations correct; overlay restored; no repeated spoken caveats.'
  },
  {
    id: 'music',
    name: '02 / Music, correction, and back',
    time: '3 min',
    start: 'Start on Xbox. Choose a song you have not used in setup.',
    steps: [
      '“Play [song] by [artist].” → native LG YouTube, correct upload.',
      '“No, play [another song].” → retains the artist and replaces the video.',
      '“Actually, the live version.” → changes version or asks one short clarification.',
      '“Pause.” Then “Continue.” → playback responds.',
      '“Back to Xbox.” → YouTube pauses, HDMI 3 returns, HUD returns.'
    ],
    check:
      'Real search works, context carries across corrections, speech stays brief.'
  },
  {
    id: 'player',
    name: '03 / A player that listens',
    time: '3 min',
    start: 'A normal YouTube video with captions available.',
    steps: [
      '“Go to one minute thirty.” → seek to 1:30.',
      '“Forward thirty seconds.” Then “Back ten seconds.” → relative seek.',
      '“Play at one-and-a-half speed.” Then “Normal speed.”',
      '“English captions.” Then “Captions off.”',
      '“Next track.” Then “Previous video.” → YouTube chooses from its playback context.',
      '“Turn autoplay off.” Then “Start over.”'
    ],
    check:
      'Position, speed, captions, navigation and autoplay visibly respond. Restore autoplay if desired.'
  },
  {
    id: 'interrupt',
    name: '04 / Change your mind',
    time: '2 min',
    start: 'Push-to-talk, currently on Xbox or YouTube.',
    steps: [
      'Ask for a song, then press Talk again before it finishes.',
      '“Actually, back to Xbox.” → the newer request wins.',
      'Ask for an unknown installed game. → one useful error, no invented launch.',
      'Immediately make a valid request. → session remains usable.'
    ],
    check:
      'No late old request steals the TV. An already-delivered command can briefly appear; record it.'
  },
  {
    id: 'visual',
    name: '05 / The HUD in the room',
    time: '15 min',
    start: 'Enable Restore after source changes and Show TV panel.',
    steps: [
      'Confirm assistant package 0.0.5 and its TV frame-rate report. Use the saved Ember look on cool cyan surfaces.',
      'Speak a request: observe listening, work and speech motion.',
      'Repeat over YouTube and Xbox; the native picture remains visible.',
      'Check bright and dark content from the sofa. Watch for 15 minutes: no growing stutter or stuck speaking state.',
      'Compare Full, Subtle and Static motion from the controller.',
      'Press Back on LG remote, then navigate. → input focus returns.',
      'Click Hide on the controller; switch sources. → stays hidden.',
      'Click Show to restore it. Accept the known brief launch loading screen.'
    ],
    check:
      'Text stays legible, in-place updates are smooth, no persistent black screen, Hide is respected.'
  },
  {
    id: 'rehearsal',
    name: '06 / One continuous take',
    time: '2 × 90 sec',
    start:
      'Stable server, phone camera framing TV plus your voice. Choose a second unfamiliar song.',
    steps: [
      'Take 1: “Open Hades” → request music → correct song → seek → pause → back to Xbox.',
      'Take 2: repeat with a different artist/song, without developer intervention.',
      'For the cold-start check, close native YouTube from Room diagnostics before a take.',
      'Film one uncut take after both rehearsals pass. Keep any loading time in the recording.'
    ],
    check:
      'Two complete rehearsals and a real-device recording. Optional audible/open-mic pass only when you choose to unmute.'
  },
  {
    id: 'ambient',
    name: '07 / Make room for quiet',
    time: '3 idle cycles + 2 hr soak',
    start:
      'Room Ambient 0.0.9 installed, saved guard on, automatic entry enabled. Keep the controller awake and the TV muted.',
    steps: [
      'Confirm a few of the 37 new images look correct on the TV; 52 scenes total.',
      'Close Room Ambient and go to LG Home. Leave the remote alone for about ten minutes; record actual entry time and any stock-clock flash.',
      'Press Back to hide settings, then Back to exit. Confirm dismissal is respected through the cooldown.',
      'Observe three separate Home → idle → ambient entries. Earlier logs show two; record what you physically see in this build.',
      'Keep YouTube playing, then try Xbox. Ambient must not interrupt either.',
      'Check standby/wake, controller restart, and a brief LAN interruption; reconnect without re-pairing.',
      'Leave the final build running for at least two hours. Record duration, missed images, clock takeovers, and any unexplained return to Home.'
    ],
    check:
      'Photos advance, intentional exit works, normal use is undisturbed, and recovery reuses saved setup. Record failures separately from software acceptance.'
  }
]
interface Notes {
  [id: string]: { outcome: string; note: string }
}
export function Journeys({ traces }: { traces: Trace[] }) {
  const [notes, setNotes] = useState<Notes>(() => {
    try {
      const parsed = z
        .record(
          z.string(),
          z.object({
            outcome: z.enum(['not-run', 'passed', 'rough-edge', 'failed']),
            note: z.string()
          })
        )
        .safeParse(
          JSON.parse(localStorage.getItem('smart-tv-rehearsal-v1') ?? '{}')
        )
      return parsed.success ? parsed.data : {}
    } catch {
      return {}
    }
  })
  const [saved, setSaved] = useState('Notes stay in this browser.')
  function update(id: string, field: 'outcome' | 'note', value: string) {
    const next = {
      ...notes,
      [id]: {
        outcome: notes[id]?.outcome ?? 'not-run',
        note: notes[id]?.note ?? '',
        [field]: value
      }
    }
    setNotes(next)
    try {
      localStorage.setItem('smart-tv-rehearsal-v1', JSON.stringify(next))
      setSaved('Saved in this browser.')
    } catch {
      setSaved('Browser storage unavailable. Export your notes before closing.')
    }
  }
  function download() {
    const data = {
      recordedAt: new Date().toISOString(),
      journeys: journeys.map((j) => ({
        id: j.id,
        name: j.name,
        ...notes[j.id]
      })),
      recentSoftwareTrace: traces.map(
        ({ at, action, phase, elapsedMs, requestId, mode }) => ({
          at,
          action,
          phase,
          elapsedMs,
          requestId,
          mode
        })
      )
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download =
      'smart-tv-rehearsal-' + new Date().toISOString().slice(0, 10) + '.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section className='panel journey-panel' id='journeys'>
      <p className='eyebrow'>ONE SESSION / THE WHOLE EXPERIENCE</p>
      <div className='journey-heading'>
        <div>
          <h2>The room, rehearsed.</h2>
          <p>
            Seven complete journeys. Allow 40–50 minutes together, plus idle
            cycles and a two-hour ambient run. Record what the TV actually does.
          </p>
        </div>
        <button onClick={download}>Export session notes</button>
      </div>
      {journeys.map((j) => (
        <details key={j.id} className='journey'>
          <summary>
            {j.name}
            <span>
              {j.time} · {notes[j.id]?.outcome ?? 'not run'}
            </span>
          </summary>
          <p>{j.start}</p>
          <ol>
            {j.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>
            <strong>Look for:</strong> {j.check}
          </p>
          <div className='row'>
            <label>
              Result
              <select
                value={notes[j.id]?.outcome ?? 'not-run'}
                onChange={(e) => update(j.id, 'outcome', e.target.value)}
              >
                <option value='not-run'>Not run</option>
                <option value='passed'>Passed</option>
                <option value='rough-edge'>Works with rough edges</option>
                <option value='failed'>Needs work</option>
              </select>
            </label>
            <label>
              Observation
              <input
                placeholder='One note about this journey…'
                value={notes[j.id]?.note ?? ''}
                onChange={(e) => update(j.id, 'note', e.target.value)}
              />
            </label>
          </div>
        </details>
      ))}
      <p className='muted'>
        {saved} Export includes recent software timings, not credentials or
        transcripts.
      </p>
    </section>
  )
}

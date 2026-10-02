import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { Trace } from './contracts.js'
import { defaultVisualOptions } from './visual-options.js'
import type { VisualOptions } from './visual-options.js'
import { displayReportSchema } from './display-health.js'
import type { DisplayHealth } from './display-health.js'

export type VoicePhase =
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'offline'
export type MotionMode = 'full' | 'subtle' | 'static'
export interface DisplayFrame {
  mode: 'live' | 'simulation'
  updatedAt: number
  phase: string
  title: string
  message: string
  dismiss?: boolean
  visual: string
  motion: MotionMode
  source: string
  detail: string
  appearance: VisualOptions
  inputLevel: number
  outputLevel: number
}
const titles: Record<string, string> = {
  find_youtube_video: 'Finding your video',
  play_youtube_video: 'Playing your selection',
  control_video: 'Controlling YouTube',
  seek_video: 'Seeking your video',
  set_video_speed: 'Changing playback speed',
  set_video_captions: 'Changing captions',
  set_video_autoplay: 'Changing autoplay',
  skip_video_ad: 'Skipping ad',
  start_game: 'Opening your game',
  return_to_xbox: 'Returning to Xbox',
  show_home: 'Opening Home',
  set_room_volume: 'Adjusting volume',
  change_room_volume: 'Adjusting volume'
}
const messages: Record<string, string> = {
  intent_ready: 'On it.',
  search_complete: 'Found your video',
  command_accepted: 'Working on it',
  console_command_completed: 'Opening on Xbox',
  fresh_state_observed: 'Connected',
  observed: 'Done',
  accepted: 'Request sent',
  failed: 'Something needs attention',
  superseded: 'Cancelled'
}
const working = new Set([
  'intent_ready',
  'command_accepted',
  'receiver_reconnect',
  'search_complete'
])
// Projects only selected display text. Credentials and raw trace details never enter the feed.
export class DisplayState {
  private requestId = ''
  private frame?: Omit<
    DisplayFrame,
    | 'visual'
    | 'motion'
    | 'source'
    | 'detail'
    | 'appearance'
    | 'inputLevel'
    | 'outputLevel'
  >
  private dismissRequested = true
  private voiceSession = ''
  private voiceSequence = -1
  private voicePhase: VoicePhase = 'offline'
  private voiceAt = 0
  private intent = ''
  private source = 'ROOM'
  appearance: VisualOptions = structuredClone(defaultVisualOptions)
  private levels = { input: 0, output: 0, at: 0, sequence: -1 }
  motion: MotionMode = 'full'
  autoRestore = false
  get visible() {
    return !this.dismissRequested
  }
  show() {
    this.dismissRequested = false
  }
  hide() {
    this.dismissRequested = true
    this.autoRestore = false
  }
  describe(title: string) {
    this.intent = title.slice(0, 160)
  }
  setSource(appId: string | null) {
    this.source =
      appId === 'youtube.leanback.v4' || appId === 'simulation.youtube'
        ? 'YOUTUBE'
        : appId === 'com.webos.app.hdmi3' || appId === 'simulation.hdmi3'
          ? 'XBOX / HDMI 3'
          : appId === 'com.webos.app.home' || appId === 'simulation.home'
            ? 'LG HOME'
            : 'ROOM'
  }
  startVoice(session: string) {
    this.levels = { input: 0, output: 0, at: 0, sequence: -1 }
    this.voiceSession = session
    this.voiceSequence = -1
    this.voicePhase = 'ready'
    this.voiceAt = Date.now()
  }
  voice(
    session: string,
    sequence: number,
    phase: VoicePhase,
    now = Date.now()
  ) {
    if (session !== this.voiceSession || sequence <= this.voiceSequence)
      return false
    this.voiceSequence = sequence
    this.voicePhase = phase
    this.voiceAt = now
    return true
  }
  audio(
    session: string,
    sequence: number,
    input: number,
    output: number,
    now = Date.now()
  ) {
    if (
      session !== this.voiceSession ||
      !session ||
      sequence <= this.levels.sequence
    )
      return false
    if (
      ![input, output].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1
      )
    )
      return false
    this.levels = { input, output, at: now, sequence }
    return true
  }
  update(event: Trace) {
    const title = titles[event.action]
    if (!title) return
    if (event.phase === 'intent_ready') this.requestId = event.requestId
    if (event.requestId !== this.requestId) return
    this.frame = {
      mode: event.mode ?? 'live',
      updatedAt: event.at,
      phase: event.phase,
      title,
      message:
        event.action === 'find_youtube_video' && event.phase === 'observed'
          ? 'Search results ready'
          : (messages[event.phase] ?? 'Working on it')
    }
  }
  reset() {
    this.requestId = ''
    this.frame = undefined
    this.dismissRequested = true
    this.autoRestore = false
    this.voiceSession = ''
    this.voicePhase = 'offline'
    this.intent = ''
    this.source = 'ROOM'
  }
  snapshot(mode: DisplayFrame['mode'], now = Date.now()): DisplayFrame {
    const recent =
      this.frame &&
      now - this.frame.updatedAt <
        (working.has(this.frame.phase) ? 40000 : 12000)
        ? this.frame
        : undefined
    const voice = now - this.voiceAt < 30000 ? this.voicePhase : 'offline'
    let visual = recent
      ? working.has(recent.phase)
        ? 'working'
        : recent.phase === 'failed'
          ? 'error'
          : recent.phase === 'observed'
            ? 'success'
            : 'idle'
      : 'idle'
    if (voice === 'listening' || voice === 'speaking') visual = voice
    else if (!recent && voice === 'thinking') visual = 'working'
    const title =
      visual === 'listening'
        ? 'I’m listening.'
        : (recent?.title ??
          (visual === 'speaking'
            ? 'Right here with you.'
            : 'Your room. Your software.'))
    return {
      mode,
      dismiss: this.dismissRequested,
      updatedAt: recent?.updatedAt ?? this.voiceAt,
      phase: recent?.phase ?? 'idle',
      title,
      message:
        visual === 'listening'
          ? 'Say what you have in mind.'
          : (recent?.message ??
            (voice === 'offline'
              ? 'Ready when you are'
              : 'Ask for something good.')),
      visual,
      motion: this.motion,
      source: this.source,
      detail: recent ? this.intent : '',
      appearance: structuredClone(this.appearance),
      inputLevel:
        voice === 'listening' && now - this.levels.at < 750
          ? this.levels.input
          : 0,
      outputLevel:
        voice === 'speaking' && now - this.levels.at < 750
          ? this.levels.output
          : 0
    }
  }
}
export interface DisplayFeed {
  server: Server
  token: string
  url: string
  health: () => DisplayHealth
}
export async function startDisplayFeed(
  host: string,
  port: number,
  snapshot: () => DisplayFrame
): Promise<DisplayFeed> {
  const token = randomBytes(32).toString('base64url')
  const expected = Buffer.from('Bearer ' + token)
  const health: DisplayHealth = {
    lastSeen: null,
    reportedAt: null,
    report: null
  }
  const server = createServer((req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff'
      })
      res.end(JSON.stringify(data))
    }
    if (req.url !== '/display/state') {
      send(404, { error: 'Not found' })
      return
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Authorization, X-Room-Display',
        'Access-Control-Max-Age': '300'
      })
      res.end()
      return
    }
    if (req.method !== 'GET') {
      send(405, { error: 'Read-only display' })
      return
    }
    const supplied = Buffer.from(req.headers.authorization ?? '')
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      send(401, { error: 'Display authorization required' })
      return
    }
    health.lastSeen = Date.now()
    const report = req.headers['x-room-display']
    if (typeof report === 'string' && report.length <= 512) {
      try {
        const parsed = displayReportSchema.safeParse(JSON.parse(report))
        if (parsed.success) {
          health.report = parsed.data
          health.reportedAt = health.lastSeen
        }
      } catch {
        // A diagnostic must never interrupt the presentation feed.
      }
    }
    send(200, snapshot())
  })
  server.requestTimeout = 5000
  server.headersTimeout = 5000
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Display listener unavailable')
  return {
    server,
    token,
    health: () => structuredClone(health),
    url: 'http://' + host + ':' + address.port + '/display/state'
  }
}

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { Trace } from './contracts.js'

export interface DisplayFrame {
  mode: 'live' | 'simulation'
  updatedAt: number
  phase: string
  title: string
  message: string
  dismiss?: boolean
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
  intent_ready: 'Request received',
  search_complete: 'Search results ready',
  command_accepted: 'Command sent · checking the device',
  console_command_completed: 'Console command completed · title unavailable',
  fresh_state_observed: 'Device state received',
  observed: 'Device state confirmed',
  accepted: 'Command accepted · visible result not verified',
  failed: 'Could not confirm the request · check the controller',
  superseded: 'Request cancelled'
}
// Deliberately accepts traces, not config, tokens, raw errors or device snapshots.
export class DisplayState {
  private requestId = ''
  private frame?: DisplayFrame
  private dismissRequested = true
  show() {
    this.dismissRequested = false
  }
  hide() {
    this.dismissRequested = true
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
          ? 'Search results ready · nothing played yet'
          : (messages[event.phase] ?? 'Working on your request')
    }
  }
  reset() {
    this.requestId = ''
    this.frame = undefined
    this.dismissRequested = true
  }
  snapshot(mode: DisplayFrame['mode'], now = Date.now()): DisplayFrame {
    if (!this.frame || now - this.frame.updatedAt > 60000)
      return {
        mode,
        dismiss: this.dismissRequested,
        updatedAt: now,
        phase: 'idle',
        title: 'Your room. Your software.',
        message: 'Waiting for a request'
      }
    return { ...this.frame, mode, dismiss: this.dismissRequested }
  }
}
export interface DisplayFeed {
  server: Server
  token: string
  url: string
}
export async function startDisplayFeed(
  host: string,
  port: number,
  snapshot: () => DisplayFrame
): Promise<DisplayFeed> {
  const token = randomBytes(32).toString('base64url')
  const expected = Buffer.from('Bearer ' + token)
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
        'Access-Control-Allow-Headers': 'Authorization',
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
    url: 'http://' + host + ':' + address.port + '/display/state'
  }
}

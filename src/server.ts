import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import pMap from 'p-map'
import { createServer as createViteServer } from 'vite'
import { z } from 'zod'
import { serveAmbient } from './ambient-assets.js'
import { ambientCommandSchema } from './ambient-options.js'
import { Bridge } from './bridge.js'
import { configSchema, toolNames } from './contracts.js'
import type { Result, Trace } from './contracts.js'
import { Coordinator } from './coordinator.js'
import { DisplayState, startDisplayFeed } from './display.js'
import { visualOptionsSchema } from './visual-options.js'
import { createSession } from './realtime.js'
import { YouTubeSearch } from './search.js'
import {
  displayDeviceStatus,
  installDisplay,
  installAmbient,
  uninstallOverlayProbe
} from './tv-package.js'
import { Simulation } from './simulation.js'
import { readConfig, readLocal, secretsSchema, writeLocal } from './storage.js'

let config = await readConfig()
let secrets = secretsSchema.parse((await readLocal('secrets.json')) ?? {})
const port = z.coerce
  .number()
  .int()
  .min(1024)
  .max(65535)
  .parse(process.env.PORT ?? 3210)
const origins = new Set([
  'http://127.0.0.1:' + port,
  'http://localhost:' + port
])
const traces: Trace[] = []
const displayState = new DisplayState()
const savedAppearance = visualOptionsSchema.safeParse(
  await readLocal('display-appearance.json')
)
if (savedAppearance.success) displayState.appearance = savedAppearance.data
await mkdir('.local', { recursive: true, mode: 0o700 })
let logWrites = Promise.resolve()
function trace(event: Trace) {
  const entry = { ...event, mode: config.mode }
  displayState.update(entry)
  traces.push(entry)
  if (traces.length > 100) traces.shift()
  logWrites = logWrites
    .then(() =>
      appendFile('.local/trace.jsonl', JSON.stringify(entry) + '\n', {
        mode: 0o600
      })
    )
    .catch(() => {
      console.error('Trace could not be written.')
    })
}
const openaiKey = () => secrets.openai || process.env.OPENAI_API_KEY
const youtubeKey = () => secrets.youtube || process.env.YOUTUBE_API_KEY
function makeCoordinator() {
  const room =
    config.mode === 'simulation'
      ? {
          ...config,
          youtubeAppId: 'simulation.youtube',
          xboxInputId: 'simulation.hdmi3',
          xboxInputAppId: 'simulation.hdmi3',
          games: { 'Demo game': 'simulation.game' }
        }
      : config
  return new Coordinator(
    config.mode === 'simulation' ? new Simulation(room) : new Bridge(),
    new YouTubeSearch(youtubeKey, () => config.region),
    room,
    trace
  )
}
let coordinator = makeCoordinator()
let boot: unknown[] = []
async function reconnect() {
  if (config.mode === 'simulation') {
    boot = []
    return
  }
  const active = coordinator
  const jobs = [
    ...(config.tvHost
      ? [{ method: 'tv.connect', params: { host: config.tvHost } }]
      : []),
    ...(config.consoleId
      ? [{ method: 'xbox.catalog', params: { consoleId: config.consoleId } }]
      : [])
  ]
  const results = await pMap(
    jobs,
    async (job) => {
      try {
        await active.devices.request(job.method, job.params)
        return { device: job.method, connected: true }
      } catch (err) {
        return {
          device: job.method,
          connected: false,
          message: err instanceof Error ? err.message : 'Reconnect failed'
        }
      }
    },
    { concurrency: 2 }
  )
  if (active === coordinator) {
    boot = results
    await active.execute('get_room_state', {})
    if (active === coordinator) displayState.setSource(active.state.tv.appId)
  }
}
void reconnect()
// Opt-in, separate read-only listener. The full control API remains loopback-only.
const displayHost = process.env.TV_DISPLAY_HOST
  ? z
      .ipv4()
      .refine((host) => {
        const [a, b] = host.split('.').map(Number)
        return (
          a === 10 ||
          (a === 192 && b === 168) ||
          (a === 172 && b! >= 16 && b! <= 31)
        )
      }, 'Use this laptop’s private LAN IPv4 address.')
      .parse(process.env.TV_DISPLAY_HOST)
  : undefined
const displayFeed = displayHost
  ? await startDisplayFeed(
      displayHost,
      z.coerce
        .number()
        .int()
        .min(1024)
        .max(65535)
        .parse(process.env.TV_DISPLAY_PORT ?? 3212),
      () => displayState.snapshot(config.mode)
    )
  : undefined
const calls = new Map<string, Promise<Result>>()
async function body(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk as Uint8Array)
    size += buffer.length
    if (size > 65536) throw new Error('Request too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}
function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(data))
}
const setupSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('tv.connect'), host: z.ipv4() }),
  z.object({
    action: z.literal('youtube.pair'),
    code: z.string().regex(/^[\d -]{8,30}$/)
  }),
  z.object({ action: z.literal('youtube.connect') }),
  z.object({ action: z.literal('xbox.auth') }),
  z.object({
    action: z.literal('xbox.catalog'),
    consoleId: z.string().max(200).optional()
  })
])
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa'
})
const server = createServer(async (req, res) => {
  const host = req.headers.host
  if (!host || !origins.has('http://' + host)) {
    json(res, { error: 'Unexpected host' }, 403)
    return
  }
  const path = new URL(req.url ?? '/', 'http://' + host).pathname
  if (await serveAmbient(req, res, path)) return
  const hudAssets: Record<string, [string, string]> = {
    '/hud/': ['index.html', 'text/html'],
    '/hud/index.html': ['index.html', 'text/html'],
    '/hud/display.js': ['display.js', 'text/javascript'],
    '/hud/display.css': ['display.css', 'text/css'],
    '/hud/assets/visuals.js': ['assets/visuals.js', 'text/javascript'],
    '/hud/assets/visuals.css': ['assets/visuals.css', 'text/css']
  }
  if (req.method === 'GET' && hudAssets[path]) {
    const [file, type] = hudAssets[path]
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
    res.end(await readFile('tv/display/' + file))
    return
  }
  if (!path.startsWith('/api/')) {
    vite.middlewares(req, res)
    return
  }
  if (
    (req.headers.origin && !origins.has(req.headers.origin)) ||
    (req.method === 'POST' && !origins.has(req.headers.origin ?? ''))
  ) {
    json(res, { error: 'Unexpected origin' }, 403)
    return
  }
  try {
    if (req.method === 'GET' && path === '/api/status') {
      const pairing =
        config.mode === 'live'
          ? await coordinator.devices.request('status')
          : {}
      json(res, {
        config,
        pairing,
        credentials: {
          openai: Boolean(openaiKey()),
          youtube: Boolean(youtubeKey())
        },
        boot,
        display: {
          enabled: Boolean(displayFeed),
          autoRestore: displayState.autoRestore,
          motion: displayState.motion,
          frame: displayState.snapshot(config.mode)
        },
        state: coordinator.state,
        traces,
        gameAliases: Object.keys(coordinator.config.games),
        candidates: coordinator.candidates
      })
    } else if (req.method === 'POST' && path === '/api/tool') {
      const input = z
        .object({
          name: z.enum(toolNames),
          arguments: z.unknown(),
          callId: z.string().max(100).optional()
        })
        .parse(await body(req))
      const callId = input.callId ?? randomUUID()
      let pending = calls.get(callId)
      if (!pending) {
        const args = input.arguments as Record<string, unknown> | null
        if (input.name === 'play_youtube_video')
          displayState.describe(
            coordinator.candidates.find(
              (c) => c.candidateId === args?.candidate_id
            )?.title ?? ''
          )
        else if (input.name === 'find_youtube_video')
          displayState.describe(
            [args?.artist, args?.song]
              .filter((x) => typeof x === 'string')
              .join(' · ')
          )
        else if (input.name === 'start_game')
          displayState.describe(
            typeof args?.game_alias === 'string' ? args.game_alias : ''
          )
        else displayState.describe('')
        const current = coordinator
        pending = coordinator.execute(input.name, input.arguments)
        const generation = current.generation
        void pending.then(async (result) => {
          if (current !== coordinator || generation !== current.generation)
            return
          displayState.setSource(current.state.tv.appId)
          if (
            displayFeed &&
            displayState.autoRestore &&
            displayState.visible &&
            [
              'play_youtube_video',
              'return_to_xbox',
              'start_game',
              'show_home'
            ].includes(input.name) &&
            ['observed', 'accepted'].includes(result.outcome)
          ) {
            try {
              await current.restoreDisplay(
                { url: displayFeed.url, token: displayFeed.token },
                generation,
                () =>
                  current === coordinator &&
                  displayState.autoRestore &&
                  displayState.visible
              )
            } catch {
              console.warn(
                'TV panel restore unavailable; use Show in the controller.'
              )
            }
          }
        })
        calls.set(callId, pending)
        if (calls.size > 500) calls.delete(calls.keys().next().value!)
      }
      json(res, await pending)
    } else if (req.method === 'GET' && path === '/api/display/frame') {
      json(res, displayState.snapshot(config.mode))
    } else if (req.method === 'POST' && path === '/api/display/appearance') {
      const appearance = visualOptionsSchema.parse(await body(req))
      await writeLocal('display-appearance.json', appearance)
      displayState.appearance = appearance
      json(res, { saved: true })
    } else if (req.method === 'GET' && path === '/api/display/device-status') {
      json(res, await displayDeviceStatus())
    } else if (req.method === 'POST' && path === '/api/display/install') {
      z.object({})
        .strict()
        .parse(await body(req))
      if (config.mode !== 'live')
        throw new Error('Exit simulation before installing on TV.')
      json(res, await installDisplay())
    } else if (req.method === 'POST' && path === '/api/probe/uninstall') {
      z.object({})
        .strict()
        .parse(await body(req))
      if (config.mode !== 'live')
        throw new Error('Exit simulation before removing a TV app.')
      json(res, await uninstallOverlayProbe())
    } else if (req.method === 'POST' && path === '/api/ambient/install') {
      z.object({})
        .strict()
        .parse(await body(req))
      if (config.mode !== 'live')
        throw new Error('Exit simulation before installing on TV.')
      json(res, await installAmbient())
    } else if (req.method === 'POST' && path === '/api/ambient/control') {
      const command = ambientCommandSchema.parse(await body(req))
      if (config.mode === 'live' && command.action === 'launch')
        displayState.hide()
      json(res, await coordinator.controlAmbient(command))
    } else if (req.method === 'POST' && path === '/api/display/options') {
      const options = z
        .object({
          motion: z.enum(['full', 'subtle', 'static']),
          autoRestore: z.boolean()
        })
        .strict()
        .parse(await body(req))
      displayState.motion = options.motion
      displayState.autoRestore = options.autoRestore
      json(res, { saved: true })
    } else if (req.method === 'POST' && path === '/api/display/audio') {
      const event = z
        .object({
          session: z.string().uuid(),
          sequence: z.number().int().nonnegative(),
          input: z.number().min(0).max(1),
          output: z.number().min(0).max(1)
        })
        .strict()
        .parse(await body(req))
      json(res, {
        accepted: displayState.audio(
          event.session,
          event.sequence,
          event.input,
          event.output
        )
      })
    } else if (req.method === 'POST' && path === '/api/display/voice') {
      const event = z
        .object({
          session: z.string().uuid(),
          sequence: z.number().int().nonnegative(),
          phase: z.enum([
            'ready',
            'listening',
            'thinking',
            'speaking',
            'offline'
          ])
        })
        .strict()
        .parse(await body(req))
      json(res, {
        accepted: displayState.voice(event.session, event.sequence, event.phase)
      })
    } else if (req.method === 'POST' && path === '/api/cancel') {
      coordinator.cancel()
      json(res, { cancelled: true })
    } else if (req.method === 'POST' && path === '/api/config') {
      const next = configSchema.parse(await body(req))
      await writeLocal('config.json', next)
      coordinator.cancel()
      coordinator.devices.close()
      config = next
      coordinator = makeCoordinator()
      calls.clear()
      displayState.reset()
      void reconnect()
      json(res, { saved: true })
    } else if (req.method === 'POST' && path === '/api/secrets') {
      const values = secretsSchema.parse(await body(req))
      secrets = { ...secrets, ...values }
      await writeLocal('secrets.json', secrets)
      json(res, { saved: true })
    } else if (req.method === 'POST' && path === '/api/setup') {
      if (config.mode !== 'live')
        throw new Error('Exit simulation before pairing real devices.')
      const { action, ...params } = setupSchema.parse(await body(req))
      json(res, await coordinator.devices.request(action, params))
    } else if (req.method === 'POST' && path === '/api/display/overlay') {
      const { action } = z
        .object({ action: z.enum(['launch', 'close']) })
        .strict()
        .parse(await body(req))
      if (!displayFeed)
        throw new Error(
          'Start the controller with TV_DISPLAY_HOST set to this laptop’s LAN IP.'
        )
      if (action === 'close') {
        // The TV app closes itself; hiding feedback must not cancel media work.
        displayState.hide()
        json(res, {
          requestId: randomUUID(),
          outcome: 'accepted',
          message:
            'Dismissal requested through the display feed. Check the TV; live panel version 0.0.2 or later is required.'
        })
      } else {
        if (config.mode !== 'live')
          throw new Error('Exit simulation before showing the TV panel.')
        displayState.show()
        await coordinator.restoreDisplay(
          { url: displayFeed.url, token: displayFeed.token },
          coordinator.generation,
          () => displayState.visible
        )
        json(res, {
          requestId: randomUUID(),
          outcome: 'accepted',
          message: 'TV panel requested.'
        })
      }
    } else if (req.method === 'POST' && path === '/api/probe/overlay') {
      const { action } = z
        .object({ action: z.enum(['launch', 'close']) })
        .strict()
        .parse(await body(req))
      json(res, await coordinator.probeOverlay(action))
    } else if (req.method === 'POST' && path === '/api/probe/youtube-close') {
      z.object({})
        .strict()
        .parse(await body(req))
      json(res, await coordinator.closeYoutubeForProbe())
    } else if (req.method === 'POST' && path === '/api/probe/video') {
      const { videoId } = z
        .object({ videoId: z.string().regex(/^[\w-]{11}$/) })
        .parse(await body(req))
      coordinator.cancel()
      const candidateId = randomUUID()
      coordinator.candidates = [
        {
          candidateId,
          videoId,
          title: 'Diagnostic video',
          channel: 'Known ID probe; not search',
          generation: coordinator.generation
        }
      ]
      trace({
        at: Date.now(),
        requestId: candidateId,
        action: 'diagnostic_video',
        phase: 'known_id',
        elapsedMs: 0
      })
      json(
        res,
        await coordinator.execute('play_youtube_video', {
          candidate_id: candidateId
        })
      )
    } else if (req.method === 'POST' && path === '/api/session') {
      const input = z
        .object({
          sdp: z.string().min(10).max(60000),
          openMic: z.boolean().default(false)
        })
        .parse(await body(req))
      const key = openaiKey()
      if (!key) throw new Error('Add an OpenAI API key in setup.')
      const answer = await createSession(
        input.sdp,
        key,
        coordinator.config,
        input.openMic
      )
      if (res.destroyed) return
      const displaySession = randomUUID()
      displayState.startVoice(displaySession)
      res.writeHead(200, {
        'X-Display-Session': displaySession,
        'Content-Type': 'application/sdp',
        'Cache-Control': 'no-store'
      })
      res.end(answer)
    } else {
      json(res, { error: 'Not found' }, 404)
    }
  } catch (err) {
    json(
      res,
      {
        error:
          err instanceof z.ZodError
            ? 'Invalid request fields.'
            : err instanceof Error
              ? err.message
              : 'Request failed.'
      },
      400
    )
  }
})
server.listen(port, '127.0.0.1', () =>
  console.log('Smart TV (' + config.mode + '): http://localhost:' + port)
)
async function shutdown() {
  coordinator.cancel()
  coordinator.devices.close()
  server.close()
  displayFeed?.server.closeAllConnections()
  displayFeed?.server.close()
  await vite.close()
  await logWrites
  process.exit(0)
}
process.on('SIGINT', () => {
  void shutdown()
})
process.on('SIGTERM', () => {
  void shutdown()
})

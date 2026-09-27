import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { argsSchemas, emptyState, stateSchema } from './contracts.js'
import type {
  Candidate,
  Config,
  Devices,
  Result,
  RoomState,
  Search,
  ToolName,
  Trace
} from './contracts.js'

class Lane {
  private tail: Promise<unknown> = Promise.resolve()
  async run<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
    const next = this.tail
      .catch(() => {})
      .then(async () => {
        signal.throwIfAborted()
        return fn()
      })
    this.tail = next
    return next
  }
}
interface Operation {
  id: string
  action: string
  started: number
  signal: AbortSignal
  generation: number
}
export class Coordinator {
  state = emptyState()
  candidates: Candidate[] = []
  context = { song: '', artist: '', version: '' }
  generation = 0
  private media = new AbortController()
  private readonly sourceLane = new Lane()
  private readonly volumeLane = new Lane()
  constructor(
    readonly devices: Devices,
    readonly search: Search,
    readonly config: Config,
    private readonly emit: (trace: Trace) => void
  ) {}
  cancel() {
    this.media.abort(new Error('Superseded by a newer request'))
    this.media = new AbortController()
    this.generation++
  }
  private log(op: Operation, phase: string, detail?: string) {
    this.emit({
      at: Date.now(),
      requestId: op.id,
      action: op.action,
      phase,
      elapsedMs: Date.now() - op.started,
      detail
    })
  }
  private async read(op: Operation) {
    op.signal.throwIfAborted()
    const state = stateSchema.parse(
      await this.devices.request(
        'state',
        {
          includeXbox:
            op.action === 'start_game' || op.action === 'get_room_state'
        },
        op.signal
      )
    )
    op.signal.throwIfAborted()
    this.state = state
    return state
  }
  private async effect(
    op: Operation,
    method: string,
    params: Record<string, unknown> = {}
  ) {
    return this.sourceLane.run(op.signal, async () => {
      await this.devices.request(method, params, op.signal)
      op.signal.throwIfAborted()
      this.log(op, 'command_accepted', method)
    })
  }
  private async observe(
    op: Operation,
    predicate: (state: RoomState) => boolean
  ) {
    while (true) {
      const state = await this.read(op)
      if (predicate(state)) {
        this.log(op, 'fresh_state_observed')
        return state
      }
      await delay(250, undefined, { signal: op.signal })
    }
  }
  private requireSetting(value: string, label: string) {
    if (!value) throw new Error('Complete setup: ' + label)
    return value
  }
  private async xboxInput(op: Operation) {
    const expected = this.requireSetting(
      this.config.xboxInputAppId,
      'discover the Xbox input app ID'
    )
    await this.effect(op, 'tv.input', {
      id: this.requireSetting(
        this.config.xboxInputId,
        'choose the Xbox HDMI input'
      )
    })
    return this.observe(
      op,
      (s) =>
        s.tv.connected &&
        s.tv.appId === expected &&
        s.tv.observedAt >= op.started
    )
  }
  async execute(name: ToolName, raw: unknown): Promise<Result> {
    const started = Date.now(),
      id = randomUUID()
    const parsed = argsSchemas[name].safeParse(raw)
    if (!parsed.success)
      return {
        requestId: id,
        outcome: 'failed',
        message:
          'Invalid arguments: ' +
          parsed.error.issues
            .map((i) => i.path.join('.') + ' ' + i.message)
            .join('; ')
      }
    const isMedia = ![
      'get_room_state',
      'set_room_volume',
      'change_room_volume'
    ].includes(name)
    let candidate: Candidate | undefined
    if (name === 'play_youtube_video') {
      const { candidate_id: candidateId } =
        argsSchemas.play_youtube_video.parse(raw)
      candidate = this.candidates.find((c) => c.candidateId === candidateId)
      if (!candidate)
        return {
          requestId: id,
          outcome: 'failed',
          message: 'Candidate unknown or superseded. Search again.'
        }
    }
    if (isMedia) {
      this.cancel()
      this.candidates = []
    }
    const signal = AbortSignal.any([
      AbortSignal.timeout(this.config.timeoutMs),
      ...(isMedia ? [this.media.signal] : [])
    ])
    const op = {
      id,
      action: name,
      started,
      signal,
      generation: this.generation
    }
    this.log(op, 'intent_ready')
    try {
      let data: unknown
      let outcome: Result['outcome'] = 'observed'
      switch (name) {
        case 'get_room_state':
          data = await this.read(op)
          break
        case 'find_youtube_video': {
          const args = argsSchemas.find_youtube_video.parse(raw)
          const context = {
            song: args.song ?? this.context.song,
            artist: args.artist ?? this.context.artist,
            version: args.version ?? this.context.version
          }
          if (!context.song) throw new Error('Ask which song to play.')
          this.context = context
          const videos = await this.search.find(
            [context.song, context.artist, context.version || 'music video']
              .filter(Boolean)
              .join(' '),
            signal
          )
          signal.throwIfAborted()
          this.candidates = videos.map((v) => ({
            ...v,
            candidateId: randomUUID(),
            generation: this.generation
          }))
          data = {
            context,
            candidates: this.candidates.map(
              ({ generation: _generation, ...c }) => c
            )
          }
          this.log(op, 'search_complete')
          break
        }
        case 'play_youtube_video': {
          if (!candidate) throw new Error('Search first.')
          const appId = this.requireSetting(
            this.config.youtubeAppId,
            'discover native YouTube'
          )
          const before = await this.read(op)
          if (!before.tv.connected)
            throw new Error('TV unavailable. Pair or reconnect the LG first.')
          if (before.tv.appId !== appId)
            await this.effect(op, 'tv.launch', { id: appId })
          await this.observe(
            op,
            (s) =>
              s.tv.connected &&
              s.tv.appId === appId &&
              s.tv.observedAt >= started
          )
          await this.effect(op, 'youtube.connect')
          const receiver = z
            .object({ receiverId: z.string().min(1) })
            .parse(
              await this.devices.request('youtube.identity', {}, signal)
            ).receiverId
          const sentAt = Date.now()
          await this.effect(op, 'youtube.play', { videoId: candidate.videoId })
          data = await this.observe(
            op,
            (s) =>
              s.tv.appId === appId &&
              s.tv.connected &&
              s.tv.observedAt >= sentAt &&
              s.youtube.connected &&
              s.youtube.receiverId === receiver &&
              s.youtube.observedAt >= sentAt &&
              s.youtube.videoId === candidate.videoId &&
              s.youtube.playback === 'Playing'
          )
          break
        }
        case 'set_room_volume':
        case 'change_room_volume':
          data = await this.volumeLane.run(signal, async () => {
            const before = await this.read(op)
            if (!before.tv.connected || before.tv.volume === null)
              throw new Error('A fresh TV volume reading is required.')
            const level =
              name === 'set_room_volume'
                ? argsSchemas.set_room_volume.parse(raw).level
                : before.tv.volume +
                  argsSchemas.change_room_volume.parse(raw).delta
            const bounded = Math.min(this.config.maxVolume, Math.max(0, level))
            await this.devices.request('tv.volume', { level: bounded }, signal)
            this.log(op, 'command_accepted', 'tv.volume')
            return this.observe(
              op,
              (s) =>
                s.tv.connected &&
                s.tv.volume === bounded &&
                s.tv.observedAt >= started
            )
          })
          break

        case 'start_game': {
          const alias = argsSchemas.start_game.parse(raw).game_alias
          const productId = this.config.games[alias]
          if (!productId)
            throw new Error('Choose an installed game alias in setup.')
          await this.effect(op, 'xbox.launch', { productId })
          await this.xboxInput(op)
          data = await this.observe(
            op,
            (s) =>
              s.xbox.connected &&
              s.xbox.activeTitle === productId &&
              s.xbox.observedAt >= started &&
              s.tv.appId === this.config.xboxInputAppId
          )
          break
        }
        case 'show_home': {
          const { target } = argsSchemas.show_home.parse(raw)
          await this.effect(op, target + '.home')
          if (target === 'xbox') await this.xboxInput(op)
          outcome = 'accepted'
          data = await this.read(op)
          break
        }
        case 'control_video': {
          const { action } = argsSchemas.control_video.parse(raw)
          const before = await this.read(op)
          if (
            !before.youtube.connected ||
            before.tv.appId !== this.config.youtubeAppId
          )
            throw new Error(
              'Native YouTube is not connected in the foreground.'
            )
          const sentAt = Date.now()
          await this.effect(op, 'youtube.' + action)
          data = await this.observe(
            op,
            (s) =>
              s.tv.connected &&
              s.tv.appId === this.config.youtubeAppId &&
              s.youtube.connected &&
              s.youtube.receiverId === before.youtube.receiverId &&
              s.youtube.videoId === before.youtube.videoId &&
              s.youtube.observedAt >= sentAt &&
              s.youtube.playback === (action === 'pause' ? 'Paused' : 'Playing')
          )
          break
        }
        case 'return_to_xbox': {
          const before = await this.read(op)
          if (before.tv.appId === this.config.youtubeAppId) {
            if (!before.youtube.connected)
              throw new Error(
                'Cannot confirm YouTube pause. Reconnect the receiver first.'
              )
            const sentAt = Date.now()
            await this.effect(op, 'youtube.pause')
            await this.observe(
              op,
              (s) =>
                s.youtube.connected &&
                s.youtube.receiverId === before.youtube.receiverId &&
                s.youtube.observedAt >= sentAt &&
                s.youtube.playback === 'Paused'
            )
          }
          data = await this.xboxInput(op)
          break
        }
      }
      signal.throwIfAborted()
      this.log(op, outcome)
      return {
        requestId: id,
        outcome,
        message:
          name === 'get_room_state'
            ? 'Snapshot read. Check each device connection and observation timestamp.'
            : name === 'find_youtube_video'
              ? 'Search results ready; nothing has been played.'
              : outcome === 'observed'
                ? 'State observed; physical picture and audio still require verification.'
                : 'Command accepted; visible result not verified.',
        data
      }
    } catch (err) {
      const superseded = isMedia && op.generation !== this.generation
      const message = superseded
        ? 'Superseded by a newer request.'
        : signal.aborted
          ? 'Timed out before the requested state was observed. Check the device before retrying.'
          : err instanceof Error
            ? err.message
            : 'Operation failed.'
      this.log(op, superseded ? 'superseded' : 'failed', message)
      return {
        requestId: id,
        outcome: superseded ? 'superseded' : 'failed',
        message
      }
    }
  }
}

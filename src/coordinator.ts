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
      const result = await this.devices.request(method, params, op.signal)
      op.signal.throwIfAborted()
      this.log(op, 'command_accepted', method)
      return result
    })
  }
  private async observe(
    op: Operation,
    predicate: (state: RoomState) => boolean,
    reconnectReceiver = false
  ) {
    let reconnected = false
    while (true) {
      const state = await this.read(op)
      if (predicate(state)) {
        this.log(op, 'fresh_state_observed')
        return state
      }
      if (
        reconnectReceiver &&
        !reconnected &&
        !state.youtube.connected &&
        state.tv.connected &&
        state.tv.appId === this.config.youtubeAppId &&
        state.tv.observedAt >= op.started
      ) {
        reconnected = true
        this.log(op, 'receiver_reconnect')
        await this.effect(op, 'youtube.connect')
        continue
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
  async probeOverlay(
    action: 'launch' | 'close',
    display?: { url: string; token: string }
  ): Promise<Result> {
    const id = randomUUID()
    if (this.config.mode !== 'live')
      return {
        requestId: id,
        outcome: 'failed',
        message: 'Overlay probes require live device mode.'
      }
    this.cancel()
    this.candidates = []
    const op: Operation = {
      id,
      action: 'overlay_' + action,
      started: Date.now(),
      generation: this.generation,
      signal: AbortSignal.any([
        this.media.signal,
        AbortSignal.timeout(this.config.timeoutMs)
      ])
    }
    this.log(op, 'intent_ready')
    try {
      const before = await this.read(op)
      if (!before.tv.connected)
        throw new Error('Reconnect the LG before testing the overlay.')
      const params: Record<string, unknown> = { action }
      if (display) {
        params.target = 'display'
        params.params = display
      }
      await this.effect(op, 'tv.overlay', params)
      const after = await this.read(op)
      this.log(op, 'accepted')
      return {
        requestId: id,
        outcome: 'accepted',
        message:
          'Overlay ' +
          action +
          ' accepted. Check the physical TV; foreground snapshots do not prove overlay visibility.',
        data: { before, after }
      }
    } catch (err) {
      const superseded = op.generation !== this.generation
      const outcome = superseded ? 'superseded' : 'failed'
      const message = superseded
        ? 'Superseded by a newer request.'
        : op.signal.aborted
          ? 'Overlay probe timed out. Check the TV before retrying.'
          : err instanceof Error
            ? err.message
            : 'Overlay probe failed.'
      this.log(op, outcome, message)
      return { requestId: id, outcome, message }
    }
  }
  async restoreDisplay(
    display: { url: string; token: string },
    generation: number,
    active: () => boolean
  ): Promise<void> {
    const signal = AbortSignal.any([
      this.media.signal,
      AbortSignal.timeout(8000)
    ])
    await this.sourceLane.run(signal, async () => {
      if (
        !active() ||
        generation !== this.generation ||
        this.config.mode !== 'live'
      )
        return
      await this.devices.request(
        'tv.overlay',
        { action: 'launch', target: 'display', params: display },
        signal
      )
    })
  }
  async closeYoutubeForProbe(): Promise<Result> {
    const id = randomUUID()
    if (
      this.config.mode !== 'live' ||
      this.config.youtubeAppId !== 'youtube.leanback.v4'
    )
      return {
        requestId: id,
        outcome: 'failed',
        message:
          'This close/reopen probe requires live mode and the discovered native LG YouTube app.'
      }
    this.cancel()
    this.candidates = []
    const op: Operation = {
      id,
      action: 'youtube_close_probe',
      started: Date.now(),
      generation: this.generation,
      signal: AbortSignal.any([
        this.media.signal,
        AbortSignal.timeout(this.config.timeoutMs)
      ])
    }
    this.log(op, 'intent_ready')
    try {
      const before = await this.read(op)
      if (!before.tv.connected || before.tv.appId !== this.config.youtubeAppId)
        throw new Error(
          'Open native LG YouTube before running the close/reopen probe.'
        )
      const sentAt = Date.now()
      await this.effect(op, 'tv.close_youtube')
      const after = await this.observe(
        op,
        (s) =>
          s.tv.connected &&
          s.tv.observedAt >= sentAt &&
          Boolean(s.tv.appId) &&
          s.tv.appId !== this.config.youtubeAppId
      )
      this.log(op, 'observed')
      return {
        requestId: id,
        outcome: 'observed',
        message:
          'LG accepted YouTube close and reports another foreground app. Run the playback probe to test reopening; this is not a TV power-cycle test.',
        data: { before, after }
      }
    } catch (err) {
      const outcome =
        op.generation !== this.generation ? 'superseded' : 'failed'
      const message =
        outcome === 'superseded'
          ? 'Superseded by a newer request.'
          : op.signal.aborted
            ? 'YouTube close was not confirmed before the deadline. Read current state before retrying.'
            : err instanceof Error
              ? err.message
              : 'YouTube close probe failed.'
      this.log(op, outcome, message)
      return { requestId: id, outcome, message }
    }
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
      let message: string | undefined
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
              s.youtube.playback === 'Playing',
            true
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
          const command = await this.effect(op, 'xbox.launch', { productId })
          const state = await this.xboxInput(op)
          const completed = z
            .object({ operationStatus: z.literal('Succeeded') })
            .safeParse(command).success
          if (
            completed &&
            state.xbox.connected &&
            state.xbox.observedAt >= started &&
            state.xbox.activeTitle === null
          ) {
            outcome = 'accepted'
            message =
              'Xbox reports the launch command completed and Xbox HDMI is selected, but the console did not report its foreground title. Check the TV picture.'
            data = { ...state, command: { operationStatus: 'Succeeded' } }
            this.log(
              op,
              'console_command_completed',
              'Foreground title unavailable'
            )
            break
          }
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
        case 'seek_video': {
          const { mode, seconds } = argsSchemas.seek_video.parse(raw)
          if (mode === 'absolute' && seconds < 0)
            throw new Error('Absolute time cannot be negative.')
          const initial = await this.read(op)
          if (
            !initial.tv.connected ||
            initial.tv.appId !== this.config.youtubeAppId
          )
            throw new Error('Open native YouTube before seeking.')
          if (!initial.youtube.connected)
            await this.effect(op, 'youtube.connect')
          const before = await this.observe(
            op,
            (s) =>
              s.tv.connected &&
              s.tv.appId === this.config.youtubeAppId &&
              s.youtube.connected &&
              s.youtube.receiverId !== null &&
              s.youtube.videoId !== null &&
              s.youtube.observedAt >= started &&
              (s.youtube.playback === 'Playing' ||
                s.youtube.playback === 'Paused') &&
              (mode === 'absolute' || s.youtube.positionSeconds != null)
          )
          const current =
            (before.youtube.positionSeconds ?? 0) +
            (before.youtube.playback === 'Playing'
              ? Math.max(0, Date.now() - before.youtube.observedAt) / 1000
              : 0)
          const requested = mode === 'absolute' ? seconds : current + seconds
          const duration = before.youtube.durationSeconds
          const target = Math.max(
            0,
            Math.min(
              requested,
              86400,
              duration != null && duration > 0
                ? Math.max(0, duration - 1)
                : 86400
            )
          )
          const sentAt = Date.now()
          await this.effect(op, 'youtube.seek', { seconds: target })
          data = await this.observe(op, (s) => {
            const position = s.youtube.positionSeconds
            const advance =
              s.youtube.playback === 'Playing'
                ? Math.max(0, s.youtube.observedAt - sentAt) / 1000
                : 0
            return (
              s.tv.connected &&
              s.tv.appId === this.config.youtubeAppId &&
              s.youtube.connected &&
              s.youtube.receiverId === before.youtube.receiverId &&
              s.youtube.videoId === before.youtube.videoId &&
              s.youtube.observedAt >= sentAt &&
              position != null &&
              position >= target - 3 &&
              position <= target + advance + 3
            )
          })
          break
        }
        case 'set_video_speed':
        case 'set_video_captions':
        case 'set_video_autoplay':
        case 'skip_video_ad': {
          if (
            name === 'skip_video_ad' &&
            (this.config.youtubePremium || !this.config.enableAdSkip)
          )
            throw new Error('Ad skipping is disabled for this room.')
          const params = argsSchemas[name].parse(raw)
          let before = await this.read(op)
          if (
            !before.tv.connected ||
            before.tv.appId !== this.config.youtubeAppId
          )
            throw new Error(
              'Open native YouTube before changing playback settings.'
            )
          if (!before.youtube.connected) {
            await this.effect(op, 'youtube.connect')
            before = await this.observe(
              op,
              (s) =>
                s.tv.connected &&
                s.tv.appId === this.config.youtubeAppId &&
                s.youtube.connected &&
                s.youtube.observedAt >= started
            )
          }
          if (name === 'set_video_captions') {
            before = await this.observe(
              op,
              (s) =>
                s.tv.connected &&
                s.tv.appId === this.config.youtubeAppId &&
                s.youtube.connected &&
                s.youtube.observedAt >= started &&
                s.youtube.videoId !== null
            )
          }
          const method = {
            set_video_speed: 'youtube.speed',
            set_video_captions: 'youtube.captions',
            set_video_autoplay: 'youtube.autoplay',
            skip_video_ad: 'youtube.skip_ad'
          }[name]
          const commandParams: Record<string, unknown> = { ...params }
          if (name === 'set_video_captions')
            commandParams.videoId = before.youtube.videoId
          await this.effect(op, method, commandParams)
          outcome = 'accepted'
          message =
            'YouTube accepted the command. Setting change is not independently observed.'
          break
        }
        case 'control_video': {
          const { action } = argsSchemas.control_video.parse(raw)
          let before = await this.read(op)
          if (
            before.tv.connected &&
            before.tv.appId === this.config.youtubeAppId &&
            !before.youtube.connected
          ) {
            await this.effect(op, 'youtube.connect')
            before = await this.observe(
              op,
              (s) =>
                s.tv.connected &&
                s.tv.appId === this.config.youtubeAppId &&
                s.youtube.connected &&
                s.youtube.observedAt >= started
            )
          }
          if (
            !before.tv.connected ||
            !before.youtube.connected ||
            before.tv.appId !== this.config.youtubeAppId
          )
            throw new Error(
              'Native YouTube is not connected in the foreground.'
            )
          if (action === 'next' || action === 'previous')
            before = await this.observe(
              op,
              (s) =>
                s.tv.connected &&
                s.tv.appId === this.config.youtubeAppId &&
                s.youtube.connected &&
                s.youtube.videoId !== null &&
                s.youtube.observedAt >= started
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
              s.youtube.observedAt >= sentAt &&
              (action === 'next' || action === 'previous'
                ? s.youtube.videoId !== null &&
                  (s.youtube.videoId !== before.youtube.videoId ||
                    (action === 'previous' &&
                      before.youtube.positionSeconds != null &&
                      before.youtube.positionSeconds > 5 &&
                      s.youtube.positionSeconds != null &&
                      s.youtube.positionSeconds < 3))
                : s.youtube.videoId === before.youtube.videoId &&
                  s.youtube.playback ===
                    (action === 'pause' ? 'Paused' : 'Playing'))
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
          message ??
          (name === 'get_room_state'
            ? 'Snapshot read. Check each device connection and observation timestamp.'
            : name === 'find_youtube_video'
              ? 'Search results ready; nothing has been played.'
              : outcome === 'observed'
                ? 'State observed; physical picture and audio still require verification.'
                : 'Command accepted; visible result not verified.'),
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

import { z } from 'zod'

export const HOME_APP = 'com.webos.app.home'
export const AMBIENT_APP = 'it.transitivebullsh.smarttv.ambient'
export const SCREENSAVER_APP = 'com.webos.app.screensaver'
export const ambientAutoConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    cooldownSeconds: z.number().int().min(30).max(3600).default(60)
  })
  .strict()
export type AmbientAutoConfig = z.infer<typeof ambientAutoConfigSchema>
export const ambientObservationSchema = z.object({
  observedAt: z.number().finite(),
  appId: z.string().nullable(),
  powerState: z.string(),
  processing: z.string().nullable()
})
export type AmbientObservation = z.infer<typeof ambientObservationSchema>

/** Home eligibility must be observed in this session, never recovered from disk. */
export class AmbientIdlePolicy {
  message = 'Waiting for a fresh LG Home observation.'
  private eligible = false
  private candidateAt: number | undefined
  private lastAt: number | undefined
  private lastApp: string | null = null
  private cooldownUntil = 0
  private attempted = false
  constructor(private readonly cooldownMs: number) {}

  reset(message: string) {
    this.eligible = false
    this.candidateAt = undefined
    this.lastAt = undefined
    this.lastApp = null
    this.attempted = false
    this.message = message
  }
  activity(now: number) {
    this.reset('Waiting after controller activity.')
    this.cooldownUntil = now + this.cooldownMs
  }
  observe(s: AmbientObservation, now: number): boolean {
    if (
      now - s.observedAt > 5000 ||
      s.observedAt > now + 1000 ||
      (this.lastAt !== undefined &&
        (now - this.lastAt > 8000 || now < this.lastAt))
    ) {
      this.reset('Observation gap; waiting for LG Home again.')
      return false
    }
    this.lastAt = now
    if (this.lastApp === AMBIENT_APP && s.appId !== AMBIENT_APP)
      this.cooldownUntil = now + this.cooldownMs
    this.lastApp = s.appId

    // Unknown/transitional power states fail closed. Screen Saver can also
    // appear during shutdown, so never accept power-off processing as idle.
    if (
      ['Request Screen Saver', 'Screen Saver Ready'].includes(
        s.processing ?? ''
      ) &&
      ['Active', 'Screen Saver'].includes(s.powerState) &&
      [HOME_APP, SCREENSAVER_APP].includes(s.appId ?? '')
    ) {
      this.candidateAt = undefined
      this.message =
        'LG is requesting its screensaver; waiting for confirmed entry.'
      return false
    }
    if (s.processing || !['Active', 'Screen Saver'].includes(s.powerState)) {
      this.eligible = false
      this.candidateAt = undefined
      this.message = 'Waiting for an active TV; power transition excluded.'
      return false
    }
    if (s.appId === AMBIENT_APP) {
      this.eligible = false
      this.candidateAt = undefined
      this.attempted = false
      this.message = 'Room Ambient is open.'
      return false
    }
    if (now < this.cooldownUntil) {
      this.eligible = false
      this.candidateAt = undefined
      this.message = 'Cooldown — automatic opening is paused.'
      return false
    }
    if (s.powerState === 'Active' && s.appId === HOME_APP) {
      this.eligible = true
      this.attempted = false
      this.candidateAt = undefined
      this.message = 'Armed on LG Home; waiting for LG’s screensaver signal.'
      return false
    }
    if (
      s.powerState !== 'Screen Saver' ||
      ![HOME_APP, SCREENSAVER_APP].includes(s.appId ?? '')
    ) {
      this.eligible = false
      this.candidateAt = undefined
      this.message = 'Waiting for LG Home; other apps and HDMI are excluded.'
      return false
    }
    if (!this.eligible || this.attempted) {
      this.message = 'Waiting for a new Home → idle transition.'
      return false
    }
    this.candidateAt ??= now
    if (now - this.candidateAt < 4000) {
      this.message = 'LG reports Screen Saver; confirming a stable idle state.'
      return false
    }
    this.attempted = true
    this.message = 'Requesting Room Ambient.'
    return true
  }
}

export interface AmbientAutoStatus {
  config: AmbientAutoConfig
  message: string
  observation: AmbientObservation | null
  launches: number
  events: { at: number; message: string }[]
}
interface AutomaticDevices {
  read(signal: AbortSignal): Promise<unknown>
  launch(observation: AmbientObservation, signal: AbortSignal): Promise<boolean>
  reconnect(): Promise<void>
}

/** One bounded poll at a time. No waking, remote-button simulation or idle timer. */
export class AmbientAuto {
  private policy: AmbientIdlePolicy
  private config: AmbientAutoConfig
  private controller = new AbortController()
  private timer: ReturnType<typeof setTimeout> | undefined
  private active = false
  private running = false
  private reconnectAt = 0
  private observation: AmbientObservation | null = null
  private launches = 0
  private readonly events: { at: number; message: string }[] = []
  private signature = ''
  constructor(
    private readonly devices: AutomaticDevices,
    private readonly report: (message: string) => void,
    config: AmbientAutoConfig
  ) {
    this.config = config
    this.policy = new AmbientIdlePolicy(config.cooldownSeconds * 1000)
  }
  configure(config: AmbientAutoConfig, live: boolean) {
    this.stop()
    this.config = config
    this.policy = new AmbientIdlePolicy(config.cooldownSeconds * 1000)
    this.observation = null
    this.active = live && config.enabled
    this.event(
      this.active
        ? 'Automatic ambient enabled; waiting for LG Home.'
        : live
          ? 'Automatic ambient is disabled.'
          : 'Automatic ambient is paused in simulation.'
    )
    this.schedule()
  }
  private event(message: string) {
    this.policy.message = message
    this.events.push({ at: Date.now(), message })
    if (this.events.length > 40) this.events.shift()
    this.report(message)
  }
  status(): AmbientAutoStatus {
    return {
      config: this.config,
      message: this.policy.message,
      observation: this.observation,
      launches: this.launches,
      events: this.events.slice(-12)
    }
  }
  activity() {
    if (!this.active) return
    this.controller.abort()
    this.controller = new AbortController()
    this.policy.activity(Date.now())
  }
  stop() {
    this.active = false
    clearTimeout(this.timer)
    this.controller.abort()
    this.controller = new AbortController()
  }
  private schedule() {
    if (this.active && !this.running)
      this.timer = setTimeout(() => {
        void this.tick()
      }, 2000)
  }
  private async tick() {
    if (!this.active || this.running) return
    this.running = true
    const controller = this.controller
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(12000)
    ])
    try {
      const observation = ambientObservationSchema.parse(
        await this.devices.read(signal)
      )
      signal.throwIfAborted()
      this.observation = observation
      const signature = JSON.stringify([
        observation.appId,
        observation.powerState,
        observation.processing
      ])
      if (signature !== this.signature) {
        this.signature = signature
        this.event('TV state: ' + signature)
      }
      if (this.policy.observe(observation, Date.now())) {
        const accepted = await this.devices.launch(observation, signal)
        signal.throwIfAborted()
        if (accepted) this.launches++
        this.event(
          accepted
            ? 'Automatic launch accepted; awaiting TV observation.'
            : 'Automatic launch skipped: TV state changed before launch.'
        )
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : 'TV state unavailable.'
        this.observation = null
        if (this.signature !== 'unavailable') {
          this.signature = 'unavailable'
          this.event('TV observation unavailable: ' + message)
        }
        this.policy.reset(
          'Disconnected or unavailable; waiting for a fresh LG Home observation.'
        )
        if (Date.now() >= this.reconnectAt) {
          this.reconnectAt = Date.now() + 30000
          // Reconnects use only an existing pairing and never issue Wake-on-LAN.
          await this.devices.reconnect().catch(() => {})
        }
      }
    } finally {
      this.running = false
      this.schedule()
    }
  }
}

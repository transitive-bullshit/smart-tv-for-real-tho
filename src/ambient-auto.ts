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
export const ambientAutoRecoverySchema = z
  .object({ cooldownUntil: z.number().int().nonnegative().default(0) })
  .strict()
export type AmbientAutoRecovery = z.infer<typeof ambientAutoRecoverySchema>
export const ambientObservationSchema = z.object({
  observedAt: z.number().finite(),
  appId: z.string().nullable(),
  powerState: z.string(),
  processing: z.string().nullable()
})
export type AmbientObservation = z.infer<typeof ambientObservationSchema>

/** Fresh Home arms normal entry; startup/reconnect can confirm an existing idle screen. */
export class AmbientIdlePolicy {
  message = 'Waiting for LG Home or a stable existing screensaver.'
  private eligible = false
  private recovering = true
  private candidateAt: number | undefined
  private lastAt: number | undefined
  private lastApp: string | null = null
  private attempted = false
  constructor(
    private readonly cooldownMs: number,
    private cooldownUntil = 0,
    private readonly saveCooldown: (until: number) => void = () => {}
  ) {}

  reset(message: string, recovering = true) {
    this.eligible = false
    this.recovering = recovering
    this.candidateAt = undefined
    this.lastAt = undefined
    // Keep dismissal history and spent attempts through observation failures.
    this.message = message
  }
  private pause(now: number) {
    this.cooldownUntil = Math.max(this.cooldownUntil, now + this.cooldownMs)
    this.saveCooldown(this.cooldownUntil)
  }
  activity(now: number) {
    this.reset('Waiting after controller activity.', false)
    this.pause(now)
  }
  observe(s: AmbientObservation, now: number): boolean {
    if (
      now - s.observedAt > 5000 ||
      s.observedAt > now + 1000 ||
      (this.lastAt !== undefined &&
        (now - this.lastAt > 8000 || now < this.lastAt))
    ) {
      this.reset(
        'Observation gap; reconfirming LG Home or an existing screensaver.'
      )
      return false
    }
    this.lastAt = now
    if (this.lastApp === AMBIENT_APP && s.appId !== AMBIENT_APP) {
      this.pause(now)
      this.recovering = false
    }
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
      this.recovering = false
      this.candidateAt = undefined
      this.message = 'Waiting for an active TV; power transition excluded.'
      return false
    }
    if (s.appId === AMBIENT_APP) {
      this.eligible = false
      this.recovering = false
      this.candidateAt = undefined
      this.attempted = false
      this.message = 'Room Ambient is open.'
      return false
    }
    const activeHome = s.powerState === 'Active' && s.appId === HOME_APP
    if (
      !activeHome &&
      (s.powerState !== 'Screen Saver' ||
        ![HOME_APP, SCREENSAVER_APP].includes(s.appId ?? ''))
    ) {
      this.eligible = false
      this.recovering = false
      this.candidateAt = undefined
      this.message = 'Waiting for LG Home; other apps and HDMI are excluded.'
      return false
    }
    // LG's generic screensaver app can obscure which source idled. Recovery
    // needs Home itself; the generic ID is allowed only after observed Home.
    if (!this.eligible && s.appId !== HOME_APP) {
      this.recovering = false
      this.candidateAt = undefined
      this.message = 'Waiting for LG Home; screensaver origin is unknown.'
      return false
    }
    if (now < this.cooldownUntil) {
      this.eligible = false
      this.candidateAt = undefined
      this.message = 'Cooldown — automatic opening is paused.'
      return false
    }
    if (activeHome) {
      this.eligible = true
      this.recovering = false
      this.attempted = false
      this.candidateAt = undefined
      this.message = 'Armed on LG Home; waiting for LG’s screensaver signal.'
      return false
    }
    if ((!this.eligible && !this.recovering) || this.attempted) {
      this.message = 'Waiting for a new Home → idle transition.'
      return false
    }
    this.candidateAt ??= now
    if (now - this.candidateAt < (this.eligible ? 4000 : 10000)) {
      this.message = this.eligible
        ? 'LG reports Screen Saver; confirming a stable idle state.'
        : 'Recovering an existing LG screensaver; confirming ten seconds of stable idle.'
      return false
    }
    this.attempted = true
    this.message = 'Requesting Room Ambient.'
    return true
  }
}

export interface AmbientAutoStatus {
  config: AmbientAutoConfig
  cooldownUntil: number
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
  private cooldownUntil: number
  constructor(
    private readonly devices: AutomaticDevices,
    private readonly report: (message: string) => void,
    config: AmbientAutoConfig,
    recovery: AmbientAutoRecovery = { cooldownUntil: 0 },
    private readonly saveRecovery: (
      state: AmbientAutoRecovery
    ) => void = () => {}
  ) {
    this.config = config
    this.cooldownUntil = recovery.cooldownUntil
    this.policy = this.makePolicy()
  }
  private makePolicy() {
    return new AmbientIdlePolicy(
      this.config.cooldownSeconds * 1000,
      this.cooldownUntil,
      (cooldownUntil) => {
        this.cooldownUntil = cooldownUntil
        this.saveRecovery({ cooldownUntil })
      }
    )
  }
  configure(config: AmbientAutoConfig, live: boolean) {
    this.stop()
    this.config = config
    this.policy = this.makePolicy()
    this.observation = null
    this.active = live && config.enabled
    this.event(
      this.active
        ? 'Automatic ambient enabled; checking LG Home or an existing screensaver.'
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
      cooldownUntil: this.cooldownUntil,
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
          'Disconnected or unavailable; will reconfirm LG Home or an existing screensaver.'
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

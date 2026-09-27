import { setTimeout as delay } from 'node:timers/promises'
import { emptyState } from './contracts.js'
import type { Config, Devices } from './contracts.js'
export class Simulation implements Devices {
  readonly state = emptyState()
  constructor(private readonly config: Config) {
    this.state.tv = {
      connected: true,
      observedAt: Date.now(),
      appId: 'simulation.home',
      volume: 15,
      soundOutput: 'simulation'
    }
    this.state.youtube.receiverId = 'simulation-receiver'
    this.state.xbox.connected = true
  }
  async request(
    method: string,
    params: Record<string, unknown> = {},
    signal?: AbortSignal
  ) {
    await delay(30, undefined, { signal })
    switch (method) {
      case 'tv.input':
        this.state.tv.appId = this.config.xboxInputAppId
        break
      case 'tv.launch':
        this.state.tv.appId = String(params.id)
        break
      case 'tv.home':
        this.state.tv.appId = 'simulation.home'
        break
      case 'tv.volume':
        this.state.tv.volume = Number(params.level)
        break
      case 'youtube.connect':
        this.state.youtube.connected = true
        break
      case 'youtube.identity':
        return { receiverId: this.state.youtube.receiverId }
      case 'youtube.play':
        this.state.youtube.videoId = String(params.videoId)
        this.state.youtube.playback = 'Playing'
        break
      case 'youtube.pause':
        this.state.youtube.playback = 'Paused'
        break
      case 'youtube.resume':
        this.state.youtube.playback = 'Playing'
        break
      case 'xbox.launch':
        this.state.xbox.activeTitle = String(params.productId)
        break
      case 'xbox.home':
        this.state.xbox.activeTitle = null
        break
      case 'state':
        break
      default:
        throw new Error('Exit simulation before pairing.')
    }
    for (const state of Object.values(this.state)) state.observedAt = Date.now()
    return structuredClone(this.state)
  }
  close() {}
}

import { audioLevel } from '../../web/audio-meter.js'

export type AudioPreviewPhase = 'listening' | 'working' | 'speaking' | 'success'

// One local playback graph. The very same samples drive the speakers and glow.
// No microphone, API, device command, upload, or synthetic amplitude envelope.
export class AudioPreview {
  private readonly context = new AudioContext()
  private readonly analyser = this.context.createAnalyser()
  private readonly gain = this.context.createGain()
  private readonly buffer = new Float32Array(512)
  private run?: AbortController

  constructor() {
    this.analyser.fftSize = this.buffer.length
    this.analyser.connect(this.gain)
    this.gain.gain.value = 0.65
    this.gain.connect(this.context.destination)
  }

  level = () => {
    if (!this.run || this.context.state !== 'running') return 0
    this.analyser.getFloatTimeDomainData(this.buffer)
    return audioLevel(this.buffer)
  }

  volume(value: number) {
    this.gain.gain.value = Math.max(0, Math.min(1, value))
  }

  async play(
    request: () => Promise<ArrayBuffer>,
    reply: () => Promise<ArrayBuffer>,
    present: (phase: AudioPreviewPhase) => void
  ) {
    this.stop()
    const run = (this.run = new AbortController())
    const { signal } = run
    try {
      // Resume synchronously from the user's click, before any file loading.
      await this.context.resume()
      const decode = async (read: () => Promise<ArrayBuffer>) => {
        const bytes = await read()
        signal.throwIfAborted()
        const buffer = await this.context.decodeAudioData(bytes)
        signal.throwIfAborted()
        if (buffer.duration > 30)
          throw new Error('Choose a short clip, up to 30 seconds.')
        return buffer
      }
      const [input, output] = await Promise.all([
        decode(request),
        decode(reply)
      ])
      signal.throwIfAborted()
      present('listening')
      await this.playBuffer(input, signal)
      signal.throwIfAborted()
      present('working')
      await this.pause(850, signal)
      signal.throwIfAborted()
      present('speaking')
      await this.playBuffer(output, signal)
      signal.throwIfAborted()
      present('success')
      await this.pause(1200, signal)
    } finally {
      if (this.run === run) this.run = undefined
    }
  }

  private playBuffer(buffer: AudioBuffer, signal: AbortSignal) {
    signal.throwIfAborted()
    return new Promise<void>((resolve, reject) => {
      const source = this.context.createBufferSource()
      source.buffer = buffer
      source.connect(this.analyser)
      const finish = (error?: unknown) => {
        source.onended = null
        signal.removeEventListener('abort', abort)
        source.disconnect()
        if (error) reject(error)
        else resolve()
      }
      const abort = () => {
        source.stop()
        finish(signal.reason)
      }
      source.onended = () => finish()
      signal.addEventListener('abort', abort, { once: true })
      source.start()
    })
  }

  private pause(ms: number, signal: AbortSignal) {
    signal.throwIfAborted()
    return new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(signal.reason)
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort)
        resolve()
      }, ms)
      signal.addEventListener('abort', abort, { once: true })
    })
  }

  stop() {
    this.run?.abort()
    this.run = undefined
  }

  close() {
    this.stop()
    this.analyser.disconnect()
    this.gain.disconnect()
    void this.context.close().catch(() => {})
  }
}

export async function inlineAudio(url: string) {
  return Uint8Array.from(atob(url.split(',')[1]!), (char) => char.charCodeAt(0))
    .buffer
}

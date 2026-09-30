export function audioLevel(buffer: Float32Array<ArrayBuffer>) {
  let energy = 0
  for (const value of buffer) energy += value * value
  const rms = Math.sqrt(energy / buffer.length)
  return Math.min(1, Math.max(0, (rms - 0.008) * 5))
}

// Analyse the existing streams only. This module never requests a microphone or plays audio.
export class AudioMeter {
  private context?: AudioContext
  private input?: {
    source: MediaStreamAudioSourceNode
    analyser: AnalyserNode
    buffer: Float32Array<ArrayBuffer>
  }
  private output?: {
    source: MediaStreamAudioSourceNode
    analyser: AnalyserNode
    buffer: Float32Array<ArrayBuffer>
  }
  constructor() {
    try {
      if (typeof AudioContext !== 'undefined') {
        this.context = new AudioContext()
        void this.context.resume().catch(() => {})
      }
    } catch {
      /* Visual metering must not prevent voice from connecting. */
    }
  }
  attach(kind: 'input' | 'output', stream: MediaStream) {
    const context = this.context
    if (!context) return
    try {
      this[kind]?.source.disconnect()
      this[kind]?.analyser.disconnect()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      this[kind] = {
        source,
        analyser,
        buffer: new Float32Array(analyser.fftSize)
      }
    } catch {
      this[kind] = undefined
    }
  }
  sample() {
    const read = (kind: 'input' | 'output') => {
      const node = this[kind]
      if (!node || this.context?.state !== 'running') return 0
      node.analyser.getFloatTimeDomainData(node.buffer)
      return audioLevel(node.buffer)
    }
    return { input: read('input'), output: read('output') }
  }
  close() {
    for (const kind of ['input', 'output'] as const) {
      this[kind]?.source.disconnect()
      this[kind]?.analyser.disconnect()
      this[kind] = undefined
    }
    void this.context?.close().catch(() => {})
    this.context = undefined
  }
}

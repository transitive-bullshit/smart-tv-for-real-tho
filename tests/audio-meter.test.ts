import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AudioMeter } from '../web/audio-meter.js'

void test('meter analyses existing streams without playback and releases every node', (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  const sources: { connected?: unknown; disconnected: boolean }[] = []
  const analysers: { disconnected: boolean }[] = []
  const contexts: Context[] = []
  let amplitude = 0.1
  class Context {
    state = 'running'
    closed = false
    constructor() {
      contexts.push(this)
    }
    async resume() {}
    createMediaStreamSource() {
      const node = {
        connected: undefined as unknown,
        disconnected: false,
        connect(to: unknown) {
          this.connected = to
        },
        disconnect() {
          this.disconnected = true
        }
      }
      sources.push(node)
      return node
    }
    createAnalyser() {
      const node = {
        fftSize: 0,
        disconnected: false,
        getFloatTimeDomainData(buffer: Float32Array) {
          buffer.fill(amplitude)
        },
        disconnect() {
          this.disconnected = true
        }
      }
      analysers.push(node)
      return node
    }
    async close() {
      this.closed = true
    }
  }
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: Context
  })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'AudioContext', previous)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  })
  const meter = new AudioMeter()
  meter.attach('input', {} as MediaStream)
  meter.attach('output', {} as MediaStream)
  assert.deepEqual(
    sources.map((source) => source.connected),
    analysers
  )
  assert.ok(Math.abs(meter.sample().input - 0.46) < 0.001)
  amplitude = 1
  assert.deepEqual(meter.sample(), { input: 1, output: 1 })
  amplitude = 0.001
  assert.deepEqual(meter.sample(), { input: 0, output: 0 })
  amplitude = 0.5
  contexts[0]!.state = 'suspended'
  assert.deepEqual(meter.sample(), { input: 0, output: 0 })
  meter.close()
  assert.ok(contexts[0]!.closed)
  assert.ok(sources.every((source) => source.disconnected))
  assert.ok(analysers.every((analyser) => analyser.disconnected))
  assert.deepEqual(meter.sample(), { input: 0, output: 0 })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { AudioPreview } from '../tv/visuals/audio-preview.js'

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const clip = async () => new ArrayBuffer(2)

function setup(t: TestContext) {
  const nodes: ReturnType<typeof source>[] = []
  let closed = false
  let duration = 4
  let amplitude = 0.1
  function source() {
    return {
      onended: null as (() => void) | null,
      stopped: false,
      disconnected: false,
      connect() {},
      start() {},
      stop() {
        this.stopped = true
      },
      disconnect() {
        this.disconnected = true
      }
    }
  }
  class Context {
    state = 'running'
    destination = {}
    async resume() {}
    async decodeAudioData() {
      return { duration }
    }
    createAnalyser() {
      return {
        connect() {},
        disconnect() {},
        getFloatTimeDomainData(buffer: Float32Array) {
          buffer.fill(amplitude)
        }
      }
    }
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} }
    }
    createBufferSource() {
      const node = source()
      nodes.push(node)
      return node
    }
    async close() {
      closed = true
    }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: Context
  })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'AudioContext', previous)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const player = new AudioPreview()
  t.after(() => player.close())
  return {
    player,
    nodes,
    closed: () => closed,
    duration: (next: number) => {
      duration = next
    },
    amplitude: (next: number) => {
      amplitude = next
    }
  }
}

void test('recorded audio drives bounded levels and advances only after playback ends', async (t) => {
  const h = setup(t)
  const phases: string[] = []
  const playing = h.player.play(clip, clip, (phase) => phases.push(phase))
  await flush()
  assert.deepEqual(phases, ['listening'])
  assert.ok(Math.abs(h.player.level() - 0.46) < 0.001)
  h.amplitude(0)
  assert.equal(h.player.level(), 0)
  h.nodes[0]!.onended!()
  await flush()
  assert.deepEqual(phases, ['listening', 'working'])
  t.mock.timers.tick(850)
  await flush()
  assert.equal(phases.at(-1), 'speaking')
  h.amplitude(1)
  assert.equal(h.player.level(), 1)
  h.nodes[1]!.onended!()
  await flush()
  assert.equal(phases.at(-1), 'success')
  t.mock.timers.tick(1200)
  await playing
  assert.equal(h.player.level(), 0)
  h.player.close()
  assert.equal(h.closed(), true)
  assert.ok(h.nodes.every((node) => node.disconnected))
})

void test('stopping during loading cannot start a late clip', async (t) => {
  const h = setup(t)
  const pending = Promise.withResolvers<ArrayBuffer>()
  const phases: string[] = []
  const playing = h.player.play(
    () => pending.promise,
    clip,
    (phase) => phases.push(phase)
  )
  const rejection = assert.rejects(playing, { name: 'AbortError' })
  await flush()
  h.player.stop()
  pending.resolve(new ArrayBuffer(2))
  await rejection
  assert.deepEqual(phases, [])
  assert.equal(h.nodes.length, 0)
})

void test('stopping a clip or its thinking gap prevents the recorded reply', async (t) => {
  const h = setup(t)
  for (const duringGap of [false, true]) {
    const phases: string[] = []
    const playing = h.player.play(clip, clip, (phase) => phases.push(phase))
    const rejection = assert.rejects(playing, { name: 'AbortError' })
    await flush()
    const node = h.nodes.at(-1)!
    if (duringGap) {
      node.onended!()
      await flush()
    }
    h.player.stop()
    await rejection
    t.mock.timers.tick(5000)
    await flush()
    assert.equal(phases.includes('speaking'), false)
    assert.equal(h.player.level(), 0)
    assert.ok(node.disconnected)
    if (!duringGap) assert.ok(node.stopped)
  }
})

void test('long files fail before any playback', async (t) => {
  const h = setup(t)
  h.duration(31)
  await assert.rejects(
    h.player.play(clip, clip, () => {}),
    /30 seconds/
  )
  assert.equal(h.nodes.length, 0)
  assert.equal(h.player.level(), 0)
})

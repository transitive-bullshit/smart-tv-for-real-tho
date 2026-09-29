import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ambientCommandSchema } from '../src/ambient-options.js'
import { configSchema, emptyState } from '../src/contracts.js'
import type { Devices } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'
import { coverFrame, slides } from '../tv/ambient-src/model.js'
import { screenSaverGuard } from '../tv/ambient-src/guard.js'

void test('cover motion never exposes edges or crops its focal point across aspect ratios', () => {
  for (const slide of slides)
    for (const [width, height] of [
      [1920, 1080],
      [1488, 1036],
      [390, 844]
    ]) {
      for (let step = 0; step <= 100; step++) {
        const frame = coverFrame(
          slide.width,
          slide.height,
          width!,
          height!,
          slide.x,
          slide.y,
          (0.12 * step) / 100
        )
        assert.ok(frame.x <= 0 && frame.y <= 0)
        assert.ok(frame.x + frame.width >= width! - 0.0001)
        assert.ok(frame.y + frame.height >= height! - 0.0001)
        const x = frame.x + frame.width * slide.x
        const y = frame.y + frame.height * slide.y
        assert.ok(x >= 0 && x <= width!)
        assert.ok(y >= 0 && y <= height!)
      }
    }
  assert.throws(() => coverFrame(0, 1, 1, 1, 0.5, 0.5, 0))
  assert.deepEqual(coverFrame(100, 100, 100, 100, NaN, Infinity, -1), {
    x: 0,
    y: 0,
    width: 100,
    height: 100
  })
})
function create(devices: Devices, mode: 'live' | 'simulation' = 'live') {
  return new Coordinator(
    devices,
    { find: async () => [] },
    configSchema.parse({ mode, timeoutMs: 1200, youtubeAppId: 'youtube' }),
    () => {}
  )
}
const room = emptyState()
room.tv = {
  connected: true,
  appId: 'youtube',
  volume: 15,
  soundOutput: 'external_arc',
  observedAt: Date.now()
}
room.youtube.connected = true
void test('ambient launch is live-only, mutes before source change, and preserves observed evidence', async () => {
  const calls: [string, unknown][] = []
  const devices: Devices = {
    close() {},
    async request(method, params) {
      calls.push([method, params])
      return method === 'state' ? structuredClone(room) : { accepted: true }
    }
  }
  const command = ambientCommandSchema.parse({ action: 'launch' })
  assert.equal(
    (await create(devices, 'simulation').controlAmbient(command)).outcome,
    'failed'
  )
  assert.equal(calls.length, 0)
  const result = await create(devices).controlAmbient(command)
  assert.equal(result.outcome, 'accepted')
  assert.deepEqual(
    calls.map(([method]) => method),
    ['state', 'tv.volume', 'youtube.pause', 'tv.ambient', 'state']
  )
  assert.deepEqual(calls[1]?.[1], { level: 0 })
  assert.deepEqual(result.data, { before: room, after: room })
  assert.equal(
    ambientCommandSchema.safeParse({
      action: 'launch',
      mode: 'external',
      url: 'https://example.com'
    }).success,
    false
  )
})
void test('a newer source command wins over an in-flight ambient launch', async () => {
  let release!: () => void
  let entered!: () => void
  const started = new Promise<void>((r) => {
    entered = r
  })
  const gate = new Promise<void>((r) => {
    release = r
  })
  const effects: string[] = []
  const c = create({
    close() {},
    async request(method) {
      if (method === 'state') return structuredClone(room)
      if (method === 'tv.ambient') {
        entered()
        await gate
      }
      effects.push(method)
      return true
    }
  })
  const first = c.controlAmbient(
    ambientCommandSchema.parse({ action: 'launch' })
  )
  await started
  const second = c.execute('show_home', { target: 'tv' })
  release()
  assert.equal((await first).outcome, 'superseded')
  assert.equal((await second).outcome, 'accepted')
  assert.deepEqual(effects, [
    'tv.volume',
    'youtube.pause',
    'tv.ambient',
    'tv.home'
  ])
})
void test('the private guard releases its subscription and ignores later idle callbacks', () => {
  const bridges: FakeBridge[] = []
  const reports: string[] = []
  class FakeBridge {
    cancelled = false
    uri = ''
    params: Record<string, unknown> = {}
    onservicecallback = (_response: string) => {}
    constructor() {
      bridges.push(this)
    }
    call(uri: string, raw: string) {
      this.uri = uri
      this.params = JSON.parse(raw) as Record<string, unknown>
    }
    cancel() {
      this.cancelled = true
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { PalmServiceBridge: FakeBridge }
  })
  try {
    const stop = screenSaverGuard((message) => reports.push(message))
    bridges[0]!.onservicecallback(
      JSON.stringify({ returnValue: true, timestamp: 123 })
    )
    assert.equal(bridges[1]!.params.ack, false)
    assert.equal(bridges[1]!.params.timestamp, 123)
    bridges[1]!.onservicecallback(JSON.stringify({ returnValue: true }))
    assert.match(reports.at(-1)!, /acknowledged/)
    stop()
    assert.equal(bridges[0]!.cancelled, true)
    bridges[0]!.onservicecallback(JSON.stringify({ timestamp: 124 }))
    assert.equal(bridges.length, 2)
    screenSaverGuard((message) => reports.push(message))
    bridges[2]!.onservicecallback(
      JSON.stringify({ returnValue: false, errorText: 'permission denied' })
    )
    assert.match(reports.at(-1)!, /rejected.*permission denied/)
    assert.equal(bridges[2]!.cancelled, true)
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

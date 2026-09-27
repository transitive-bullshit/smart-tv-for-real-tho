import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configSchema, emptyState } from '../src/contracts.js'
import type { Devices } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'

const config = configSchema.parse({ mode: 'live', timeoutMs: 1200 })
const room = emptyState()
room.tv = {
  connected: true,
  appId: 'youtube',
  volume: 0,
  soundOutput: 'external_arc',
  observedAt: Date.now()
}
function create(devices: Devices, mode: 'live' | 'simulation' = 'live') {
  return new Coordinator(
    devices,
    { find: async () => [] },
    { ...config, mode },
    () => {}
  )
}

void test('overlay success stays accepted and preserves real foreground observations', async () => {
  const calls: string[] = []
  const c = create({
    close() {},
    async request(method) {
      calls.push(method)
      if (method === 'state') return structuredClone(room)
      return { accepted: true }
    }
  })
  const result = await c.probeOverlay('launch')
  assert.equal(result.outcome, 'accepted')
  assert.deepEqual(result.data, { before: room, after: room })
  assert.equal(c.state.tv.appId, 'youtube')
  assert.equal(c.state.tv.volume, 0)
  assert.deepEqual(calls, ['state', 'tv.overlay', 'state'])
})

void test('overlay cannot touch hardware in simulation or with disconnected LG', async () => {
  const calls: string[] = []
  const devices: Devices = {
    close() {},
    async request(method) {
      calls.push(method)
      return emptyState()
    }
  }
  assert.equal(
    (await create(devices, 'simulation').probeOverlay('launch')).outcome,
    'failed'
  )
  assert.deepEqual(calls, [])
  assert.equal((await create(devices).probeOverlay('launch')).outcome, 'failed')
  assert.deepEqual(calls, ['state'])
})

void test('a newer Home action waits for an already-delivered overlay launch and wins', async () => {
  let entered!: () => void
  let release!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const effects: string[] = []
  const c = create({
    close() {},
    async request(method) {
      if (method === 'state') return structuredClone(room)
      if (method === 'tv.overlay') {
        entered()
        await gate // Device acceptance cannot be revoked after delivery.
      }
      effects.push(method)
      return { accepted: true }
    }
  })
  const first = c.probeOverlay('launch')
  await started
  const second = c.execute('show_home', { target: 'tv' })
  release()
  assert.equal((await first).outcome, 'superseded')
  assert.equal((await second).outcome, 'accepted')
  assert.deepEqual(effects, ['tv.overlay', 'tv.home'])
})

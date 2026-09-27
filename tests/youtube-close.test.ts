import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configSchema, emptyState } from '../src/contracts.js'
import type { Devices } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'

function create(devices: Devices, mode: 'live' | 'simulation' = 'live') {
  return new Coordinator(
    devices,
    { find: async () => [] },
    configSchema.parse({
      mode,
      youtubeAppId: 'youtube.leanback.v4',
      timeoutMs: 600
    }),
    () => {}
  )
}
void test('YouTube close requires live foreground and rejects acceptance without fresh foreground exit', async () => {
  const calls: string[] = []
  const state = emptyState()
  state.tv = {
    connected: true,
    observedAt: Date.now(),
    appId: 'youtube.leanback.v4',
    volume: 0,
    soundOutput: 'external_arc'
  }
  const devices: Devices = {
    close() {},
    async request(method) {
      calls.push(method)
      if (method === 'state') return structuredClone(state)
      // A successful close acknowledgment without changed state is insufficient.
      return { accepted: true }
    }
  }
  assert.equal(
    (await create(devices, 'simulation').closeYoutubeForProbe()).outcome,
    'failed'
  )
  assert.deepEqual(calls, [])
  assert.equal((await create(devices).closeYoutubeForProbe()).outcome, 'failed')
  assert.equal(calls.filter((c) => c === 'tv.close_youtube').length, 1)
  calls.length = 0
  state.tv.appId = 'com.webos.app.hdmi3'
  assert.equal((await create(devices).closeYoutubeForProbe()).outcome, 'failed')
  assert.deepEqual(calls, ['state'])
})
void test('YouTube close observes foreground exit and a newer source wins over delayed closure', async () => {
  const state = emptyState()
  state.tv = {
    connected: true,
    observedAt: Date.now(),
    appId: 'youtube.leanback.v4',
    volume: 0,
    soundOutput: 'external_arc'
  }
  let delayed = false
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
      if (method === 'state') {
        state.tv.observedAt = Date.now()
        return structuredClone(state)
      }
      if (method === 'tv.close_youtube') {
        if (delayed) {
          entered()
          await gate
        }
        state.tv.appId = 'com.webos.app.hdmi3'
      } else if (method === 'tv.home') state.tv.appId = 'com.webos.app.home'
      effects.push(method)
      return { accepted: true }
    }
  })
  const success = await c.closeYoutubeForProbe()
  assert.equal(success.outcome, 'observed')
  assert.equal(c.state.tv.appId, 'com.webos.app.hdmi3')
  assert.equal(c.state.tv.volume, 0)
  state.tv.appId = 'youtube.leanback.v4'
  delayed = true
  effects.length = 0
  const old = c.closeYoutubeForProbe()
  await started
  const newer = c.execute('show_home', { target: 'tv' })
  release()
  assert.equal((await old).outcome, 'superseded')
  assert.equal((await newer).outcome, 'accepted')
  assert.deepEqual(effects, ['tv.close_youtube', 'tv.home'])
  assert.equal(c.state.tv.appId, 'com.webos.app.home')
})

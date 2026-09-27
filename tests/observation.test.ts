import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configSchema } from '../src/contracts.js'
import type { Devices } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'
import { Simulation } from '../src/simulation.js'

for (const fault of [
  'receiver',
  'freshness',
  'foreground',
  'playback'
] as const) {
  void test(
    'playback completion rejects incorrect ' + fault + ' independently',
    async () => {
      const config = configSchema.parse({
        mode: 'simulation',
        youtubeAppId: 'yt',
        timeoutMs: 500
      })
      const base = new Simulation(config)
      let sent = false
      const devices: Devices = {
        close() {},
        async request(method, params, signal) {
          const result = await base.request(method, params, signal)
          if (method === 'youtube.play') sent = true
          if (method === 'state' && sent) {
            const state = structuredClone(base.state)
            if (fault === 'receiver') state.youtube.receiverId = 'wrong'
            if (fault === 'freshness') state.youtube.observedAt = 1
            if (fault === 'foreground') state.tv.appId = 'hdmi'
            if (fault === 'playback') state.youtube.playback = 'Buffering'
            return state
          }
          return result
        }
      }
      const c = new Coordinator(
        devices,
        {
          find: async () => [
            { videoId: 'aaaaaaaaaaa', title: 'test', channel: 'test' }
          ]
        },
        config,
        () => {}
      )
      await c.execute('find_youtube_video', { song: 'test' })
      const result = await c.execute('play_youtube_video', {
        candidate_id: c.candidates[0]!.candidateId
      })
      assert.ok(
        sent,
        'test must reach the actual video command before injecting bad observations'
      )
      assert.equal(result.outcome, 'failed')
      assert.match(result.message, /Timed out/)
    }
  )
}
void test('clarification may select existing candidates after speech interrupts pending work', async () => {
  const config = configSchema.parse({ mode: 'simulation', youtubeAppId: 'yt' })
  const base = new Simulation(config)
  const c = new Coordinator(
    base,
    {
      find: async () => [
        { videoId: 'aaaaaaaaaaa', title: 'test', channel: 'test' }
      ]
    },
    config,
    () => {}
  )
  await c.execute('find_youtube_video', { song: 'test' })
  const id = c.candidates[0]!.candidateId
  c.cancel()
  assert.equal(
    (await c.execute('play_youtube_video', { candidate_id: id })).outcome,
    'observed'
  )
})

for (const recovery of [
  'healthy',
  'disconnected',
  'wrong-receiver',
  'stale'
] as const) {
  void test(
    'receiver reconnect after delivered playback: ' + recovery,
    async () => {
      const config = configSchema.parse({
        mode: 'simulation',
        youtubeAppId: 'yt',
        timeoutMs: 650
      })
      const base = new Simulation(config)
      let connects = 0
      let plays = 0
      const devices: Devices = {
        close() {},
        async request(method, params, signal) {
          if (method === 'youtube.connect') connects++
          if (method === 'youtube.play') plays++
          const result = await base.request(method, params, signal)
          if (method === 'state' && plays) {
            const state = structuredClone(base.state)
            if (connects < 2 || recovery === 'disconnected')
              state.youtube.connected = false
            else if (recovery === 'wrong-receiver')
              state.youtube.receiverId = 'other'
            else if (recovery === 'stale') state.youtube.observedAt = 1
            return state
          }
          return result
        }
      }
      const c = new Coordinator(
        devices,
        {
          find: async () => [
            { videoId: 'aaaaaaaaaaa', title: 'test', channel: 'test' }
          ]
        },
        config,
        () => {}
      )
      await c.execute('find_youtube_video', { song: 'test' })
      const result = await c.execute('play_youtube_video', {
        candidate_id: c.candidates[0]!.candidateId
      })
      assert.equal(
        result.outcome,
        recovery === 'healthy' ? 'observed' : 'failed'
      )
      assert.equal(
        plays,
        1,
        'reconnection must never repeat the playback mutation'
      )
      assert.equal(
        connects,
        2,
        'only the initial connection and one bounded reconnect are allowed'
      )
    }
  )
}

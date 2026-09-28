import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configSchema } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'
import { Simulation } from '../src/simulation.js'
import { sessionConfig } from '../src/realtime.js'

void test('ad skip is omitted for Premium or disabled rooms and included only on opt-in', () => {
  for (const [premium, enabled, exposed] of [
    [true, false, false],
    [true, true, false],
    [false, false, false],
    [false, true, true]
  ]) {
    const config = configSchema.parse({
      youtubePremium: premium,
      enableAdSkip: enabled
    })
    const tools = sessionConfig(config, false).tools
    assert.equal(
      tools.some((tool) => tool.name === 'skip_video_ad'),
      exposed
    )
    for (const name of [
      'set_video_speed',
      'set_video_captions',
      'set_video_autoplay'
    ])
      assert.ok(tools.some((tool) => tool.name === name))
  }
})
function fixture(premium = true, enabled = false) {
  const config = configSchema.parse({
    mode: 'simulation',
    youtubeAppId: 'yt',
    youtubePremium: premium,
    enableAdSkip: enabled,
    timeoutMs: 300
  })
  const sim = new Simulation(config)
  sim.state.tv.appId = 'yt'
  Object.assign(sim.state.youtube, {
    connected: true,
    videoId: 'original',
    playback: 'Playing'
  })
  const calls: Array<{ method: string; params: unknown }> = []
  const coordinator = new Coordinator(
    {
      request(method, params, signal) {
        calls.push({ method, params })
        return sim.request(method, params, signal)
      },
      close() {}
    },
    { find: async () => [] },
    config,
    () => {}
  )
  return { coordinator, calls, sim }
}
void test('disabled ad skip is rejected by backend without device calls', async () => {
  for (const [premium, enabled] of [
    [true, true],
    [false, false]
  ]) {
    const { coordinator, calls } = fixture(premium, enabled)
    assert.equal(
      (await coordinator.execute('skip_video_ad', {})).outcome,
      'failed'
    )
    assert.equal(calls.length, 0)
  }
})
void test('next and previous observe changed video; settings route with exact arguments and remain accepted', async () => {
  const { coordinator: c, calls } = fixture()
  for (const action of ['next', 'previous'])
    assert.equal(
      (await c.execute('control_video', { action })).outcome,
      'observed'
    )
  assert.equal(
    (await c.execute('set_video_speed', { speed: 1.5 })).outcome,
    'accepted'
  )
  assert.equal(
    (await c.execute('set_video_captions', { language: 'en' })).outcome,
    'accepted'
  )
  assert.equal(
    (await c.execute('set_video_captions', { language: null })).outcome,
    'accepted'
  )
  assert.equal(
    (await c.execute('set_video_autoplay', { enabled: false })).outcome,
    'accepted'
  )
  assert.ok(
    calls.some(
      (x) =>
        x.method === 'youtube.captions' &&
        JSON.stringify(x.params) ===
          JSON.stringify({ language: 'en', videoId: 'simulation-previous' })
    )
  )
  assert.equal(
    (await c.execute('set_video_speed', { speed: 3 })).outcome,
    'failed'
  )
  assert.equal(
    (await c.execute('set_video_captions', { language: '' })).outcome,
    'failed'
  )
})
void test('YouTube setting commands cannot run over Xbox and opt-in ad skip reaches bridge', async () => {
  const { coordinator: c, sim, calls } = fixture(false, true)
  assert.equal((await c.execute('skip_video_ad', {})).outcome, 'accepted')
  assert.ok(calls.some((x) => x.method === 'youtube.skip_ad'))
  sim.state.tv.appId = 'xbox'
  const count = calls.filter((x) => x.method === 'youtube.speed').length
  assert.equal(
    (await c.execute('set_video_speed', { speed: 1.5 })).outcome,
    'failed'
  )
  assert.equal(calls.filter((x) => x.method === 'youtube.speed').length, count)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { configSchema } from '../src/contracts.js'
import type { Devices, Search, Trace, Video } from '../src/contracts.js'
import { Coordinator } from '../src/coordinator.js'
import { Simulation } from '../src/simulation.js'

const video = (id: string): Video => ({
  videoId: id,
  title: id,
  channel: 'test'
})
const config = () =>
  configSchema.parse({
    mode: 'simulation',
    youtubeAppId: 'yt',
    xboxInputId: 'HDMI_3',
    xboxInputAppId: 'hdmi3',
    games: { demo: 'game' },
    timeoutMs: 1200
  })
const search: Search = {
  find: async () => [video('aaaaaaaaaaa'), video('bbbbbbbbbbb')]
}
function fixture(searcher = search, override?: Devices) {
  const c = config(),
    devices = override ?? new Simulation(c),
    traces: Trace[] = []
  const coordinator = new Coordinator(devices, searcher, c, (t) =>
    traces.push(t)
  )
  return { coordinator, devices, traces }
}
async function candidate(c: Coordinator) {
  await c.execute('find_youtube_video', { song: 'Song', artist: 'Artist' })
  return c.candidates[0]!.candidateId
}
void test('native transition, replacement and return use one coordinator', async () => {
  const { coordinator: c } = fixture()
  assert.equal(
    (await c.execute('start_game', { game_alias: 'demo' })).outcome,
    'observed'
  )
  assert.equal(
    (
      await c.execute('play_youtube_video', {
        candidate_id: await candidate(c)
      })
    ).outcome,
    'observed'
  )
  assert.equal(c.state.youtube.videoId, 'aaaaaaaaaaa')
  assert.equal(
    (await c.execute('control_video', { action: 'pause' })).outcome,
    'observed'
  )
  assert.equal(
    (await c.execute('control_video', { action: 'resume' })).outcome,
    'observed'
  )
  assert.equal((await c.execute('return_to_xbox', {})).outcome, 'observed')
  assert.equal(c.state.tv.appId, 'hdmi3')
  assert.equal(c.state.youtube.playback, 'Paused')
})
void test('late search cannot replace newer context or candidates', async () => {
  let release!: (v: Video[]) => void
  const { coordinator: c } = fixture({
    find: async (query) =>
      query.includes('old')
        ? new Promise((resolve) => {
            release = resolve
          })
        : [video('bbbbbbbbbbb')]
  })
  const old = c.execute('find_youtube_video', { song: 'old', artist: 'Artist' })
  await c.execute('find_youtube_video', { song: 'new' })
  release([video('aaaaaaaaaaa')])
  assert.equal((await old).outcome, 'superseded')
  assert.equal(c.context.artist, 'Artist')
  assert.equal(c.context.song, 'new')
  assert.equal(c.candidates[0]?.videoId, 'bbbbbbbbbbb')
})
void test('new source wins even when an older launch ignores cancellation', async () => {
  const base = new Simulation(config())
  let started!: () => void, release!: () => void
  const waiting = new Promise<void>((r) => {
    started = r
  })
  const gate = new Promise<void>((r) => {
    release = r
  })
  const effects: string[] = []
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'tv.launch') {
        started()
        await gate
        effects.push(method)
        return base.request(method, params)
      }
      if (method !== 'state') effects.push(method)
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  const first = c.execute('play_youtube_video', {
    candidate_id: await candidate(c)
  })
  await waiting
  const second = c.execute('show_home', { target: 'tv' })
  release()
  assert.equal((await first).outcome, 'superseded')
  assert.equal((await second).outcome, 'accepted')
  assert.equal(base.state.tv.appId, 'simulation.home')
  assert.ok(!effects.includes('youtube.play'))
})
void test('volume is independent of a blocked media sequence', async () => {
  const base = new Simulation(config())
  let release!: () => void, entered!: () => void
  const gate = new Promise<void>((r) => {
    release = r
  })
  const started = new Promise<void>((r) => {
    entered = r
  })
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'tv.launch') {
        entered()
        await gate
      }
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  const play = c.execute('play_youtube_video', {
    candidate_id: await candidate(c)
  })
  await started
  assert.equal(
    (await c.execute('change_room_volume', { delta: -3 })).outcome,
    'observed'
  )
  assert.equal(base.state.tv.volume, 12)
  release()
  assert.equal((await play).outcome, 'observed')
})
void test('wrong-receiver and stale playback cannot pass observation', async () => {
  const base = new Simulation(config())
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      const result = await base.request(method, params, signal)
      if (method === 'state') {
        const state = structuredClone(base.state)
        state.youtube.receiverId = 'other-receiver'
        state.youtube.observedAt = 1
        return state
      }
      return result
    }
  }
  const { coordinator: c } = fixture(search, devices)
  c.config.timeoutMs = 250
  const result = await c.execute('play_youtube_video', {
    candidate_id: await candidate(c)
  })
  assert.equal(result.outcome, 'failed')
  assert.match(result.message, /Timed out/)
})
void test('unavailable receiver reports failure, never observed playback', async () => {
  const base = new Simulation(config())
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'youtube.connect') throw new Error('Receiver unavailable')
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  const result = await c.execute('play_youtube_video', {
    candidate_id: await candidate(c)
  })
  assert.equal(result.outcome, 'failed')
  assert.match(result.message, /Receiver unavailable/)
})
void test('invalid or superseded candidate cannot reach the device', async () => {
  const { coordinator: c } = fixture()
  const old = await candidate(c)
  await c.execute('find_youtube_video', { song: 'new' })
  assert.equal(
    (await c.execute('play_youtube_video', { candidate_id: old })).outcome,
    'failed'
  )
  assert.equal(
    (await c.execute('play_youtube_video', { candidate_id: 'invented' }))
      .outcome,
    'failed'
  )
  assert.equal(c.state.youtube.videoId, null)
})
void test('failed search keeps observed playback and allows correction context', async () => {
  const { coordinator: c } = fixture({
    find: async () => {
      await delay(1)
      throw new Error('Search unavailable')
    }
  })
  const before = structuredClone(c.state)
  assert.equal(
    (await c.execute('find_youtube_video', { song: 'Song', artist: 'Artist' }))
      .outcome,
    'failed'
  )
  assert.deepEqual(c.state, before)
  await c.execute('find_youtube_video', { version: 'live' })
  assert.deepEqual(c.context, {
    song: 'Song',
    artist: 'Artist',
    version: 'live'
  })
})
void test('volume cap and invalid arguments are enforced before effects', async () => {
  const { coordinator: c } = fixture()
  assert.equal(
    (await c.execute('set_room_volume', { level: 80 })).outcome,
    'observed'
  )
  assert.equal(c.state.tv.volume, 40)
  assert.equal(
    (await c.execute('set_room_volume', { level: -1 })).outcome,
    'failed'
  )
  assert.equal(c.state.tv.volume, 40)
})

void test('completed Xbox command with unavailable title stays accepted, not observed', async () => {
  const base = new Simulation(config())
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'xbox.launch')
        return { accepted: true, operationStatus: 'Succeeded' }
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  const result = await c.execute('start_game', { game_alias: 'demo' })
  assert.equal(result.outcome, 'accepted')
  assert.match(result.message, /did not report its foreground title/)
  assert.equal(c.state.xbox.activeTitle, null)
  assert.equal(c.state.tv.appId, 'hdmi3')
})

void test('pending Xbox command cannot use missing title as success', async () => {
  const base = new Simulation(config())
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'xbox.launch')
        return { accepted: true, operationStatus: 'Pending' }
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  c.config.timeoutMs = 150
  assert.equal(
    (await c.execute('start_game', { game_alias: 'demo' })).outcome,
    'failed'
  )
})

void test('completed command does not override a contradictory foreground title', async () => {
  const base = new Simulation(config())
  base.state.xbox.activeTitle = 'another-game'
  const devices: Devices = {
    close() {},
    async request(method, params, signal) {
      if (method === 'xbox.launch')
        return { accepted: true, operationStatus: 'Succeeded' }
      return base.request(method, params, signal)
    }
  }
  const { coordinator: c } = fixture(search, devices)
  c.config.timeoutMs = 150
  assert.equal(
    (await c.execute('start_game', { game_alias: 'demo' })).outcome,
    'failed'
  )
})

void test('seeking supports timestamps, relative jumps, restart and duration bounds without replacing video', async () => {
  const { coordinator: c } = fixture()
  await c.execute('play_youtube_video', { candidate_id: await candidate(c) })
  await c.execute('control_video', { action: 'pause' })
  for (const [mode, seconds, expected] of [
    ['absolute', 90, 90],
    ['relative', 30, 120],
    ['relative', -10, 110],
    ['relative', -200, 0],
    ['absolute', 999, 299],
    ['absolute', 0, 0]
  ] as const) {
    assert.equal(
      (await c.execute('seek_video', { mode, seconds })).outcome,
      'observed'
    )
    assert.equal(c.state.youtube.positionSeconds, expected)
    assert.equal(c.state.youtube.videoId, 'aaaaaaaaaaa')
    assert.equal(c.state.youtube.playback, 'Paused')
  }
  assert.equal(
    (await c.execute('seek_video', { mode: 'absolute', seconds: -1 })).outcome,
    'failed'
  )
})

void test('seeking rejects stale position and does not send a jump', async () => {
  const cfg = { ...config(), timeoutMs: 200 }
  const sim = new Simulation(cfg)
  sim.state.tv.appId = 'yt'
  Object.assign(sim.state.youtube, {
    connected: true,
    videoId: 'aaaaaaaaaaa',
    playback: 'Playing',
    positionSeconds: 50
  })
  let seeks = 0
  const c = new Coordinator(
    {
      async request(method, params, signal) {
        if (method === 'youtube.seek') seeks++
        const result = await sim.request(method, params, signal)
        if (method === 'state') {
          const state = result as typeof sim.state
          state.youtube.observedAt = 1
        }
        return result
      },
      close() {}
    },
    search,
    cfg,
    () => {}
  )
  assert.equal(
    (await c.execute('seek_video', { mode: 'relative', seconds: 30 })).outcome,
    'failed'
  )
  assert.equal(seeks, 0)
})

void test('seek acceptance without movement cannot count as observed', async () => {
  const cfg = { ...config(), timeoutMs: 300 }
  const sim = new Simulation(cfg)
  sim.state.tv.appId = 'yt'
  Object.assign(sim.state.youtube, {
    connected: true,
    videoId: 'aaaaaaaaaaa',
    playback: 'Paused',
    positionSeconds: 10
  })
  const c = new Coordinator(
    {
      request: (method, params, signal) =>
        method === 'youtube.seek'
          ? Promise.resolve(true)
          : sim.request(method, params, signal),
      close() {}
    },
    search,
    cfg,
    () => {}
  )
  assert.equal(
    (await c.execute('seek_video', { mode: 'absolute', seconds: 90 })).outcome,
    'failed'
  )
})

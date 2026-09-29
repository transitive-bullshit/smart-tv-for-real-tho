import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DisplayState, startDisplayFeed } from '../src/display.js'
import type { Trace } from '../src/contracts.js'

const event = (requestId: string, phase: string, at = 100): Trace => ({
  requestId,
  phase,
  at,
  action: 'play_youtube_video',
  elapsedMs: 0,
  mode: 'live'
})
void test('display ignores old completions, read probes and raw trace details', () => {
  const state = new DisplayState()
  state.update(event('old', 'intent_ready'))
  state.update(event('new', 'intent_ready', 101))
  state.update({ ...event('old', 'failed', 102), detail: 'private diagnostic' })
  state.update({
    ...event('read', 'intent_ready', 103),
    action: 'get_room_state'
  })
  assert.equal(state.snapshot('live', 104).phase, 'intent_ready')
  state.update({
    ...event('new', 'accepted', 105),
    detail: 'private diagnostic'
  })
  assert.equal(state.snapshot('live', 106).phase, 'accepted')
  assert.equal(state.snapshot('live', 106).message, 'Request sent')
  assert.ok(
    !JSON.stringify(state.snapshot('live', 106)).includes('private diagnostic')
  )
  assert.equal(state.snapshot('live', 61006).phase, 'idle')
  state.reset()
  assert.equal(state.snapshot('simulation', 106).mode, 'simulation')
  assert.equal(state.snapshot('simulation', 106).phase, 'idle')
})
void test('search completion is not presented as confirmed device playback', () => {
  const state = new DisplayState()
  state.update({
    ...event('search', 'intent_ready'),
    action: 'find_youtube_video'
  })
  state.update({ ...event('search', 'observed'), action: 'find_youtube_video' })
  assert.equal(state.snapshot('live', 101).message, 'Search results ready')
})
void test('LAN feed requires a token and cannot serve controls, config or credentials', async (t) => {
  const state = new DisplayState()
  const feed = await startDisplayFeed('127.0.0.1', 0, () =>
    state.snapshot('simulation')
  )
  t.after(async () => {
    feed.server.closeAllConnections()
    await new Promise<void>((resolve) => feed.server.close(() => resolve()))
  })
  assert.equal((await fetch(feed.url)).status, 401)
  assert.equal(
    (await fetch(feed.url, { headers: { Authorization: 'Bearer wrong' } }))
      .status,
    401
  )
  const auth = { Authorization: 'Bearer ' + feed.token }
  const ok = await fetch(feed.url, { headers: auth })
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('cache-control'), 'no-store')
  const frame = (await ok.json()) as Record<string, unknown>
  assert.deepEqual(Object.keys(frame).sort(), [
    'appearance',
    'detail',
    'dismiss',
    'inputLevel',
    'message',
    'mode',
    'motion',
    'outputLevel',
    'phase',
    'source',
    'title',
    'updatedAt',
    'visual'
  ])
  assert.equal(frame.mode, 'simulation')
  assert.equal(
    (await fetch(feed.url, { method: 'POST', headers: auth })).status,
    405
  )
  for (const path of ['/api/status', '/api/tool', '/api/secrets']) {
    assert.equal(
      (await fetch(new URL(path, feed.url), { headers: auth })).status,
      404
    )
  }
  const preflight = await fetch(feed.url, { method: 'OPTIONS' })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET')
  assert.equal(
    preflight.headers.get('access-control-allow-headers'),
    'Authorization'
  )
})

void test('display hide is idempotent and later tool progress cannot reopen it', () => {
  const state = new DisplayState()
  assert.equal(state.snapshot('live').dismiss, true)
  state.show()
  assert.equal(state.snapshot('live').dismiss, false)
  state.hide()
  state.hide()
  state.update({
    mode: 'live',
    at: Date.now(),
    requestId: 'new',
    action: 'set_room_volume',
    phase: 'intent_ready',
    elapsedMs: 0
  })
  assert.equal(state.snapshot('live').dismiss, true)
  state.show()
  assert.equal(state.snapshot('live').dismiss, false)
  state.reset()
  assert.equal(state.snapshot('live').dismiss, true)
})

void test('voice events reject old sessions and reordered events; listening expires and Hide persists', () => {
  const state = new DisplayState()
  state.startVoice('old')
  state.startVoice('current')
  assert.equal(state.voice('old', 5, 'speaking', 100), false)
  assert.equal(state.voice('current', 2, 'listening', 100), true)
  assert.equal(state.voice('current', 1, 'speaking', 101), false)
  assert.equal(state.snapshot('live', 110).visual, 'listening')
  assert.equal(state.snapshot('live', 30101).visual, 'idle')
  state.show()
  state.autoRestore = true
  state.hide()
  state.voice('current', 3, 'speaking', 200)
  assert.equal(state.snapshot('live', 210).dismiss, true)
  assert.equal(state.autoRestore, false)
})

void test('audio levels are session checked, ordered, bounded, phase gated and short lived', () => {
  const state = new DisplayState()
  state.startVoice('current')
  state.voice('current', 0, 'listening', 100)
  assert.equal(state.audio('old', 1, 0.5, 0.9, 100), false)
  assert.equal(state.audio('current', 2, 0.4, 0.8, 100), true)
  assert.equal(state.audio('current', 1, 0.9, 0.9, 101), false)
  assert.equal(state.audio('current', 3, NaN, 0, 101), false)
  assert.equal(state.audio('current', 3, 2, 0, 101), false)
  assert.equal(state.snapshot('live', 102).inputLevel, 0.4)
  assert.equal(state.snapshot('live', 102).outputLevel, 0)
  state.voice('current', 1, 'speaking', 103)
  assert.equal(state.snapshot('live', 104).inputLevel, 0)
  assert.equal(state.snapshot('live', 104).outputLevel, 0.8)
  assert.equal(state.snapshot('live', 851).outputLevel, 0)
  state.startVoice('new')
  state.voice('new', 0, 'speaking', 900)
  assert.equal(state.snapshot('live', 901).outputLevel, 0)
  state.hide()
  state.audio('new', 0, 0, 0.5, 900)
  assert.equal(state.snapshot('live', 901).dismiss, true)
})

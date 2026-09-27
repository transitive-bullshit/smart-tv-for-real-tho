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
  assert.match(state.snapshot('live', 106).message, /not verified/)
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
  assert.match(state.snapshot('live', 101).message, /nothing played/)
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
    'message',
    'mode',
    'phase',
    'title',
    'updatedAt'
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

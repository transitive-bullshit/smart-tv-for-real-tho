import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AmbientIdlePolicy,
  HOME_APP,
  AMBIENT_APP,
  SCREENSAVER_APP
} from '../src/ambient-auto.js'
import type { AmbientObservation } from '../src/ambient-auto.js'
import { Coordinator } from '../src/coordinator.js'
import { configSchema } from '../src/contracts.js'

function sample(
  at: number,
  appId = HOME_APP,
  powerState = 'Active',
  processing: string | null = null
): AmbientObservation {
  return { observedAt: at, appId, powerState, processing }
}
function idle(policy: AmbientIdlePolicy, at = 2000, app = HOME_APP) {
  assert.equal(policy.observe(sample(at, app, 'Screen Saver'), at), false)
  assert.equal(
    policy.observe(sample(at + 2000, app, 'Screen Saver'), at + 2000),
    false
  )
  return policy.observe(sample(at + 4000, app, 'Screen Saver'), at + 4000)
}
void test('automatic ambient requires fresh Home, then stable LG idle; one launch per transition', () => {
  for (const app of [HOME_APP, SCREENSAVER_APP]) {
    const policy = new AmbientIdlePolicy(60000)
    assert.equal(idle(policy, 0, app), false)
    policy.observe(sample(5000), 5000)
    policy.observe(
      sample(6000, HOME_APP, 'Active', 'Request Screen Saver'),
      6000
    )
    policy.observe(sample(6500, HOME_APP, 'Active', 'Screen Saver Ready'), 6500)
    assert.equal(idle(policy, 7000, app), true)
    assert.equal(
      policy.observe(sample(13000, app, 'Screen Saver'), 13000),
      false
    )
  }
})
void test('browsing Home for hours never triggers without LG screensaver; other sources never qualify', () => {
  const policy = new AmbientIdlePolicy(60000)
  for (let at = 0; at < 3600000; at += 2000)
    assert.equal(policy.observe(sample(at), at), false)
  for (const app of ['youtube.leanback.v4', 'com.webos.app.hdmi3', 'unknown']) {
    const other = new AmbientIdlePolicy(60000)
    other.observe(sample(0), 0)
    other.observe(sample(1000, app), 1000)
    assert.equal(idle(other), false)
  }
})
void test('shutdown, screen off, unknown processing, stale data and observation gaps disarm', () => {
  for (const blocked of [
    sample(1000, HOME_APP, 'Screen Off'),
    sample(1000, HOME_APP, 'Active Standby'),
    sample(1000, HOME_APP, 'Suspend'),
    sample(1000, HOME_APP, 'Power Off'),
    sample(1000, HOME_APP, 'unknown'),
    sample(1000, HOME_APP, 'Screen Saver', 'Request Power Off'),
    sample(1000, HOME_APP, 'Screen Saver', 'unknown')
  ]) {
    const policy = new AmbientIdlePolicy(60000)
    policy.observe(sample(0), 0)
    assert.equal(policy.observe(blocked, 1000), false)
    assert.equal(idle(policy), false)
  }
  const stale = new AmbientIdlePolicy(60000)
  stale.observe(sample(0), 0)
  stale.observe(sample(0), 7000)
  assert.equal(idle(stale, 8000), false)
  const resumed = new AmbientIdlePolicy(60000)
  resumed.observe(sample(0), 0)
  assert.equal(idle(resumed, 30000), false)
})
void test('dismissal and controller commands pause opening and require a new Home observation', () => {
  const policy = new AmbientIdlePolicy(60000)
  policy.observe(sample(0, AMBIENT_APP), 0)
  policy.observe(sample(2000), 2000)
  assert.equal(idle(policy, 4000), false)
  for (let at = 10000; at < 70000; at += 2000) policy.observe(sample(at), at)
  assert.equal(idle(policy, 70000), true)
  policy.activity(76000)
  assert.equal(idle(policy, 78000), false)
  for (let at = 84000; at < 140000; at += 2000) policy.observe(sample(at), at)
  assert.equal(idle(policy, 140000), true)
})
void test('queued automatic launch yields to cancellation and never touches simulation devices', async () => {
  let calls = 0
  const devices = {
    request: async () => {
      calls++
      return { accepted: true }
    },
    close() {}
  }
  const coordinator = new Coordinator(
    devices,
    { find: async () => [] },
    configSchema.parse({}),
    () => {}
  )
  const abort = new AbortController()
  const pending = coordinator.launchAmbientIfIdle(
    sample(Date.now()),
    abort.signal
  )
  abort.abort()
  await assert.rejects(pending)
  assert.equal(calls, 0)
  const pending2 = coordinator.launchAmbientIfIdle(
    sample(Date.now()),
    new AbortController().signal
  )
  coordinator.cancel()
  await assert.rejects(pending2)
  assert.equal(calls, 0)
  const simulation = new Coordinator(
    devices,
    { find: async () => [] },
    configSchema.parse({ mode: 'simulation' }),
    () => {}
  )
  assert.equal(
    await simulation.launchAmbientIfIdle(
      sample(Date.now()),
      new AbortController().signal
    ),
    false
  )
  assert.equal(calls, 0)
})

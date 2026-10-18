import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import {
  AmbientIdlePolicy,
  AmbientAuto,
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
function recovery(policy: AmbientIdlePolicy, at = 0, app = HOME_APP) {
  for (let elapsed = 0; elapsed < 10000; elapsed += 2000)
    assert.equal(
      policy.observe(sample(at + elapsed, app, 'Screen Saver'), at + elapsed),
      false
    )
  return policy.observe(sample(at + 10000, app, 'Screen Saver'), at + 10000)
}
void test('startup recovers an existing Home screensaver after ten seconds of fresh stable reads', () => {
  const policy = new AmbientIdlePolicy(60000)
  assert.equal(recovery(policy), true)
  assert.equal(
    policy.observe(sample(12000, HOME_APP, 'Screen Saver'), 12000),
    false
  )
  const unknownOrigin = new AmbientIdlePolicy(60000)
  assert.equal(recovery(unknownOrigin, 0, SCREENSAVER_APP), false)
})
void test('read failures and sleep gaps retain dismissal history and save its cooldown', () => {
  for (const gap of [false, true]) {
    let until = 0
    const policy = new AmbientIdlePolicy(60000, 0, (next) => {
      until = next
    })
    policy.observe(sample(0, AMBIENT_APP), 0)
    if (gap) policy.observe(sample(30000, HOME_APP, 'Screen Saver'), 30000)
    else policy.reset('Connection lost while Ambient was open')
    const at = gap ? 32000 : 2000
    assert.equal(recovery(policy, at), false)
    assert.equal(until, at + 60000)
  }
})
void test('known media observed during a restored cooldown excludes later catch-up', () => {
  for (const app of [
    'youtube.leanback.v4',
    'com.webos.app.hdmi3',
    'unknown',
    SCREENSAVER_APP
  ]) {
    const policy = new AmbientIdlePolicy(60000, 20000)
    policy.observe(
      sample(0, app, app === SCREENSAVER_APP ? 'Screen Saver' : 'Active'),
      0
    )
    for (let now = 2000; now <= 40000; now += 2000)
      assert.equal(
        policy.observe(sample(now, HOME_APP, 'Screen Saver'), now),
        false
      )
    policy.observe(sample(42000), 42000)
    assert.equal(idle(policy, 44000), true)
  }
})
void test('sleep gaps and reconnects recover idle without needing an unobserved Home transition', () => {
  const resumed = new AmbientIdlePolicy(60000)
  resumed.observe(sample(0), 0)
  assert.equal(
    resumed.observe(sample(30000, HOME_APP, 'Screen Saver'), 30000),
    false
  )
  assert.equal(recovery(resumed, 32000), true)

  const reconnected = new AmbientIdlePolicy(60000)
  reconnected.observe(sample(0), 0)
  reconnected.reset('Disconnected')
  assert.equal(recovery(reconnected, 2000), true)
})
void test('recovery never replaces known media, power transitions or stale observations', () => {
  for (const blocked of [
    sample(0, 'youtube.leanback.v4', 'Screen Saver'),
    sample(0, 'com.webos.app.hdmi3', 'Screen Saver'),
    sample(0, 'unknown', 'Screen Saver'),
    sample(0, HOME_APP, 'Active Standby'),
    sample(0, HOME_APP, 'Screen Off'),
    sample(0, HOME_APP, 'Screen Saver', 'Request Power Off')
  ]) {
    const policy = new AmbientIdlePolicy(60000)
    assert.equal(policy.observe(blocked, 0), false)
    assert.equal(recovery(policy, 2000), false)
  }
  const policy = new AmbientIdlePolicy(60000)
  for (let now = 10000; now <= 30000; now += 2000)
    assert.equal(
      policy.observe(sample(0, HOME_APP, 'Screen Saver'), now),
      false
    )
  assert.equal(recovery(policy, 32000), true)
})
void test('a spent launch attempt is retained across disconnects until a new Home transition', () => {
  const policy = new AmbientIdlePolicy(60000)
  assert.equal(recovery(policy), true)
  policy.reset('Disconnected after launch')
  assert.equal(recovery(policy, 12000), false)
  policy.observe(sample(24000), 24000)
  assert.equal(idle(policy, 26000), true)
})
void test('dismissal cooldown is saved and retained across controller recreation and configuration changes', () => {
  let saved = { cooldownUntil: 0 }
  const first = new AmbientIdlePolicy(60000, 0, (cooldownUntil) => {
    saved = { cooldownUntil }
  })
  first.observe(sample(0, AMBIENT_APP), 0)
  first.observe(sample(2000), 2000)
  assert.equal(saved.cooldownUntil, 62000)
  const restored = new AmbientIdlePolicy(60000, saved.cooldownUntil)
  for (let now = 4000; now < 62000; now += 2000)
    assert.equal(
      restored.observe(sample(now, HOME_APP, 'Screen Saver'), now),
      false
    )
  assert.equal(recovery(restored, 62000), true)

  const auto = new AmbientAuto(
    {
      read: async () => ({}),
      launch: async () => true,
      reconnect: async () => {}
    },
    () => {},
    { enabled: true, cooldownSeconds: 60 },
    saved,
    (next) => {
      saved = next
    }
  )
  auto.configure({ enabled: true, cooldownSeconds: 60 }, true)
  auto.activity()
  const pausedUntil = saved.cooldownUntil
  auto.configure({ enabled: true, cooldownSeconds: 180 }, true)
  assert.equal(auto.status().cooldownUntil, pausedUntil)
  auto.stop()
})
void test('the watcher recovers after a read failure and does not repeat an uncertain launch', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 })
  let reads = 0
  let reconnects = 0
  let attempts = 0
  const messages: string[] = []
  const config = { enabled: true, cooldownSeconds: 60 }
  const auto = new AmbientAuto(
    {
      read: async () => {
        if (reads++ === 0) throw new Error('Connection lost')
        return sample(Date.now(), HOME_APP, 'Screen Saver')
      },
      launch: async () => {
        attempts++
        throw new Error('Launch outcome unavailable')
      },
      reconnect: async () => {
        reconnects++
      }
    },
    (message) => messages.push(message),
    config
  )
  auto.configure(config, true)
  try {
    for (let elapsed = 0; elapsed < 40000; elapsed += 2000) {
      t.mock.timers.tick(2000)
      await setImmediate()
      if (elapsed < 12000) assert.equal(attempts, 0)
    }
    assert.ok(reads > 10)
    assert.ok(reconnects > 0)
    assert.equal(attempts, 1)
    assert.equal(auto.status().launches, 0)
    assert.ok(
      messages.some((message) => message.includes('Launch outcome unavailable'))
    )
    assert.equal(
      auto.status().message,
      'Waiting for a new Home → idle transition.'
    )
  } finally {
    auto.stop()
  }
})
void test('observed Home enables the four-second handoff; one launch per transition', () => {
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

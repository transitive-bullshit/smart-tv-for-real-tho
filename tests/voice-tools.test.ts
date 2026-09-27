import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VoiceTools } from '../web/voice-tools.js'

function deferred<T = unknown>() {
  return Promise.withResolvers<T>()
}
function created(id = 'r1') {
  return { type: 'response.created', response: { id } }
}
function done(id = 'r1', ids = ['c1']) {
  return {
    type: 'response.done',
    response: {
      id,
      output: ids.map((call_id) => ({
        type: 'function_call',
        call_id,
        name: 'return_to_xbox',
        arguments: '{}'
      }))
    }
  }
}
function harness(
  request: (path: string, data: unknown) => Promise<unknown> = async () => ({
    outcome: 'observed'
  })
) {
  const sent: any[] = []
  const status: string[] = []
  return {
    sent,
    status,
    tools: new VoiceTools(
      (message) => sent.push(message),
      request,
      (text) => status.push(text)
    )
  }
}
void test('closing a session suppresses its late tool output and continuation after reconnect', async () => {
  const result = deferred()
  const started = deferred<void>()
  const old = harness(async () => {
    started.resolve()
    return result.promise
  })
  await old.tools.receive(created())
  const pending = old.tools.receive(done())
  await started.promise
  old.tools.close()
  const fresh = harness()
  await fresh.tools.receive(created('r2'))
  await fresh.tools.receive(done('r2', ['c2']))
  result.resolve({ outcome: 'observed' })
  await pending
  assert.deepEqual(old.sent, [])
  assert.equal(fresh.sent.length, 2)
  assert.equal(fresh.sent[0].item.call_id, 'c2')
})
void test('interruption skips remaining batch effects and avoids stale continuation', async () => {
  const result = deferred()
  const started = deferred<void>()
  const effects: string[] = []
  const h = harness(async (path) => {
    effects.push(path)
    if (path === 'tool') {
      started.resolve()
      return result.promise
    }
    return {}
  })
  await h.tools.receive(created())
  const pending = h.tools.receive(done('r1', ['c1', 'c2']))
  await started.promise
  await h.tools.interrupt()
  result.resolve({ outcome: 'superseded' })
  await pending
  assert.deepEqual(effects, ['tool', 'cancel'])
  assert.equal(
    h.sent.some((event) => event.type === 'response.create'),
    false
  )
  const outputs = h.sent.filter(
    (event) => event.type === 'conversation.item.create'
  )
  assert.equal(outputs.length, 2)
  assert.equal(JSON.parse(outputs[1].item.output).outcome, 'superseded')
})
void test('a new response waits for interruption cancellation before executing tools', async () => {
  const cancellation = deferred()
  const cancelStarted = deferred<void>()
  const effects: string[] = []
  const h = harness(async (path) => {
    effects.push(path)
    if (path === 'cancel') {
      cancelStarted.resolve()
      return cancellation.promise
    }
    return {}
  })
  const interruption = h.tools.interrupt()
  await cancelStarted.promise
  await h.tools.receive(created())
  const pending = h.tools.receive(done())
  await Promise.resolve()
  assert.deepEqual(effects, ['cancel'])
  cancellation.resolve({})
  await interruption
  await pending
  assert.deepEqual(effects, ['cancel', 'tool'])
})
void test('duplicate response events execute a batch once and emit one continuation', async () => {
  let calls = 0
  const h = harness(async () => {
    calls++
    return {}
  })
  await h.tools.receive(created())
  await Promise.all([h.tools.receive(done()), h.tools.receive(done())])
  assert.equal(calls, 1)
  assert.equal(
    h.sent.filter((event) => event.type === 'response.create').length,
    1
  )
})
void test('failed cancellation prevents new tool side effects', async () => {
  let calls = 0
  const h = harness(async (path) => {
    if (path === 'cancel') throw new Error('offline')
    calls++
    return {}
  })
  await assert.rejects(h.tools.interrupt(), /offline/)
  await h.tools.receive(created())
  await assert.rejects(h.tools.receive(done()), /offline/)
  assert.equal(calls, 0)
})
void test('malformed events do not throw and untracked responses cannot execute tools', async () => {
  let calls = 0
  const h = harness(async () => {
    calls++
    return {}
  })
  await h.tools.receive('{')
  await h.tools.receive(done())
  assert.equal(calls, 0)
  assert.equal(h.status[0], 'Invalid voice event received.')
  assert.equal(JSON.parse(h.sent[0].item.output).outcome, 'superseded')
})

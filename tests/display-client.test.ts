import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const script = await readFile('tv/display/display.js', 'utf8')
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
function client(fetcher: typeof fetch) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const elements = Object.fromEntries(
    ['title', 'message', 'status', 'dismiss'].map((id) => [
      id,
      {
        textContent: '',
        focus() {},
        addEventListener(type: string, fn: (event: unknown) => void) {
          listeners[id + ':' + type] = fn
        }
      }
    ])
  )
  let closed = false
  const timers = new Map<number, () => void>()
  let next = 0
  runInNewContext(script, {
    URL,
    AbortController,
    fetch: fetcher,
    setTimeout: (fn: () => void) => {
      const id = ++next
      timers.set(id, fn)
      return id
    },
    clearTimeout: (id: number) => timers.delete(id),
    document: {
      getElementById: (id: string) => elements[id],
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        listeners[type] = fn
      }
    },
    window: {
      close: () => {
        closed = true
      },
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        listeners[type] = fn
      }
    }
  })
  return { elements, listeners, timers, closed: () => closed }
}
const params = {
  url: 'http://192.168.1.2:3212/display/state',
  token: 'a'.repeat(43)
}
const frame = {
  mode: 'live',
  title: '<b>Actual request</b>',
  message: 'Command accepted · visible result not verified'
}

void test('TV client refuses to send its token to public or credential-bearing URLs', async () => {
  let calls = 0
  const c = client(async () => {
    calls++
    return Response.json(frame)
  })
  for (const url of [
    'https://example.com/display/state',
    'http://user@192.168.1.2/display/state',
    'http://192.168.1.2/api/tool'
  ]) {
    c.listeners.webOSLaunch!({ detail: { ...params, url } })
    await flush()
  }
  assert.equal(calls, 0)
  assert.equal(c.elements.title!.textContent, 'Connection needed')
})
void test('TV client uses text content, preserves acceptance wording and stops on dismissal', async () => {
  let captured: RequestInit | undefined
  const c = client(async (_url, init) => {
    captured = init
    return Response.json(frame)
  })
  c.listeners.webOSLaunch!({ detail: params })
  await flush()
  assert.equal(c.elements.title!.textContent, frame.title)
  assert.equal(c.elements.message!.textContent, frame.message)
  assert.equal(captured?.credentials, 'omit')
  assert.equal(
    new Headers(captured?.headers).get('Authorization'),
    'Bearer ' + params.token
  )
  c.listeners['dismiss:click']!({})
  assert.ok(c.closed())
  assert.equal(c.timers.size, 0)
})
void test('late display response cannot overwrite a newer launch or revive a dismissed panel', async () => {
  let release!: (r: Response) => void
  let calls = 0
  const c = client(async () => {
    if (++calls === 1)
      return new Promise<Response>((r) => {
        release = r
      })
    return Response.json({ ...frame, title: 'New request' })
  })
  c.listeners.webOSLaunch!({ detail: params })
  c.listeners.webOSRelaunch!({ detail: params })
  await flush()
  release(Response.json({ ...frame, title: 'Old request' }))
  await flush()
  assert.equal(c.elements.title!.textContent, 'New request')
  c.listeners['dismiss:click']!({})
  c.listeners.webOSRelaunch!({ detail: params })
  assert.equal(calls, 2)
  assert.equal(c.timers.size, 0)
})

void test('feed dismissal closes the panel and stops polling without a device command', async () => {
  let calls = 0
  const c = client(async () => {
    calls++
    return Response.json({ ...frame, dismiss: true })
  })
  c.listeners.webOSLaunch!({ detail: params })
  await flush()
  assert.equal(c.closed(), true)
  assert.equal(calls, 1)
  assert.equal(c.timers.size, 0)
  assert.equal(c.elements.status!.textContent, 'Close requested')
})

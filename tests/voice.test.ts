import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Voice } from '../web/voice.js'

function mockProperty(
  t: TestContext,
  object: object,
  name: string,
  value: unknown
) {
  const previous = Object.getOwnPropertyDescriptor(object, name)
  Object.defineProperty(object, name, { configurable: true, value })
  t.after(() => {
    if (previous) Object.defineProperty(object, name, previous)
    else Reflect.deleteProperty(object, name)
  })
}
function stream() {
  const track = {
    enabled: false,
    stopped: false,
    stop() {
      this.stopped = true
    }
  }
  return { track, getTracks: () => [track], getAudioTracks: () => [track] }
}
function browser(t: TestContext, getUserMedia: () => Promise<unknown>) {
  const peers: Peer[] = []
  const sent: any[] = []
  const statuses: string[] = []
  class Channel extends EventTarget {
    readyState = 'open'
    onmessage?: (event: { data: string }) => void
    send(text: string) {
      sent.push(JSON.parse(text))
    }
    close() {
      this.readyState = 'closed'
      this.dispatchEvent(new Event('close'))
    }
  }
  class Peer {
    channel = new Channel()
    connectionState = 'connected'
    onconnectionstatechange?: () => void
    ontrack?: (event: unknown) => void
    constructor() {
      peers.push(this)
    }
    addTrack() {}
    createDataChannel() {
      return this.channel
    }
    async createOffer() {
      return { sdp: 'offer' }
    }
    async setLocalDescription() {}
    async setRemoteDescription() {}
    close() {
      this.connectionState = 'closed'
    }
  }
  mockProperty(
    t,
    globalThis,
    'Audio',
    class {
      autoplay = false
      srcObject: unknown
      async play() {}
      pause() {}
    }
  )
  mockProperty(t, globalThis, 'RTCPeerConnection', Peer)
  mockProperty(t, navigator, 'mediaDevices', { getUserMedia })
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request) =>
      new Response(url === '/api/session' ? 'answer' : '{}')
  )
  const voice = new Voice(
    (text) => statuses.push(text),
    () => {}
  )
  t.after(() => voice.close())
  return { peers, sent, statuses, voice }
}
void test('delayed microphone permission cannot revive an old connection or close the replacement', async (t) => {
  const permission = Promise.withResolvers<unknown>()
  const stale = stream()
  const fresh = stream()
  let requests = 0
  const h = browser(t, () =>
    ++requests === 1 ? permission.promise : Promise.resolve(fresh)
  )
  const first = h.voice.connect(false)
  const rejected = assert.rejects(first, /superseded/)
  await h.voice.connect(false)
  permission.resolve(stale)
  await rejected
  assert.equal(stale.track.stopped, true)
  assert.equal(fresh.track.stopped, false)
  assert.equal(h.peers[1]!.connectionState, 'connected')
})
void test('callbacks from an old peer cannot disconnect the replacement', async (t) => {
  const h = browser(t, async () => stream())
  await h.voice.connect(false)
  const old = h.peers[0]!
  await h.voice.connect(false)
  old.connectionState = 'failed'
  old.onconnectionstatechange?.()
  assert.equal(h.peers[1]!.connectionState, 'connected')
  assert.equal(h.statuses.at(-1), 'Voice ready · push to talk')
})
void test('release during pending interruption never opens the mic or commits an empty buffer', async (t) => {
  const mic = stream()
  const cancellation = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<void>()
  const h = browser(t, async () => mic)
  await h.voice.connect(false)
  t.mock.method(globalThis, 'fetch', async () => {
    started.resolve()
    return cancellation.promise
  })
  const press = h.voice.talk(true)
  await started.promise
  await h.voice.talk(false)
  cancellation.resolve(new Response('{}'))
  await press
  assert.equal(mic.track.enabled, false)
  assert.equal(
    h.sent.some((event) => event.type === 'input_audio_buffer.commit'),
    false
  )
  assert.equal(
    h.sent.some((event) => event.type === 'response.create'),
    false
  )
})

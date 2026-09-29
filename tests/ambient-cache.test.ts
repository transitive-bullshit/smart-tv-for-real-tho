import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { ImageCache } from '../tv/ambient-src/image-cache.js'

const settle = () => new Promise<void>((resolve) => setImmediate(resolve))
function setup(t: TestContext, byteLimit = 16) {
  const assets = Array.from({ length: 20 }, (_, i) => ({
    url: String(i),
    bytes: 4,
    contentType: 'image/jpeg'
  }))
  const pending = new Map<
    number,
    {
      signal: AbortSignal
      resolve: (blob: Blob) => void
      reject: (error: unknown) => void
    }
  >()
  const called: number[] = []
  const failed: number[] = []
  const idle = new Set<() => void>()
  const revoked: string[] = []
  t.mock.method(URL, 'createObjectURL', () => 'blob:' + called.length)
  t.mock.method(URL, 'revokeObjectURL', (url: string) => revoked.push(url))
  const cache = new ImageCache(
    assets,
    (index) => failed.push(index),
    (asset, signal) =>
      new Promise((resolve, reject) => {
        const index = Number(asset.url)
        called.push(index)
        pending.set(index, { signal, resolve, reject })
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true }
        )
      }),
    { bytes: byteLimit, entries: 4, concurrent: 2, ahead: 12 },
    (callback) => {
      idle.add(callback)
      return () => idle.delete(callback)
    }
  )
  t.after(() => cache.clear())
  const finish = async (index: number) => {
    pending.get(index)!.resolve(new Blob(['jpeg']))
    await settle()
  }
  const runIdle = () => {
    const callbacks = [...idle]
    idle.clear()
    for (const callback of callbacks) callback()
  }
  return { cache, pending, called, failed, finish, runIdle, revoked, idle }
}

void test('priority downloads precede idle prefetch, queue a manual target, and honor byte/concurrency limits', async (t) => {
  const { cache, called, finish, runIdle } = setup(t)
  cache.plan([0, 1, 2], [0, 1, 3, 4, 5])
  const selected = cache.get(2)
  assert.deepEqual(called, [0, 1])
  runIdle()
  assert.equal(called.length, 2)
  await finish(0)
  assert.deepEqual(called, [0, 1, 2])
  await finish(1)
  runIdle()
  assert.equal(
    called.length,
    3,
    'idle work waits until the manual target is ready'
  )
  await finish(2)
  assert.match(await selected, /^blob:/)
  runIdle()
  assert.deepEqual(called, [0, 1, 2, 3])
  await finish(3)
  runIdle()
  assert.equal(cache.stats.cached, 4)
  assert.equal(cache.stats.bytes, 16)
  assert.equal(cache.stats.downloading, 0)
})

void test('LRU eviction releases blob URLs while preserving displayed/preloaded images', async (t) => {
  const { cache, finish, runIdle, called, revoked } = setup(t, 12)
  cache.plan([0, 1], [2, 3])
  await finish(0)
  await finish(1)
  runIdle()
  await finish(2)
  assert.equal(cache.stats.bytes, 12)
  cache.plan([1, 2], [3, 4])
  runIdle()
  await finish(3)
  assert.deepEqual(called, [0, 1, 2, 3])
  assert.equal(revoked.length, 1)
  assert.match(await cache.get(1), /^blob:/)
  cache.clear()
  assert.equal(cache.stats.bytes, 0)
  assert.equal(revoked.length, 4)
})

void test('cancelled selections cannot revive blobs and failed images stay excluded', async (t) => {
  const { cache, pending, finish, failed } = setup(t)
  cache.plan([0, 1], [])
  const old = cache.get(1)
  const cancelled = assert.rejects(old, /released/)
  cache.plan([0, 2], [])
  assert.equal(pending.get(1)!.signal.aborted, true)
  await cancelled
  await settle()
  pending.get(1)!.resolve(new Blob(['jpeg']))
  pending.get(2)!.reject(new Error('Retries exhausted'))
  await settle()
  assert.deepEqual(failed, [2])
  await finish(0)
  cache.plan([0, 2], [2])
  assert.equal(cache.stats.cached, 1)
  assert.equal(cache.stats.bytes, 4)
})

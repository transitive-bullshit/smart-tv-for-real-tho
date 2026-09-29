import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { PhotoPool } from '../tv/ambient-src/photo-pool.js'
import { slides } from '../tv/ambient-src/model.js'

class TestPhoto extends EventTarget {
  static created: TestPhoto[] = []
  src = ''
  alt = ''
  hidden = false
  complete = false
  naturalWidth = 0
  naturalHeight = 0
  style: Record<string, string> = {}
  removed = false
  constructor() {
    super()
    TestPhoto.created.push(this)
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
  remove() {
    this.removed = true
  }
  finish() {
    this.naturalWidth = 2912
    this.naturalHeight = 1632
    this.dispatchEvent(new Event('load'))
  }
}

function setup(t: TestContext) {
  const original = globalThis.Image
  globalThis.Image = TestPhoto as unknown as typeof Image
  TestPhoto.created = []
  t.after(() => {
    if (original) globalThis.Image = original
    else Reflect.deleteProperty(globalThis, 'Image')
  })
  const loaded: number[] = []
  const failed: number[] = []
  const pool = new PhotoPool(
    { append() {} } as unknown as HTMLElement,
    (index) => loaded.push(index),
    (index) => failed.push(index)
  )
  t.after(() => pool.retain([]))
  return { pool, loaded, failed }
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve))

void test('cycling the catalog releases old sources and retains only the current pair', async (t) => {
  const { pool, failed } = setup(t)
  for (let index = 0; index < slides.length; index++) {
    const next = (index + 1) % slides.length
    pool.retain([index, next])
    await settle()
    const active = TestPhoto.created.filter((image) => !image.removed)
    assert.equal(active.length, 2)
    for (const image of active) image.finish()
    await settle()
    assert.ok(pool.get(index))
    assert.ok(pool.get(next))
    for (const image of TestPhoto.created.filter((image) => image.removed))
      assert.equal(image.src, '')
  }
  pool.retain([])
  assert.ok(TestPhoto.created.every((image) => image.removed && !image.src))
  assert.deepEqual(failed, [])
})

void test('a superseded scene cannot report a late load or failure after rapid selection', async (t) => {
  const { pool, loaded, failed } = setup(t)
  pool.retain([0, 1, 2])
  const cancelled = TestPhoto.created[2]!
  pool.retain([0, 1, 3])
  await settle()
  assert.equal(TestPhoto.created.filter((image) => !image.removed).length, 3)
  cancelled.finish()
  cancelled.dispatchEvent(new Event('error'))
  TestPhoto.created[3]!.finish()
  await settle()
  assert.equal(pool.get(2), undefined)
  assert.ok(pool.get(3))
  assert.deepEqual(loaded, [3])
  assert.deepEqual(failed, [])
})

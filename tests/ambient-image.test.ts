import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadImage } from '../tv/ambient-src/load-image.js'

class TestImage extends EventTarget {
  src = ''
  complete = false
  naturalWidth = 0
  naturalHeight = 0
  decode() {
    throw new Error('webOS optional decode rejected')
  }
}
void test('a visibly loaded image starts without depending on decode()', async () => {
  const image = new TestImage()
  const loaded = loadImage(image, 'media/desk.jpg')
  image.naturalWidth = 2912
  image.naturalHeight = 1632
  image.complete = true
  image.dispatchEvent(new Event('load'))
  assert.deepEqual(await loaded, { width: 2912, height: 1632 })
})
void test('an actual load error identifies the specific asset, and cannot reject another image', async () => {
  const failed = new TestImage()
  const healthy = new TestImage()
  const results = Promise.allSettled([
    loadImage(failed, 'media/broken.jpg'),
    loadImage(healthy, 'media/good.jpg')
  ])
  failed.dispatchEvent(new Event('error'))
  healthy.naturalWidth = 1920
  healthy.naturalHeight = 1080
  healthy.dispatchEvent(new Event('load'))
  const [bad, good] = await results
  assert.equal(bad!.status, 'rejected')
  if (bad!.status === 'rejected')
    assert.match(String(bad!.reason), /media\/broken.jpg/)
  assert.equal(good!.status, 'fulfilled')
})

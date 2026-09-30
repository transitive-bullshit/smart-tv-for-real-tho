import assert from 'node:assert/strict'
import { test } from 'node:test'
import { localAccess } from '../src/local-access.js'

void test('Portless permits only the configured origin, including scheme and port', () => {
  for (const url of [
    'https://smart-tv-for-real-tho.localhost',
    'https://feature.smart-tv-for-real-tho.localhost:1355',
    'http://smart-tv-for-real-tho.localhost:1355'
  ]) {
    const access = localAccess(4321, url)
    assert.equal(access.url, url)
    assert.ok(access.hosts.has(new URL(url).host))
    assert.ok(access.origins.has(url))
    assert.ok(access.origins.has('http://127.0.0.1:4321'))
    assert.ok(access.origins.has('http://localhost:4321'))
    for (const unexpected of [
      'https://other.localhost',
      url + '.attacker.example',
      url + ':9999',
      'http://localhost:3210',
      'null',
      ''
    ])
      assert.equal(access.origins.has(unexpected), false)
    assert.equal(access.hosts.has('attacker.example'), false)
  }
})

void test('direct development does not trust arbitrary named hosts', () => {
  const access = localAccess(3210)
  assert.equal(access.url, 'http://localhost:3210')
  assert.deepEqual([...access.hosts], ['127.0.0.1:3210', 'localhost:3210'])
  assert.equal(
    access.origins.has('https://smart-tv-for-real-tho.localhost'),
    false
  )
})

void test('invalid proxy configuration fails instead of widening access', () => {
  for (const url of [
    'not a URL',
    'file:///tmp/test',
    'https://user:password@smart-tv-for-real-tho.localhost',
    'https://smart-tv-for-real-tho.localhost/path',
    'https://smart-tv-for-real-tho.localhost?query=1',
    'https://smart-tv-for-real-tho.localhost#hash'
  ])
    assert.throws(() => localAccess(4321, url))
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AmbientPlaylist } from '../tv/ambient-src/playlist.js'

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

void test('every shuffled round includes each image once and spaces repeats across boundaries', () => {
  for (const count of [1, 2, 3, 6, 15, 40]) {
    const scenes = Array.from({ length: count }, (_, index) => index)
    for (let seed = 1; seed <= 20; seed++) {
      const playlist = new AmbientPlaylist(scenes, seeded(seed))
      const recent: number[] = []
      let previousRound: number[] = []
      let changedOrder = false
      for (let round = 0; round < 30; round++) {
        const visited: number[] = []
        for (let step = 0; step < count; step++) {
          const current = playlist.current!
          const gap = Math.min(5, count - 1)
          if (gap > 0) assert.ok(!recent.slice(-gap).includes(current))
          visited.push(current)
          recent.push(current)
          const next = playlist.peek()
          const preloaded = playlist.upcoming(12)
          assert.equal(preloaded[0], current)
          assert.equal(preloaded[1], next)
          assert.equal(playlist.peek(), next, 'preloading must not reshuffle')
          playlist.move()
          assert.equal(playlist.current, next)
        }
        assert.deepEqual(
          [...visited].sort((a, b) => a - b),
          scenes
        )
        if (previousRound.length && visited.join() !== previousRound.join())
          changedOrder = true
        previousRound = visited
      }
      if (count > 6)
        assert.ok(changedOrder, 'later rounds should be reshuffled')
    }
  }
})

void test('Previous retraces the shuffled history, including a round boundary', () => {
  const playlist = new AmbientPlaylist([0, 1, 2, 3, 4, 5, 6], seeded(12))
  const visited = [playlist.current]
  for (let index = 0; index < 9; index++) {
    playlist.move()
    visited.push(playlist.current)
  }
  for (let index = 8; index >= 0; index--) {
    assert.equal(playlist.peek(-1), visited[index])
    playlist.move(-1)
    assert.equal(playlist.current, visited[index])
  }
  playlist.move(-1)
  assert.equal(playlist.current, visited[0])
  playlist.move()
  assert.equal(playlist.current, visited[1])
})

void test('manual selection starts a complete round; unavailable images are skipped', () => {
  const playlist = new AmbientPlaylist([0, 1, 2, 3, 4, 5], seeded(8))
  playlist.select(3)
  assert.equal(playlist.current, 3)
  const visited = []
  for (let index = 0; index < 6; index++) {
    visited.push(playlist.current)
    playlist.move()
  }
  assert.equal(new Set(visited).size, 6)
  const current = playlist.current
  const removed = (current! + 1) % 6
  playlist.remove(removed)
  assert.equal(playlist.current, current)
  for (let index = 0; index < 20; index++) {
    assert.notEqual(playlist.current, removed)
    playlist.move()
  }
  for (let index = 0; index < 6; index++) playlist.remove(index)
  assert.equal(playlist.current, undefined)
  assert.equal(playlist.peek(), undefined)
  playlist.move()
  assert.equal(playlist.current, undefined)
})

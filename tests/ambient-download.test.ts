import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { downloadImage } from '../tv/ambient-src/download-image.js'

void test('cancelling during a response body settles without retries or unhandled rejections', async (t) => {
  const controller = new AbortController()
  let requests = 0
  const server = createServer((_, res) => {
    requests++
    res.writeHead(200, { 'Content-Type': 'image/jpeg' })
    res.write('j')
    setTimeout(() => controller.abort(), 50)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const port = (server.address() as { port: number }).port
  await assert.rejects(
    downloadImage(
      { url: `http://127.0.0.1:${port}/`, bytes: 4, contentType: 'image/jpeg' },
      controller.signal
    ),
    /abort/i
  )
  assert.equal(requests, 1)
})

void test('remote downloads retry transient failures, bound permanent failures and reject oversized bodies', async (t) => {
  const requests = new Map<string, number>()
  const server = createServer((req, res) => {
    const path = req.url!
    const count = (requests.get(path) ?? 0) + 1
    requests.set(path, count)
    if (path === '/missing' || (path === '/retry' && count < 3)) {
      res.writeHead(503)
      res.end()
      return
    }
    res.writeHead(200, { 'Content-Type': 'image/jpeg' })
    res.end(path === '/large' ? 'too much' : 'jpeg')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const port = (server.address() as { port: number }).port
  const asset = (path: string) => ({
    url: `http://127.0.0.1:${port}${path}`,
    bytes: 4,
    contentType: 'image/jpeg'
  })
  const signal = new AbortController().signal
  const [ok] = await Promise.all([
    downloadImage(asset('/retry'), signal),
    assert.rejects(downloadImage(asset('/missing'), signal)),
    assert.rejects(downloadImage(asset('/large'), signal), /byte budget/)
  ])
  assert.equal(await ok.text(), 'jpeg')
  for (const path of ['/retry', '/missing', '/large'])
    assert.equal(requests.get(path), 3)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    downloadImage(asset('/cancelled'), controller.signal),
    /abort/i
  )
  assert.equal(requests.has('/cancelled'), false)
})

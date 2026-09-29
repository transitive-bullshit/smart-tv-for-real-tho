import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

const assets: Record<string, [string, string]> = {
  '/ambient/': ['index.html', 'text/html'],
  '/ambient/index.html': ['index.html', 'text/html'],
  '/ambient/assets/ambient.js': ['assets/ambient.js', 'text/javascript'],
  '/ambient/assets/ambient.css': ['assets/ambient.css', 'text/css'],
  '/ambient/media/starship.jpeg': ['media/starship.jpeg', 'image/jpeg'],
  '/ambient/media/ethereal-desk.jpg': ['media/ethereal-desk.jpg', 'image/jpeg'],
  '/ambient/media/ambient-loop.mp4': ['media/ambient-loop.mp4', 'video/mp4']
}
export function byteRange(header: string | undefined, size: number) {
  if (!header) return { start: 0, end: size - 1, partial: false }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return undefined
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]))
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= size
  )
    return undefined
  return { start, end, partial: true }
}
export async function serveAmbient(
  req: IncomingMessage,
  res: ServerResponse,
  path: string
) {
  if (path === '/ambient') {
    res.writeHead(302, { Location: '/ambient/' })
    res.end()
    return true
  }
  if (!path.startsWith('/ambient/')) return false
  const asset = assets[path]
  if (!asset || !['GET', 'HEAD'].includes(req.method ?? '')) {
    res.writeHead(404)
    res.end()
    return true
  }
  const [relative, type] = asset
  const file = 'tv/ambient/' + relative
  const info = await stat(file).catch(() => undefined)
  if (!info?.isFile()) {
    res.writeHead(404)
    res.end('Ambient asset missing. Build the ambient app and film.')
    return true
  }
  const range = byteRange(req.headers.range, info.size)
  if (!range) {
    res.writeHead(416, { 'Content-Range': 'bytes */' + info.size })
    res.end()
    return true
  }
  if (range.partial)
    res.setHeader(
      'Content-Range',
      `bytes ${range.start}-${range.end}/${info.size}`
    )
  res.writeHead(range.partial ? 206 : 200, {
    'Content-Type': type,
    'Content-Length': range.end - range.start + 1,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache'
  })
  if (req.method === 'HEAD') res.end()
  else {
    const stream = createReadStream(file, {
      start: range.start,
      end: range.end
    })
    stream.on('error', () => res.destroy())
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  }
  return true
}

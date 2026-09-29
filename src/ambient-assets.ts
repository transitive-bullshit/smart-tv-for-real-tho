import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

const assets: Record<string, [string, string]> = {
  '/ambient/': ['index.html', 'text/html'],
  '/ambient/index.html': ['index.html', 'text/html'],
  '/ambient/assets/ambient.js': ['assets/ambient.js', 'text/javascript'],
  '/ambient/assets/ambient.css': ['assets/ambient.css', 'text/css'],
  '/ambient/media/starship.jpeg': ['media/starship.jpeg', 'image/jpeg'],
  '/ambient/media/ethereal-desk.jpg': ['media/ethereal-desk.jpg', 'image/jpeg']
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
    res.end('Ambient asset missing. Build the ambient app.')
    return true
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': info.size,
    'Cache-Control': 'no-cache'
  })
  if (req.method === 'HEAD') res.end()
  else {
    const stream = createReadStream(file)
    stream.on('error', () => res.destroy())
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  }
  return true
}

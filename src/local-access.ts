import { z } from 'zod'

// Trust configured origins, never a request's forwarded headers or a wildcard.
export function localAccess(port: number, portlessUrl?: string) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`
  ])
  let url = `http://localhost:${port}`
  if (portlessUrl) {
    const parsed = new URL(z.url().parse(portlessUrl))
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    )
      throw new Error('PORTLESS_URL must be an HTTP(S) origin.')
    url = parsed.origin
    origins.add(url)
  }
  return {
    url,
    origins,
    hosts: new Set([...origins].map((origin) => new URL(origin).host)),
    hostnames: [...origins].map((origin) => new URL(origin).hostname)
  }
}

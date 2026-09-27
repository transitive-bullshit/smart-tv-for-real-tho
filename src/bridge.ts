import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'
import { z } from 'zod'
import type { Devices } from './contracts.js'

const replySchema = z.object({
  id: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional()
})
export class Bridge implements Devices {
  private readonly child = spawn(
    'uv',
    ['run', '--frozen', '--project', 'bridge', 'python', 'bridge/main.py'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    }
  )
  private readonly pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >()
  private stopped = false
  constructor() {
    const lines = createInterface({ input: this.child.stdout })
    lines.on('line', (line) => {
      const parsed = replySchema.safeParse(safeJson(line))
      if (!parsed.success) return
      const reply = parsed.data,
        waiter = this.pending.get(reply.id)
      if (!waiter) return
      this.pending.delete(reply.id)
      if (reply.error) waiter.reject(new Error(reply.error))
      else waiter.resolve(reply.result)
    })
    this.child.stderr.resume()
    this.child.on('error', () =>
      this.fail(
        'Device bridge unavailable. Install uv and run pnpm bridge:sync.'
      )
    )
    this.child.on('exit', () =>
      this.fail('Device bridge stopped. Restart the controller.')
    )
  }
  private fail(message: string) {
    this.stopped = true
    for (const waiter of this.pending.values())
      waiter.reject(new Error(message))
    this.pending.clear()
  }
  async request(
    method: string,
    params: Record<string, unknown> = {},
    signal?: AbortSignal
  ) {
    if (this.stopped)
      throw new Error('Device bridge stopped. Restart the controller.')
    signal?.throwIfAborted()
    const id = randomUUID()
    let cancelTimer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => {
      this.child.stdin.write(JSON.stringify({ cancel: id }) + '\n')
      // Keep the effect lane occupied until cancellation is acknowledged.
      cancelTimer ??= setTimeout(() => {
        this.close()
      }, 2000)
    }
    const deadline = setTimeout(cancel, 30000)
    try {
      return await new Promise<unknown>((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        signal?.addEventListener('abort', cancel, { once: true })
        this.child.stdin.write(JSON.stringify({ id, method, params }) + '\n')
      })
    } finally {
      clearTimeout(deadline)
      clearTimeout(cancelTimer)
      signal?.removeEventListener('abort', cancel)
    }
  }
  close() {
    this.child.kill()
    this.fail('Device bridge closed.')
  }
}
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

import {
  downloadImage,
  maxImageBytes,
  type RemoteImage
} from './download-image.js'

export const imageCacheLimits = {
  bytes: 32 * 1024 * 1024,
  entries: 16,
  concurrent: 2,
  ahead: 12
}
interface Entry {
  abort: AbortController
  promise: Promise<string>
  resolve: (url: string) => void
  reject: (error: unknown) => void
  url?: string
}
function deferred() {
  let resolve!: (url: string) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<string>((yes, no) => {
    resolve = yes
    reject = no
  })
  void promise.catch(() => {})
  return { promise, resolve, reject }
}
const idle = (callback: () => void) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, { timeout: 1000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(callback, 100)
  return () => clearTimeout(id)
}

// Compressed JPEG blobs are cached separately from PhotoPool's decoded images.
// Map insertion order is LRU. Reservations include in-flight response bodies.
export class ImageCache {
  private entries = new Map<number, Entry>()
  private pinned = new Set<number>()
  private wanted: number[] = []
  private excluded = new Set<number>()
  private waiting = new Map<number, ReturnType<typeof deferred>>()
  private active = 0
  private cancelIdle?: () => void
  constructor(
    private assets: readonly RemoteImage[],
    private failed: (index: number, error: unknown) => void,
    private load = downloadImage,
    private limits = imageCacheLimits,
    private scheduleIdle = idle
  ) {}

  get stats() {
    return {
      cached: [...this.entries.values()].filter((entry) => entry.url).length,
      bytes: [...this.entries.keys()].reduce(
        (sum, index) => sum + this.assets[index]!.bytes,
        0
      ),
      downloading: this.active
    }
  }

  plan(priority: number[], ahead: number[]) {
    this.pinned = new Set(priority.filter((index) => !this.excluded.has(index)))
    this.wanted = [...new Set([...this.pinned, ...ahead])].filter(
      (index) => !this.excluded.has(index)
    )
    for (const [index, entry] of this.entries)
      if (!entry.url && !this.wanted.includes(index)) this.release(index)
    for (const [index, waiting] of this.waiting)
      if (!this.wanted.includes(index)) {
        waiting.reject(new DOMException('Image released', 'AbortError'))
        this.waiting.delete(index)
      }
    for (const index of this.pinned) {
      const entry = this.entries.get(index)
      if (entry) {
        this.entries.delete(index)
        this.entries.set(index, entry)
      }
    }
    this.pump(false)
  }

  async get(index: number) {
    const entry = this.entries.get(index)
    if (entry) return entry.promise
    if (!this.wanted.includes(index) || this.excluded.has(index))
      throw new Error('Image was not scheduled: ' + index)
    let waiting = this.waiting.get(index)
    if (!waiting) {
      waiting = deferred()
      this.waiting.set(index, waiting)
    }
    return waiting.promise
  }

  exclude(index: number) {
    this.excluded.add(index)
    this.release(index)
    this.waiting.get(index)?.reject(new Error('Image unavailable: ' + index))
    this.waiting.delete(index)
  }

  clear() {
    this.cancelIdle?.()
    this.cancelIdle = undefined
    this.wanted = []
    this.pinned.clear()
    for (const index of this.entries.keys()) this.release(index)
    for (const waiting of this.waiting.values())
      waiting.reject(new DOMException('Cache cleared', 'AbortError'))
    this.waiting.clear()
  }

  private pump(background: boolean) {
    let full = false
    for (const index of this.wanted) {
      if (this.active >= this.limits.concurrent) break
      if (this.entries.has(index) || this.excluded.has(index)) continue
      if (
        !this.pinned.has(index) &&
        (!background ||
          [...this.pinned].some((item) => !this.entries.get(item)?.url))
      )
        continue
      if (
        this.assets[index]!.bytes > Math.min(maxImageBytes, this.limits.bytes)
      ) {
        this.exclude(index)
        this.failed(index, new Error('Image exceeds per-file cache limit'))
        continue
      }
      if (!this.makeRoom(index)) {
        full = true
        break
      }
      this.start(index)
    }
    if (
      !full &&
      !this.cancelIdle &&
      [...this.pinned].every((index) => this.entries.get(index)?.url) &&
      this.active < this.limits.concurrent &&
      this.wanted.some(
        (index) => !this.entries.has(index) && !this.excluded.has(index)
      )
    )
      this.cancelIdle = this.scheduleIdle(() => {
        this.cancelIdle = undefined
        this.pump(true)
      })
  }

  private makeRoom(index: number) {
    while (
      this.entries.size >= this.limits.entries ||
      this.stats.bytes + this.assets[index]!.bytes > this.limits.bytes
    ) {
      const candidate = [...this.entries].find(
        ([item, entry]) =>
          entry.url &&
          !this.pinned.has(item) &&
          (!this.wanted.includes(item) || this.pinned.has(index))
      )
      if (!candidate) return false
      this.release(candidate[0])
    }
    return true
  }

  private start(index: number) {
    const pending = this.waiting.get(index) ?? deferred()
    this.waiting.delete(index)
    const entry: Entry = { abort: new AbortController(), ...pending }
    this.entries.set(index, entry)
    // Idle prefetches may have no consumer yet; retain their rejection for get().
    void entry.promise.catch(() => {})
    this.active++
    void this.load(this.assets[index]!, entry.abort.signal)
      .then((blob) => {
        if (this.entries.get(index) !== entry) return
        entry.url = URL.createObjectURL(blob)
        entry.resolve(entry.url)
      })
      .catch((err: unknown) => {
        if (this.entries.get(index) !== entry) return
        this.exclude(index)
        entry.reject(err)
        this.failed(index, err)
      })
      .finally(() => {
        this.active--
        this.pump(false)
      })
  }

  private release(index: number) {
    const entry = this.entries.get(index)
    if (!entry) return
    this.entries.delete(index)
    entry.abort.abort()
    entry.reject(new DOMException('Image released', 'AbortError'))
    if (entry.url) URL.revokeObjectURL(entry.url)
  }
}

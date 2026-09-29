export interface RemoteImage {
  url: string
  bytes: number
  contentType: string
}
export const maxImageBytes = 8 * 1024 * 1024

// Bound both time and bytes, including a stalled response body. Retry the whole
// download, not just receipt of HTTP headers. Native fetch keeps stream
// cancellation under one owner; ky is used by the Node uploader. No credentials
// or cache-busters are sent by the TV.
export async function downloadImage(asset: RemoteImage, signal: AbortSignal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted()
    const controller = new AbortController()
    const cancel = () => controller.abort()
    signal.addEventListener('abort', cancel, { once: true })
    const timeout = setTimeout(cancel, 15000)
    try {
      const response = await fetch(asset.url, {
        signal: controller.signal,
        credentials: 'omit'
      })
      if (!response.ok) {
        void response.body?.cancel().catch(() => {})
        throw new Error('Image HTTP ' + response.status)
      }
      if (
        response.headers.get('content-type')?.split(';')[0] !==
        asset.contentType
      ) {
        void response.body?.cancel().catch(() => {})
        throw new Error('Unexpected image content type')
      }
      const reader = response.body!.getReader()
      // Cancellation rejects reader completion as well as an in-flight read.
      void reader.closed.catch(() => {})
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > Math.min(asset.bytes, maxImageBytes))
            throw new Error('Image exceeds its byte budget')
          chunks.push(value)
        }
      } finally {
        await reader.cancel().catch(() => {})
      }
      if (size !== asset.bytes) throw new Error('Incomplete image download')
      return new Blob(chunks, { type: asset.contentType })
    } catch (err) {
      signal.throwIfAborted()
      if (attempt === 2) throw err
    } finally {
      clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
    }
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        signal.removeEventListener('abort', stop)
        resolve()
      }
      const timer = setTimeout(finish, attempt === 0 ? 500 : 1500)
      const stop = () => {
        clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      signal.addEventListener('abort', stop, { once: true })
    })
  }
  throw new Error('Image download exhausted')
}

interface ImageSource extends EventTarget {
  src: string
  complete: boolean
  naturalWidth: number
  naturalHeight: number
}
// webOS can display an image even when its optional decode() promise rejects.
// Use the element's actual load result; keep decoding hints out of startup gating.
export function loadImage(
  image: ImageSource,
  source: string,
  signal?: AbortSignal
) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    function cleanup() {
      clearTimeout(timer)
      image.removeEventListener('load', loaded)
      image.removeEventListener('error', failed)
      signal?.removeEventListener('abort', cancelled)
    }
    function loaded() {
      cleanup()
      if (image.naturalWidth > 0 && image.naturalHeight > 0)
        resolve({ width: image.naturalWidth, height: image.naturalHeight })
      else
        reject(new Error('Image loaded without usable dimensions: ' + source))
    }
    function failed() {
      cleanup()
      reject(new Error('Image load failed: ' + source))
    }
    function cancelled() {
      cleanup()
      reject(new DOMException('Image load cancelled', 'AbortError'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Image load timed out: ' + source))
    }, 10000)
    image.addEventListener('load', loaded)
    image.addEventListener('error', failed)
    signal?.addEventListener('abort', cancelled, { once: true })
    if (signal?.aborted) {
      cancelled()
      return
    }
    image.src = source
    if (image.complete)
      queueMicrotask(() => {
        if (image.naturalWidth > 0) loaded()
      })
  })
}

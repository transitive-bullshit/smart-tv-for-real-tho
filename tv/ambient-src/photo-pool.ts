import { loadImage } from './load-image.js'
import { slides } from './model.js'

interface Photo {
  image: HTMLImageElement
  abort: AbortController
  ready: boolean
}

// Keep only the current scene, its successor, and any pending manual selection.
// Releasing src as well as the element lets webOS reclaim decoded image memory.
export class PhotoPool {
  private photos = new Map<number, Photo>()
  constructor(
    private container: HTMLElement,
    private loaded: (index: number) => void,
    private failed: (index: number, error: unknown) => void,
    private source: (index: number) => Promise<string> = (index) =>
      Promise.resolve(slides[index]!.url)
  ) {}

  get(index: number) {
    const photo = this.photos.get(index)
    return photo?.ready ? photo.image : undefined
  }

  retain(indices: number[]) {
    const wanted = new Set(indices)
    for (const [index, photo] of this.photos) {
      if (wanted.has(index)) continue
      this.photos.delete(index)
      this.release(photo)
    }
    for (const index of wanted) {
      if (this.photos.has(index)) continue
      const slide = slides[index]!
      const image = new Image()
      image.alt = slide.title
      image.hidden = true
      image.style.width = slide.width + 'px'
      image.style.height = slide.height + 'px'
      const photo = { image, abort: new AbortController(), ready: false }
      this.photos.set(index, photo)
      this.container.append(image)
      void this.source(index)
        .then((source) => loadImage(image, source, photo.abort.signal))
        .then(() => {
          if (this.photos.get(index) !== photo) return
          photo.ready = true
          this.loaded(index)
        })
        .catch((err: unknown) => {
          if (this.photos.get(index) !== photo) return
          this.photos.delete(index)
          this.release(photo)
          this.failed(index, err)
        })
    }
  }

  private release(photo: Photo) {
    photo.abort.abort()
    photo.image.removeAttribute('src')
    photo.image.remove()
  }
}

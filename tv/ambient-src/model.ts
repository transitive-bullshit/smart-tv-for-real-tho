export const slides = [
  {
    id: 'starship',
    title: 'Leaving Earth',
    file: 'starship.jpeg',
    width: 4096,
    height: 2304,
    x: 0.49,
    y: 0.45
  },
  {
    id: 'desk',
    title: 'A quiet place to think',
    file: 'ethereal-desk.jpg',
    width: 2912,
    height: 1632,
    x: 0.513,
    y: 0.855
  }
] as const
export const defaults = { seconds: 30, fade: 3, zoom: 0.08 }
export interface Frame {
  x: number
  y: number
  width: number
  height: number
}
export function coverFrame(
  iw: number,
  ih: number,
  vw: number,
  vh: number,
  focusX: number,
  focusY: number,
  zoom: number
): Frame {
  if (![iw, ih, vw, vh].every((n) => Number.isFinite(n) && n > 0))
    throw new Error('Image and viewport dimensions must be positive.')
  const clamp = (n: number, fallback: number, max: number) =>
    Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : fallback
  const scale = Math.max(vw / iw, vh / ih) * (1 + clamp(zoom, 0, 0.2))
  const width = iw * scale
  const height = ih * scale
  return {
    width,
    height,
    x: (vw - width) * clamp(focusX, 0.5, 1),
    y: (vh - height) * clamp(focusY, 0.5, 1)
  }
}
export const smooth = (t: number) => {
  const p = Math.max(0, Math.min(1, t))
  return p * p * (3 - 2 * p)
}

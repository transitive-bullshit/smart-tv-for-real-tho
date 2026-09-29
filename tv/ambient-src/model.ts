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
  },
  {
    id: 'mj-20bf130e-f871-48a7-b1d1-df57bbfb3858',
    title: 'An opening in the ordinary',
    file: 'mj-20bf130e-f871-48a7-b1d1-df57bbfb3858.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.9
  },
  {
    id: 'mj-237205a7-f3db-4ddd-a30b-d42d8b734a62',
    title: 'Where ideas bloom',
    file: 'mj-237205a7-f3db-4ddd-a30b-d42d8b734a62.jpg',
    width: 2912,
    height: 1632,
    x: 0.51,
    y: 0.88
  },
  {
    id: 'mj-3696293a-f400-4b7d-9f25-bd42af61f1fe',
    title: 'A city still becoming',
    file: 'mj-3696293a-f400-4b7d-9f25-bd42af61f1fe.jpg',
    width: 2912,
    height: 1632,
    x: 0.36,
    y: 0.74
  },
  {
    id: 'mj-3dd8c1a0-5137-4a27-9e47-09e5139673ad',
    title: 'The shape of possibility',
    file: 'mj-3dd8c1a0-5137-4a27-9e47-09e5139673ad.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.9
  },
  {
    id: 'mj-3fbeb5ba-74b0-4143-872c-d13800203e64',
    title: 'At the edge of morning',
    file: 'mj-3fbeb5ba-74b0-4143-872c-d13800203e64.jpg',
    width: 2912,
    height: 1632,
    x: 0.8,
    y: 0.86
  },
  {
    id: 'mj-5c23ae92-3ccf-43a9-a10a-4a1b2ff570c3',
    title: 'Room for the future',
    file: 'mj-5c23ae92-3ccf-43a9-a10a-4a1b2ff570c3.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.9
  },
  {
    id: 'mj-7ec768ed-3eff-4379-8b34-78da33516821',
    title: 'Beneath a quiet infinity',
    file: 'mj-7ec768ed-3eff-4379-8b34-78da33516821.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.87
  },
  {
    id: 'mj-8d202238-970b-422a-800d-a6d9a4807bf4',
    title: 'The world unfolding',
    file: 'mj-8d202238-970b-422a-800d-a6d9a4807bf4.jpg',
    width: 2912,
    height: 1632,
    x: 0.71,
    y: 0.88
  },
  {
    id: 'mj-a60c41cc-bc2d-4fb9-9344-07f8352df0f0',
    title: 'A small beginning',
    file: 'mj-a60c41cc-bc2d-4fb9-9344-07f8352df0f0.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.9
  },
  {
    id: 'mj-ad599d9c-939a-4dbe-8baa-dc9f16c2ceab',
    title: 'Soft architecture',
    file: 'mj-ad599d9c-939a-4dbe-8baa-dc9f16c2ceab.jpg',
    width: 2912,
    height: 1632,
    x: 0.51,
    y: 0.9
  },
  {
    id: 'mj-b2acab86-0ff0-42c8-a0b2-962bcabf411a',
    title: 'Between thought and sky',
    file: 'mj-b2acab86-0ff0-42c8-a0b2-962bcabf411a.jpg',
    width: 2912,
    height: 1632,
    x: 0.51,
    y: 0.91
  },
  {
    id: 'mj-bd9703a0-cac8-4996-b83d-425abc05f54f',
    title: 'The long view',
    file: 'mj-bd9703a0-cac8-4996-b83d-425abc05f54f.jpg',
    width: 2912,
    height: 1632,
    x: 0.5,
    y: 0.85
  },
  {
    id: 'mj-f3fe3a14-e090-42c0-9016-0dc01350aee3',
    title: 'Tomorrow through the window',
    file: 'mj-f3fe3a14-e090-42c0-9016-0dc01350aee3.jpg',
    width: 2912,
    height: 1632,
    x: 0.25,
    y: 0.79
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

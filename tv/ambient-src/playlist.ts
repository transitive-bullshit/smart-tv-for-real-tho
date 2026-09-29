// Build a whole shuffled round in advance so preloading and dissolves share one
// stable successor. Keep five intervening scenes between repeats at round seams.
function shuffledRound(
  scenes: readonly number[],
  history: readonly number[],
  random: () => number
) {
  const remaining = [...scenes]
  const order: number[] = []
  const gap = Math.min(5, scenes.length - 1)
  while (remaining.length) {
    const recent = gap > 0 ? [...history, ...order].slice(-gap) : []
    const choices = remaining.filter((scene) => !recent.includes(scene))
    const scene = choices[Math.floor(random() * choices.length)]!
    remaining.splice(remaining.indexOf(scene), 1)
    order.push(scene)
  }
  return order
}

export class AmbientPlaylist {
  private scenes: number[]
  private order: number[]
  private position = 0

  constructor(
    scenes: readonly number[],
    private random = Math.random
  ) {
    this.scenes = [...scenes]
    this.order = shuffledRound(this.scenes, [], random)
  }

  get current() {
    return this.order[this.position]
  }

  peek(direction: -1 | 1 = 1) {
    if (!this.scenes.length) return undefined
    if (direction === 1 && this.position + 1 === this.order.length)
      this.order.push(...shuffledRound(this.scenes, this.order, this.random))
    return this.order[Math.max(0, this.position + direction)]
  }

  move(direction: -1 | 1 = 1) {
    if (this.peek(direction) === undefined) return
    this.position = Math.max(0, this.position + direction)
    // Retain one full round of Back history without growing over a long session.
    if (this.position > this.scenes.length * 2) {
      this.order.splice(0, this.scenes.length)
      this.position -= this.scenes.length
    }
  }

  select(scene: number) {
    if (!this.scenes.includes(scene) || scene === this.current) return
    // Explicit selection starts a fresh round with that image first.
    this.order = [
      scene,
      ...shuffledRound(
        this.scenes.filter((item) => item !== scene),
        [],
        this.random
      )
    ]
    this.position = 0
  }

  remove(scene: number) {
    const current = this.current
    this.scenes = this.scenes.filter((item) => item !== scene)
    this.order = shuffledRound(this.scenes, [], this.random)
    this.position = 0
    if (current !== undefined && current !== scene) this.select(current)
  }
}

import { readFile } from 'node:fs/promises'
import { z } from 'zod'
const row = z.object({
  mode: z.string(),
  action: z.string(),
  phase: z.string(),
  elapsedMs: z.number()
})
let content = ''
try {
  content = await readFile('.local/trace.jsonl', 'utf8')
} catch {
  console.log('No local timing trace yet. Run the controller first.')
  process.exit(0)
}
const groups = new Map<string, number[]>()
for (const line of content.trim().split('\n')) {
  if (!line) continue
  const parsed = row.safeParse(JSON.parse(line))
  if (
    !parsed.success ||
    !['observed', 'failed', 'superseded'].includes(parsed.data.phase)
  )
    continue
  const t = parsed.data,
    key = [t.mode, t.action, t.phase].join(' / ')
  const values = groups.get(key) ?? []
  values.push(t.elapsedMs)
  groups.set(key, values)
}
for (const [group, values] of groups) {
  values.sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  const median =
    values.length % 2
      ? values[middle]!
      : (values[middle - 1]! + values[middle]!) / 2
  console.log(
    group +
      ': n=' +
      values.length +
      ', median=' +
      median +
      'ms, worst=' +
      values.at(-1) +
      'ms'
  )
}
console.log(
  'Software timings only. Add warm/cold labels and physical first-picture/audio observations from the runbook.'
)

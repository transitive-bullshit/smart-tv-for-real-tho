import { z } from 'zod'

export const orbPatterns = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'shaping'
] as const
export const assistantStates = [
  'idle',
  'listening',
  'working',
  'speaking',
  'success',
  'error'
] as const
export type AssistantState = (typeof assistantStates)[number]
export const styleNames = ['quiet', 'signal', 'ember', 'prism'] as const
export const visualOptionsSchema = z
  .object({
    style: z.enum(styleNames),
    pattern: z.enum(['auto', ...orbPatterns]),
    size: z.number().min(80).max(200),
    speed: z.number().min(0.2).max(2),
    dots: z.number().min(0.4).max(1.8),
    dotSize: z.number().min(0.6).max(1.8),
    glow: z.number().min(0).max(0.8),
    mapping: z
      .object({
        idle: z.enum(orbPatterns),
        listening: z.enum(orbPatterns),
        working: z.enum(orbPatterns),
        speaking: z.enum(orbPatterns),
        success: z.enum(orbPatterns),
        error: z.enum(orbPatterns)
      })
      .strict()
  })
  .strict()
export type VisualOptions = z.infer<typeof visualOptionsSchema>
export const defaultVisualOptions: VisualOptions = {
  style: 'signal',
  pattern: 'auto',
  size: 144,
  speed: 0.75,
  dots: 1,
  dotSize: 1.15,
  glow: 0.3,
  mapping: {
    idle: 'breathing',
    listening: 'listening',
    working: 'solving',
    speaking: 'composing',
    success: 'weaving',
    error: 'shaping'
  }
}
export const visualStyles = {
  quiet: {
    name: 'Quiet',
    description: 'Sparse · monochrome',
    color: '#e4ece9',
    beam: 'mono',
    dots: 0.65,
    speed: 0.7
  },
  signal: {
    name: 'Signal',
    description: 'Cyan · clear presence',
    color: '#80fff0',
    beam: 'ice',
    dots: 1,
    speed: 1
  },
  ember: {
    name: 'Ember',
    description: 'Warm · soft particles',
    color: '#ffbd84',
    beam: 'gold',
    dots: 0.85,
    speed: 0.8
  },
  prism: {
    name: 'Prism',
    description: 'Violet · richer motion',
    color: '#c5b5ff',
    beam: 'ocean',
    dots: 1.2,
    speed: 1.15
  }
} as const
export function resolveOrb(options: VisualOptions, visual: string) {
  const state = assistantStates.includes(visual as AssistantState)
    ? (visual as AssistantState)
    : 'idle'
  return options.pattern === 'auto' ? options.mapping[state] : options.pattern
}

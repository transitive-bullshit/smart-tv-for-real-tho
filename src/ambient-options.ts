import { z } from 'zod'
export const ambientCommandSchema = z
  .object({
    action: z.enum(['launch', 'close']),
    mode: z.enum(['images', 'video']).default('images'),
    guard: z.boolean().default(false)
  })
  .strict()
export type AmbientCommand = z.infer<typeof ambientCommandSchema>

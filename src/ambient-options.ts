import { z } from 'zod'
export const ambientCommandSchema = z
  .object({
    action: z.enum(['launch', 'close']),
    guard: z.boolean().optional()
  })
  .strict()
export type AmbientCommand = z.infer<typeof ambientCommandSchema>

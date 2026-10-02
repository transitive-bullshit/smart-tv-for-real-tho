import { z } from 'zod'

export const displayVersion = '0.0.5'
export const displayReportSchema = z
  .object({
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .max(20),
    frames: z.number().int().nonnegative(),
    fps: z.number().min(0).max(1000),
    paused: z.boolean(),
    hidden: z.boolean()
  })
  .strict()
export type DisplayReport = z.infer<typeof displayReportSchema>
export interface DisplayHealth {
  lastSeen: number | null
  reportedAt: number | null
  report: DisplayReport | null
}

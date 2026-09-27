import { z } from 'zod'

export const configSchema = z.object({
  mode: z.enum(['live', 'simulation']).default('live'),
  tvHost: z.union([z.ipv4(), z.literal('')]).default(''),
  youtubeAppId: z.string().max(200).default(''),
  xboxInputId: z.string().max(200).default(''),
  xboxInputAppId: z.string().max(200).default(''),
  consoleId: z.string().max(200).default(''),
  games: z.record(z.string().max(100), z.string().max(200)).default({}),
  region: z.union([z.string().regex(/^[A-Z]{2}$/), z.literal('')]).default(''),
  maxVolume: z.number().int().min(1).max(100).default(40),
  timeoutMs: z.number().int().min(100).max(60000).default(20000)
})
export type Config = z.infer<typeof configSchema>
const observation = { connected: z.boolean(), observedAt: z.number() }
export const stateSchema = z.object({
  tv: z.object({
    ...observation,
    appId: z.string().nullable(),
    volume: z.number().nullable(),
    soundOutput: z.string().nullable()
  }),
  youtube: z.object({
    ...observation,
    receiverId: z.string().nullable(),
    videoId: z.string().nullable(),
    playback: z.string()
  }),
  xbox: z.object({ ...observation, activeTitle: z.string().nullable() })
})
export type RoomState = z.infer<typeof stateSchema>
export const emptyState = (): RoomState => ({
  tv: {
    connected: false,
    observedAt: 0,
    appId: null,
    volume: null,
    soundOutput: null
  },
  youtube: {
    connected: false,
    observedAt: 0,
    receiverId: null,
    videoId: null,
    playback: 'unknown'
  },
  xbox: { connected: false, observedAt: 0, activeTitle: null }
})
export interface Devices {
  request(
    method: string,
    params?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<unknown>
  close(): void
}
export interface Video {
  videoId: string
  title: string
  channel: string
}
export interface Search {
  find(query: string, signal: AbortSignal): Promise<Video[]>
}
export interface Candidate extends Video {
  candidateId: string
  generation: number
}
export interface Trace {
  mode?: 'live' | 'simulation'
  at: number
  requestId: string
  action: string
  phase: string
  elapsedMs: number
  detail?: string
}
export interface Result {
  requestId: string
  outcome: 'accepted' | 'observed' | 'failed' | 'superseded'
  message: string
  data?: unknown
}
const text = z.string().trim().max(160)
export const argsSchemas = {
  get_room_state: z.object({}).strict(),
  start_game: z.object({ game_alias: text.min(1) }).strict(),
  set_room_volume: z
    .object({ level: z.number().int().min(0).max(100) })
    .strict(),
  change_room_volume: z
    .object({ delta: z.number().int().min(-20).max(20) })
    .strict(),
  show_home: z.object({ target: z.enum(['tv', 'xbox']) }).strict(),
  find_youtube_video: z
    .object({
      song: text.optional(),
      artist: text.optional(),
      version: text.optional()
    })
    .strict(),
  play_youtube_video: z
    .object({ candidate_id: z.string().min(1).max(100) })
    .strict(),
  control_video: z.object({ action: z.enum(['pause', 'resume']) }).strict(),
  return_to_xbox: z.object({}).strict()
}
export type ToolName = keyof typeof argsSchemas
export const toolNames = Object.keys(argsSchemas) as ToolName[]

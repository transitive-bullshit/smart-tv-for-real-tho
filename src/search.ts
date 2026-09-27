import ky from 'ky'
import { z } from 'zod'
import type { Search, Video } from './contracts.js'

const responseSchema = z.object({
  items: z.array(
    z.object({
      id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }),
      snippet: z.object({ title: z.string(), channelTitle: z.string() })
    })
  )
})
export class YouTubeSearch implements Search {
  private readonly cache = new Map<string, { at: number; videos: Video[] }>()
  constructor(
    private readonly key: () => string | undefined,
    private readonly region: () => string
  ) {}
  async find(query: string, signal: AbortSignal) {
    const cacheKey = this.region() + ':' + query
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.at < 300000) return cached.videos
    const key = this.key()
    if (!key)
      throw new Error(
        'Add a YouTube Data API key in setup to enable real search.'
      )
    const params: Record<string, string> = {
      key,
      q: query,
      type: 'video',
      part: 'snippet',
      maxResults: '5'
    }
    if (this.region()) params.regionCode = this.region()
    let raw: unknown
    try {
      raw = await ky
        .get('https://www.googleapis.com/youtube/v3/search', {
          searchParams: params,
          signal,
          retry: 0
        })
        .json()
    } catch {
      signal.throwIfAborted()
      throw new Error(
        'YouTube search unavailable. Check API access, quota and network; no video selected.'
      )
    }
    const videos = responseSchema.parse(raw).items.map((v) => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      channel: v.snippet.channelTitle
    }))
    if (!videos.length)
      throw new Error('No matching videos. Try a more specific song or artist.')
    if (this.cache.size >= 100) this.cache.clear()
    this.cache.set(cacheKey, { at: Date.now(), videos })
    return videos
  }
}

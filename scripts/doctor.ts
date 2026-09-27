import { access } from 'node:fs/promises'
import pMap from 'p-map'
import { readConfig, readLocal, secretsSchema } from '../src/storage.js'
const config = await readConfig()
const secrets = secretsSchema.parse((await readLocal('secrets.json')) ?? {})
const checks = await pMap(
  ['lg.json', 'youtube.json', 'xbox.json'],
  async (file) => {
    try {
      await access('.local/' + file)
      return file + ': saved (not yet proof of valid authorization)'
    } catch {
      return file + ': missing; connect in setup'
    }
  },
  { concurrency: 3 }
)
console.log('Mode:', config.mode)
console.log('TV IP:', config.tvHost || 'missing')
console.log(
  'Xbox HDMI:',
  config.xboxInputId || 'not discovered (user says HDMI 3)'
)
console.log(
  'OpenAI key:',
  secrets.openai || process.env.OPENAI_API_KEY ? 'present' : 'missing'
)
console.log(
  'YouTube key:',
  secrets.youtube || process.env.YOUTUBE_API_KEY ? 'present' : 'missing'
)
for (const check of checks) console.log(check)
console.log('Start: pnpm dev → http://localhost:3210. Keys are never printed.')

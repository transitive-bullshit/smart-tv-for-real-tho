import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { configSchema } from './contracts.js'
export const secretsSchema = z
  .object({
    openai: z.string().max(1024).optional(),
    youtube: z.string().max(512).optional()
  })
  .strict()
export async function readLocal(name: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile('.local/' + name, 'utf8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw err
  }
}
export async function writeLocal(name: string, data: unknown) {
  await mkdir('.local', { recursive: true, mode: 0o700 })
  const path = '.local/' + name
  await writeFile(path + '.tmp', JSON.stringify(data, null, 2) + '\n', {
    mode: 0o600
  })
  await chmod(path + '.tmp', 0o600)
  await rename(path + '.tmp', path)
}
export async function readConfig() {
  return configSchema.parse((await readLocal('config.json')) ?? {})
}

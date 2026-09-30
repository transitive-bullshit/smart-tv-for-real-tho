import { createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { S3Client } from '@aws-sdk/client-s3'
import ky from 'ky'
import pMap from 'p-map'
import { z } from 'zod'
import {
  immutableCache,
  publishAsset,
  storageConfig
} from './ambient-storage.js'

const inputSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      file: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1)
    })
  )
  .min(1)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    'Scene IDs must be unique'
  )

const input = process.argv[2]
if (!input) throw new Error('Usage: pnpm ambient:upload <local-import.json>')
const scenes = inputSchema.parse(JSON.parse(await readFile(input, 'utf8')))
const config = storageConfig()
const client = new S3Client(config.client)
try {
  const catalog = await pMap(
    scenes,
    async ({ file, ...scene }) => {
      const bytes = await readFile(file)
      const asset = await publishAsset(client, config, bytes)
      // Verify the actual public bytes before updating the committed catalog.
      const response = await ky.get(asset.url, {
        timeout: 30000,
        retry: 2,
        headers: { Origin: 'https://smart-tv-for-real-tho.localhost' }
      })
      const hash = createHash('sha256')
        .update(Buffer.from(await response.arrayBuffer()))
        .digest('hex')
      if (
        hash !== asset.sha256 ||
        response.headers.get('content-type') !== asset.contentType
      )
        throw new Error('Public image verification failed: ' + scene.id)
      if (
        response.headers.get('cache-control')?.replaceAll(' ', '') !==
        immutableCache
      )
        throw new Error('Missing immutable caching: ' + scene.id)
      if (response.headers.get('access-control-allow-origin') !== '*')
        throw new Error(
          'Public delivery must allow anonymous browser/TV GETs: ' + scene.id
        )
      const { uploaded, ...metadata } = asset
      console.log(
        `${uploaded ? 'Uploaded' : 'Verified existing'} ${scene.id} (${asset.bytes} bytes)`
      )
      return { ...scene, sourceFilename: basename(file), ...metadata }
    },
    { concurrency: 3 }
  )
  const destination = 'tv/ambient-src/catalog.json'
  await writeFile(destination + '.tmp', JSON.stringify(catalog, null, 2) + '\n')
  await rename(destination + '.tmp', destination)
  console.log(
    `Published and verified ${catalog.length} scenes; catalog updated.`
  )
} finally {
  client.destroy()
}

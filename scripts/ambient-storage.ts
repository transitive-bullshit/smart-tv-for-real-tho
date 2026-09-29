import { createHash } from 'node:crypto'
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { z } from 'zod'

// Same S3-compatible configuration and conditional immutable writes as
// Cultural Alignment's scripts/media-storage.ts. Credentials stay in Node.
export const immutableCache = 'public,max-age=31536000,immutable'
const secureUrl = z.url().refine((value) => {
  const url = new URL(value)
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  )
})
const environment = z.object({
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_API_ENDPOINT: secureUrl,
  S3_BUCKET_NAME: z.string().min(1),
  S3_REGION: z.string().default('auto'),
  S3_PUBLIC_URL: secureUrl.refine(
    (value) => !new URL(value).hostname.endsWith('.r2.cloudflarestorage.com')
  )
})

export function storageConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = environment.safeParse(env)
  if (!parsed.success)
    throw new Error(
      'Invalid storage configuration: ' +
        parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    )
  const config = parsed.data
  return {
    bucket: config.S3_BUCKET_NAME,
    publicBaseUrl: config.S3_PUBLIC_URL.replace(/\/+$/, ''),
    client: {
      region: config.S3_REGION,
      endpoint: config.S3_API_ENDPOINT,
      maxAttempts: 3,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY
      }
    }
  }
}

export function describeAsset(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
    throw new Error(
      'Ambient imports must be JPEG images; convert originals first.'
    )
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  return {
    sha256,
    key: `smart-tv/${sha256}.jpg`,
    bytes: bytes.length,
    contentType: 'image/jpeg' as const
  }
}

export async function publishAsset(
  client: S3Client,
  config: ReturnType<typeof storageConfig>,
  bytes: Uint8Array
) {
  const asset = describeAsset(bytes)
  const target = { Bucket: config.bucket, Key: asset.key }
  let uploaded = false
  try {
    await client.send(new HeadObjectCommand(target))
  } catch (err) {
    if (status(err) !== 404) throw err
    try {
      await client.send(
        new PutObjectCommand({
          ...target,
          Body: bytes,
          ContentType: asset.contentType,
          CacheControl: immutableCache,
          IfNoneMatch: '*',
          Metadata: { sha256: asset.sha256 }
        })
      )
      uploaded = true
    } catch (err) {
      if (status(err) !== 412) throw err
    }
  }
  return { ...asset, url: config.publicBaseUrl + '/' + asset.key, uploaded }
}

function status(err: unknown) {
  return (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
    ?.httpStatusCode
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  describeAsset,
  publishAsset,
  storageConfig,
  immutableCache
} from '../scripts/ambient-storage.js'

const env = {
  S3_ACCESS_KEY_ID: 'test-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
  S3_API_ENDPOINT: 'https://s3.example.com',
  S3_BUCKET_NAME: 'existing-bucket',
  S3_PUBLIC_URL: 'https://images.example.com/'
}
void test('content-addressed JPEG keys are deterministic and confined to smart-tv/', async () => {
  const bytes = new Uint8Array([255, 216, 255, 1, 2, 3])
  assert.deepEqual(describeAsset(bytes), describeAsset(bytes.slice()))
  assert.match(describeAsset(bytes).key, /^smart-tv\/[a-f0-9]{64}\.jpg$/)
  assert.throws(() => describeAsset(new Uint8Array([1, 2])))
  const commands: unknown[] = []
  const client = {
    async send(command: unknown) {
      commands.push(command)
      if (!(command instanceof PutObjectCommand))
        throw { $metadata: { httpStatusCode: 404 } }
    }
  } as unknown as S3Client
  const result = await publishAsset(client, storageConfig(env), bytes)
  assert.equal(result.uploaded, true)
  const put = commands[1] as PutObjectCommand
  assert.equal(put.input.IfNoneMatch, '*')
  assert.equal(put.input.CacheControl, immutableCache)
  assert.equal(put.input.Bucket, 'existing-bucket')
  assert.equal(put.input.ContentType, 'image/jpeg')
  assert.equal(result.url, 'https://images.example.com/' + result.key)
  const existing = await publishAsset(
    { send: async () => ({}) } as unknown as S3Client,
    storageConfig(env),
    bytes
  )
  assert.equal(existing.uploaded, false)
  assert.equal(existing.key, result.key)
})
void test('credential URLs and the authenticated R2 endpoint cannot become public image URLs', () => {
  for (const url of [
    'https://user:secret@example.com',
    'https://account.r2.cloudflarestorage.com',
    'https://example.com/?token=secret',
    'http://example.com'
  ])
    assert.throws(
      () => storageConfig({ ...env, S3_PUBLIC_URL: url }),
      /Invalid storage configuration: S3_PUBLIC_URL/
    )
})

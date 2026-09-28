import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { promisify } from 'node:util'
const exec = promisify(execFile)
const packagePath = 'build/tv/it.transitivebullsh.smarttv.display_0.0.3_all.ipk'
let installing: Promise<{ installed: boolean; version: string }> | undefined
// Fixed installed app/device/package only. No caller-supplied executable, path, or arguments.
export function installDisplay() {
  installing ??= (async () => {
    await access(packagePath).catch(() => {
      throw new Error(
        'Build the TV package first with pnpm tv:package-display.'
      )
    })
    try {
      await exec(
        'pnpm',
        ['tv:cli', 'ares-install', '--device', 'smart-tv', packagePath],
        { timeout: 45000, maxBuffer: 262144 }
      )
      return { installed: true, version: '0.0.3' }
    } catch (err) {
      const failure = err as {
        code?: string | number
        stderr?: string
        stdout?: string
      }
      const output = (failure.stderr ?? '') + (failure.stdout ?? '')
      const reason = /EHOSTUNREACH|ENETUNREACH/.test(output)
        ? 'TV network unreachable'
        : /Permission denied|All configured authentication methods failed/.test(
              output
            )
          ? 'Developer key rejected'
          : /ECONNREFUSED/.test(output)
            ? 'TV developer service refused connection'
            : /[Tt]imed? ?out|ETIMEDOUT/.test(output)
              ? 'TV developer connection timed out'
              : failure.code === 'ENOENT'
                ? 'pnpm unavailable in controller environment'
                : 'Developer installation failed'
      throw new Error(
        reason +
          '. ' +
          'TV installation unavailable. Check TV power, Developer Mode session, and the saved smart-tv device profile.'
      )
    }
  })().finally(() => {
    installing = undefined
  })
  return installing
}

export async function displayDeviceStatus() {
  try {
    const { stdout } = await exec(
      'pnpm',
      ['tv:cli', 'ares-device', '--system-info', '--device', 'smart-tv'],
      { timeout: 20000, maxBuffer: 262144 }
    )
    return {
      connected: true,
      model: stdout.match(/modelName\s*:\s*(\S+)/)?.[1] ?? 'LG TV'
    }
  } catch (err) {
    const failure = err as {
      code?: string | number
      stderr?: string
      stdout?: string
    }
    const output = (failure.stderr ?? '') + (failure.stdout ?? '')
    return {
      connected: false,
      diagnostic:
        output
          .split('\n')
          .find((line) => line.includes('ares-device ERR!'))
          ?.replace(
            /(?:token|password|passphrase)\s*[:=]\s*\S+/gi,
            '[redacted]'
          )
          .slice(0, 400) ?? 'Developer connection unavailable',
      code: failure.code ?? 'timeout',
      networkUnreachable: /EHOSTUNREACH|ENETUNREACH/.test(output),
      keyRejected: /Permission denied|authentication methods failed/.test(
        output
      ),
      connectionRefused: /ECONNREFUSED/.test(output),
      commandMissing: failure.code === 'ENOENT',
      profileMissing: /[Nn]ot found|[Nn]o such device|[Uu]nknown device/.test(
        output
      )
    }
  }
}

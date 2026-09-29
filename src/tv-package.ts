import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { promisify } from 'node:util'
const exec = promisify(execFile)
const packages = {
  display: { version: '0.0.4', command: 'tv:package-display' },
  ambient: { version: '0.0.3', command: 'tv:package-ambient' }
} as const
const installing = new Map<
  string,
  Promise<{ installed: boolean; version: string }>
>()
// Fixed installed app/device/package only. No caller-supplied executable, path, or arguments.
export const installDisplay = () => installPackage('display')
export const installAmbient = () => installPackage('ambient')
function installPackage(target: keyof typeof packages) {
  const existing = installing.get(target)
  if (existing) return existing
  const { version, command } = packages[target]
  const packagePath = `build/tv/it.transitivebullsh.smarttv.${target}_${version}_all.ipk`
  const pending = (async () => {
    await access(packagePath).catch(() => {
      throw new Error('Build the TV package first with pnpm ' + command + '.')
    })
    try {
      await exec(
        'pnpm',
        ['tv:cli', 'ares-install', '--device', 'smart-tv', packagePath],
        { timeout: target === 'ambient' ? 120000 : 45000, maxBuffer: 262144 }
      )
      return { installed: true, version }
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
    installing.delete(target)
  })
  installing.set(target, pending)
  return pending
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

// Remove only our superseded experiment; the live assistant and ambient app remain installed.
export async function uninstallOverlayProbe() {
  const id = 'it.transitivebullsh.smarttv.overlayprobe'
  try {
    await exec(
      'pnpm',
      ['tv:cli', 'ares-install', '--device', 'smart-tv', '--remove', id],
      { timeout: 45000, maxBuffer: 262144 }
    )
    return { removed: id }
  } catch {
    throw new Error(
      'Could not remove the old overlay probe. Check the Developer Mode connection.'
    )
  }
}

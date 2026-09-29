interface Bridge {
  onservicecallback: (response: string) => void
  call: (uri: string, params: string) => void
  cancel?: () => void
}
interface NativeWindow extends Window {
  PalmServiceBridge?: new () => Bridge
}
export type GuardEvent = 'status' | 'request' | 'acknowledged' | 'failure'

// Private, opt-in probe. Only active while this app is visible; never a global idle provider.
export function screenSaverGuard(
  report: (message: string, event?: GuardEvent) => void
): () => void {
  const NativeBridge = (window as NativeWindow).PalmServiceBridge
  if (!NativeBridge) {
    report('Unavailable here · no webOS service bridge', 'failure')
    return () => {}
  }
  const appId = 'it.transitivebullsh.smarttv.ambient'
  const held = new Set<Bridge>()
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let stopped = false
  let acknowledged = 0
  function cleanup() {
    stopped = true
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    for (const bridge of held) {
      try {
        bridge.cancel?.()
      } catch {
        /* bridge may already be disconnected */
      }
    }
    held.clear()
  }
  function fail(message: string) {
    report(message, 'failure')
    cleanup()
  }
  function call(
    method: string,
    params: Record<string, unknown>,
    subscription: boolean,
    receive: (data: Record<string, unknown>) => void,
    duplicate?: () => void
  ) {
    if (stopped) return
    let bridge: Bridge
    try {
      bridge = new NativeBridge!()
    } catch {
      fail('Guard unavailable · service bridge could not open')
      return
    }
    held.add(bridge)
    let done = false
    const timer = setTimeout(() => fail('Guard timed out · ' + method), 5000)
    timers.add(timer)
    bridge.onservicecallback = (raw) => {
      if (stopped || done) return
      clearTimeout(timer)
      timers.delete(timer)
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          fail('Guard response invalid · ' + method)
          return
        }
        const data = parsed as Record<string, unknown>
        if (String(data.errorCode) === '-3' && duplicate) {
          done = true
          held.delete(bridge)
          try {
            bridge.cancel?.()
          } catch {
            /* already disconnected */
          }
          report(
            'Registration already exists · retrying once with a fresh client'
          )
          duplicate()
          return
        }
        if (data.returnValue === false || data.errorCode) {
          fail(
            'Guard rejected · ' +
              (typeof data.errorText === 'string'
                ? data.errorText.slice(0, 200)
                : typeof data.errorCode === 'number'
                  ? String(data.errorCode)
                  : 'permission denied')
          )
          return
        }
        if (!subscription) {
          done = true
          held.delete(bridge)
          try {
            bridge.cancel?.()
          } catch {
            /* already disconnected */
          }
          if (data.returnValue !== true) {
            fail('Idle veto response did not confirm acceptance')
            return
          }
        }
        receive(data)
      } catch {
        fail('Guard response invalid · keep-awake unconfirmed')
      }
    }
    try {
      bridge.call(
        'luna://com.webos.service.tvpower/power/' + method,
        JSON.stringify(params)
      )
    } catch {
      fail('Guard unavailable · service call failed')
    }
  }
  report('Registering private guard…')
  function register(clientName: string, retry: boolean) {
    call(
      'registerScreenSaverRequest',
      { clientName, subscribe: true },
      true,
      (data) => {
        if (data.subscribed === false) {
          fail('Guard registration did not retain an idle subscription')
          return
        }
        if (data.timestamp == null) {
          report('Registration responded · waiting for an idle request')
          return
        }
        const timestamp = data.timestamp
        if (
          !(
            (typeof timestamp === 'number' && Number.isFinite(timestamp)) ||
            (typeof timestamp === 'string' && timestamp.length > 0)
          )
        ) {
          fail('Idle request has an invalid timestamp')
          return
        }
        report('Idle request received · ' + timestamp, 'request')
        call(
          'responseScreenSaverRequest',
          { clientName, timestamp, ack: false },
          false,
          () => {
            acknowledged++
            report(
              'Idle veto acknowledged × ' +
                acknowledged +
                ' · verify the screen stays visible',
              'acknowledged'
            )
          }
        )
      },
      retry ? () => register(appId + '.' + Date.now(), false) : undefined
    )
  }
  register(appId, true)
  return cleanup
}

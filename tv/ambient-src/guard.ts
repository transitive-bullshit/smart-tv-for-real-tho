interface Bridge {
  onservicecallback: (response: string) => void
  call: (uri: string, params: string) => void
  cancel?: () => void
}
interface NativeWindow extends Window {
  PalmServiceBridge?: new () => Bridge
}

// Private, opt-in probe. Only active while this app is visible; never a global idle provider.
export function screenSaverGuard(
  report: (message: string) => void
): () => void {
  const NativeBridge = (window as NativeWindow).PalmServiceBridge
  if (!NativeBridge) {
    report('Unavailable here · no webOS service bridge')
    return () => {}
  }
  const clientName = 'it.transitivebullsh.smarttv.ambient'
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
    report(message)
    cleanup()
  }
  function call(
    method: string,
    params: Record<string, unknown>,
    subscription: boolean,
    receive: (data: Record<string, unknown>) => void
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
    const timer = setTimeout(
      () => fail('Guard timed out · image keep-awake unconfirmed'),
      5000
    )
    timers.add(timer)
    bridge.onservicecallback = (raw) => {
      if (stopped) return
      clearTimeout(timer)
      timers.delete(timer)
      try {
        const data = JSON.parse(raw) as Record<string, unknown>
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
        if (!subscription) held.delete(bridge)
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
  call(
    'registerScreenSaverRequest',
    { clientName, subscribe: true },
    true,
    (data) => {
      if (data.timestamp === undefined) {
        report('Registration responded · waiting for an idle request')
        return
      }
      call(
        'responseScreenSaverRequest',
        { clientName, timestamp: data.timestamp, ack: false },
        false,
        () => {
          acknowledged++
          report(
            'Idle veto acknowledged × ' +
              acknowledged +
              ' · verify the screen stays visible'
          )
        }
      )
    }
  )
  return cleanup
}

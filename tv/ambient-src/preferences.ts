type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>
const guardKey = 'room-ambient.guard.v1'

export class AmbientPreferences {
  guard = false
  constructor(
    private readonly storage: () => PreferenceStorage,
    private readonly report: (message: string) => void
  ) {
    try {
      this.guard = storage().getItem(guardKey) === 'true'
    } catch {
      report('Saved guard setting unavailable · select it for this session')
    }
  }

  setGuard(enabled: boolean) {
    this.guard = enabled
    try {
      this.storage().setItem(guardKey, String(enabled))
      this.report('Guard preference saved · ' + (enabled ? 'on' : 'off'))
    } catch {
      this.report('Guard preference applies this session · storage unavailable')
    }
  }
}

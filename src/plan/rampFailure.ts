/**
 * Erkennt im Rampentest, dass eine Stufe nicht mehr geht: Die Leistung liegt eine Weile deutlich unter dem Ziel
 * (oder die Trittfrequenz bricht ein – im ERG-Modus hält der Trainer die Watt sonst noch kurz, bis man stehen bleibt).
 * Dann wird gefragt, ob der Test endet; tritt man wieder an, verschwindet die Frage. Ohne Antwort endet der Test
 * nach dem Countdown von selbst.
 *
 * Kurze Einbrüche (Schalten, Aufstehen, das Nachregeln am Anfang einer Stufe) beenden nichts.
 */

/** unter so viel des Ziels gilt eine Sekunde als "geht nicht mehr" */
export const LOW_SHARE = 0.85
/** darunter gilt die Trittfrequenz als eingebrochen */
export const MIN_CADENCE = 50
/** so lange am Stück zu wenig, dann wird gefragt */
export const STRUGGLE_SECONDS = 12
/** so lange wird gefragt, dann endet der Test */
export const COUNTDOWN_SECONDS = 10
/** am Anfang einer Stufe regelt der Trainer (oder man selbst) noch nach – da beginnt keine Schwäche */
export const STEP_GRACE_SECONDS = 5
/** nach "Weiterfahren" so lange nicht neu fragen */
export const DISMISS_SECONDS = 20

export type RampFailureInput = {
  /** Zeitpunkt in Millisekunden */
  now: number
  /** in einer Stufe der Rampe (nicht Aufwärmen, nicht Ausfahren) und der Player läuft */
  inRamp: boolean
  stepElapsed: number
  /** Ziel in Watt; null = kein Ziel (z. B. ohne FTP) */
  target: number | null
  power: number | null
  cadence: number | null
}

export type RampFailureState =
  { kind: 'ok' } | { kind: 'asking'; secondsLeft: number } | { kind: 'over' }

export class RampFailureWatch {
  private lowSince: number | null = null
  private askingSince: number | null = null
  private quietUntil = -Infinity

  update(input: RampFailureInput): RampFailureState {
    const { now, inRamp, stepElapsed, target, power, cadence } = input
    if (!inRamp || target === null || target <= 0 || power === null || now < this.quietUntil) {
      this.reset()
      return { kind: 'ok' }
    }
    const struggling = power < target * LOW_SHARE || (cadence !== null && cadence < MIN_CADENCE)
    if (!struggling) {
      this.reset()
      return { kind: 'ok' }
    }
    if (this.lowSince === null) {
      if (stepElapsed < STEP_GRACE_SECONDS) return { kind: 'ok' }
      this.lowSince = now
    }
    if (now - this.lowSince < STRUGGLE_SECONDS * 1000) {
      return { kind: 'ok' }
    }
    this.askingSince ??= now
    const secondsLeft = COUNTDOWN_SECONDS - (now - this.askingSince) / 1000
    return secondsLeft <= 0
      ? { kind: 'over' }
      : { kind: 'asking', secondsLeft: Math.ceil(secondsLeft) }
  }

  /** "Weiterfahren": eine Weile nicht fragen, danach braucht es wieder eine ganze Schwäche-Phase */
  dismiss(now: number) {
    this.reset()
    this.quietUntil = now + DISMISS_SECONDS * 1000
  }

  reset() {
    this.lowSince = null
    this.askingSince = null
  }
}

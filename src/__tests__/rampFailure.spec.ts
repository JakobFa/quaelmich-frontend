import { describe, expect, it } from 'vitest'

import {
  COUNTDOWN_SECONDS,
  DISMISS_SECONDS,
  RampFailureWatch,
  STRUGGLE_SECONDS,
  type RampFailureInput,
} from '../plan/rampFailure'

const base: Omit<RampFailureInput, 'now'> = {
  inRamp: true,
  stepElapsed: 30,
  target: 300,
  power: 300,
  cadence: 90,
}

/** Sekunden von from bis to (einschließlich) mit denselben Werten; Ergebnis der letzten */
function ride(
  watch: RampFailureWatch,
  from: number,
  to: number,
  values: Partial<RampFailureInput>,
) {
  let state = watch.update({ ...base, ...values, now: from * 1000 })
  for (let second = from + 1; second <= to; second++) {
    state = watch.update({ ...base, ...values, now: second * 1000 })
  }
  return state
}

describe('RampFailureWatch', () => {
  it('fragt erst nach einer ganzen Schwäche-Phase und beendet nach dem Countdown', () => {
    const watch = new RampFailureWatch()
    expect(ride(watch, 0, STRUGGLE_SECONDS - 1, { power: 200 })).toEqual({ kind: 'ok' })
    expect(ride(watch, STRUGGLE_SECONDS, STRUGGLE_SECONDS, { power: 200 })).toEqual({
      kind: 'asking',
      secondsLeft: COUNTDOWN_SECONDS,
    })
    const end = STRUGGLE_SECONDS + COUNTDOWN_SECONDS
    expect(ride(watch, STRUGGLE_SECONDS + 1, end - 1, { power: 200 })).toEqual({
      kind: 'asking',
      secondsLeft: 1,
    })
    expect(ride(watch, end, end, { power: 200 })).toEqual({ kind: 'over' })
  })

  it('kurze Einbrüche und knapp unter dem Ziel beenden nichts', () => {
    const watch = new RampFailureWatch()
    ride(watch, 0, 8, { power: 200 })
    ride(watch, 9, 9, { power: 300 })
    expect(ride(watch, 10, 18, { power: 200 })).toEqual({ kind: 'ok' })
    expect(ride(watch, 19, 60, { power: 270 })).toEqual({ kind: 'ok' }) // 90 % des Ziels
  })

  it('wieder antreten nimmt die Frage zurück', () => {
    const watch = new RampFailureWatch()
    expect(ride(watch, 0, STRUGGLE_SECONDS + 2, { power: 200 }).kind).toBe('asking')
    expect(ride(watch, STRUGGLE_SECONDS + 3, STRUGGLE_SECONDS + 3, { power: 300 })).toEqual({
      kind: 'ok',
    })
  })

  it('eingebrochene Trittfrequenz zählt auch, wenn ERG die Watt noch hält', () => {
    const watch = new RampFailureWatch()
    expect(ride(watch, 0, STRUGGLE_SECONDS, { cadence: 40 }).kind).toBe('asking')
  })

  it('am Anfang einer Stufe beginnt keine Schwäche', () => {
    const watch = new RampFailureWatch()
    expect(ride(watch, 0, 30, { power: 200, stepElapsed: 2 })).toEqual({ kind: 'ok' })
  })

  it('außerhalb der Rampe, ohne Ziel oder ohne Watt wird nie gefragt', () => {
    expect(ride(new RampFailureWatch(), 0, 60, { power: 100, inRamp: false })).toEqual({
      kind: 'ok',
    })
    expect(ride(new RampFailureWatch(), 0, 60, { power: 100, target: null })).toEqual({
      kind: 'ok',
    })
    expect(ride(new RampFailureWatch(), 0, 60, { power: null })).toEqual({ kind: 'ok' })
  })

  it('nach "Weiterfahren" eine Weile Ruhe, danach wieder eine ganze Schwäche-Phase', () => {
    const watch = new RampFailureWatch()
    ride(watch, 0, STRUGGLE_SECONDS, { power: 200 })
    watch.dismiss(STRUGGLE_SECONDS * 1000)
    const quietEnd = STRUGGLE_SECONDS + DISMISS_SECONDS
    expect(ride(watch, STRUGGLE_SECONDS + 1, quietEnd - 1, { power: 200 })).toEqual({ kind: 'ok' })
    expect(ride(watch, quietEnd, quietEnd + STRUGGLE_SECONDS - 1, { power: 200 })).toEqual({
      kind: 'ok',
    })
    expect(
      ride(watch, quietEnd + STRUGGLE_SECONDS, quietEnd + STRUGGLE_SECONDS, { power: 200 }).kind,
    ).toBe('asking')
  })
})

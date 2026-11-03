import { describe, expect, it } from 'vitest'

import { RAMP_TEST_DONE, rampTestCheer } from '../plan/cheer'
import { positionAt } from '../plan/player'
import type { WorkoutStep } from '../types/workout'

/** Wie der echte Rampentest: 8 Minuten Einrollen, dann jede Minute ein Stück mehr, am Ende Ausrollen */
function rampTest(): WorkoutStep[] {
  const steps: WorkoutStep[] = [
    { kind: 'WARMUP', durationSeconds: 480, powerStartPercent: 45, powerEndPercent: 60 },
  ]
  for (let percent = 60; percent <= 150; percent += 6) {
    steps.push({ kind: 'INTERVAL', durationSeconds: 60, powerStartPercent: percent, powerEndPercent: percent })
  }
  steps.push({ kind: 'COOLDOWN', durationSeconds: 300, powerStartPercent: 60, powerEndPercent: 45 })
  return steps
}

function cheerAt(elapsed: number, options: { running?: boolean; verdict?: '' | 'low' | 'high' | 'ok' } = {}) {
  const steps = rampTest()
  return rampTestCheer({
    steps,
    position: positionAt(steps, elapsed),
    elapsed,
    running: options.running ?? true,
    verdict: options.verdict ?? '',
  })
}

describe('Anfeuerung im Rampentest', () => {
  it('sagt vor dem Start und in der Pause etwas Passendes', () => {
    expect(cheerAt(0, { running: false })).toContain('Gleich geht')
    expect(cheerAt(200, { running: false })).toContain('Pause')
  })

  it('warnt kurz vor dem Ende des Einrollens, dass es ernst wird', () => {
    expect(cheerAt(100)).toContain('einrollen'.slice(0, 5).toLowerCase() === 'einro' ? 'Locker' : '')
    expect(cheerAt(470)).toContain('Gleich wird')
  })

  it('wird mit der Höhe der Stufe fordernder', () => {
    const early = cheerAt(480 + 60 * 1 + 30) // ca. 66 %
    const late = cheerAt(480 + 60 * 13 + 30) // ca. 138 %
    expect(early).not.toBe(late)
    expect(late).toMatch(/Moment|Wille|Wahnsinn/)
  })

  it('zählt die letzten Sekunden jeder Stufe an', () => {
    expect(cheerAt(480 + 60 * 5 + 52)).toMatch(/10 Sekunden|geschafft|Minute gehört/)
  })

  it('begrüßt jede neue Stufe, aber nicht die erste', () => {
    expect(cheerAt(480 + 60 * 3 + 2)).toMatch(/Stufe|Weiter/)
    expect(cheerAt(480 + 2)).not.toMatch(/Neue Stufe/)
  })

  it('reagiert auf zu wenig und zu viel Watt, aber erst nach ein paar Sekunden', () => {
    expect(cheerAt(480 + 60 * 4 + 25, { verdict: 'low' })).toContain('Druck')
    expect(cheerAt(480 + 60 * 4 + 25, { verdict: 'high' })).toContain('Nicht übertreiben')
    expect(cheerAt(480 + 60 * 4 + 8, { verdict: 'low' })).not.toContain('Druck')
  })

  it('lobt beim Ausrollen und am Ende', () => {
    const steps = rampTest()
    const total = steps.reduce((sum, step) => sum + step.durationSeconds, 0)
    expect(cheerAt(total - 100)).toContain('Geschafft')
    expect(
      rampTestCheer({ steps, position: positionAt(steps, total), elapsed: total, running: true, verdict: '' }),
    ).toBe(RAMP_TEST_DONE)
  })

  it('ist an derselben Stelle immer gleich und wechselt zwischen Stufen', () => {
    expect(cheerAt(480 + 60 * 7 + 30)).toBe(cheerAt(480 + 60 * 7 + 30))
    const texts = new Set([8, 9, 10, 11].map((minute) => cheerAt(480 + 60 * minute + 30)))
    expect(texts.size).toBeGreaterThan(1)
  })
})

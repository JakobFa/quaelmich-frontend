import { describe, expect, it } from 'vitest'

import { ftpOf, targetSegments, targetSummary } from '../plan/rideTargets'
import type { IntervalAccuracy } from '../types/plan'
import type { WorkoutStep } from '../types/workout'

const step = (kind: WorkoutStep['kind'], minutes: number, start: number, end = start): WorkoutStep => ({
  kind,
  durationSeconds: minutes * 60,
  powerStartPercent: start,
  powerEndPercent: end,
})

/** 10 min Einrollen 50→65 %, 2 × 5 min bei 100 % mit 5 min Pause bei 50 %, 10 min Ausrollen bei 50 % */
const steps = [
  step('WARMUP', 10, 50, 65),
  step('INTERVAL', 5, 100),
  step('RECOVERY', 5, 50),
  step('INTERVAL', 5, 100),
  step('COOLDOWN', 10, 50),
]

/** FTP 300: Ziel 300 W, ±5 % → 285–315 */
function accuracy(starts: [number, number], trace: (number | null)[] = []): IntervalAccuracy {
  const block = (number: number, startSecond: number) => ({
    number,
    startSecond,
    durationSeconds: 300,
    targetLow: 285,
    targetHigh: 315,
    actual: 300,
    verdict: 'ON_TARGET' as const,
    score: 100,
  })
  return {
    basis: 'POWER',
    score: 100,
    onTarget: 2,
    uncertain: false,
    tip: null,
    blocks: [block(1, starts[0]), block(2, starts[1])],
    trace,
  }
}

/** Kurve: so viele Minuten mit diesen Watt */
function ride(...parts: [minutes: number, watts: number | null][]): (number | null)[] {
  return parts.flatMap(([minutes, watts]) => Array<number | null>(minutes * 6).fill(watts))
}

describe('Soll über die ganze Fahrt', () => {
  it('rechnet die FTP aus den Zielen der gefundenen Intervalle zurück', () => {
    expect(ftpOf(steps, accuracy([600, 1200]))).toBeCloseTo(300, 0)
  })

  it('legt die Abschnitte um die gefundenen Intervalle, auch mit Anfahrt und längerer Pause', () => {
    // 20 min Anfahrt statt 10 min Einrollen, Pause 8 statt 5 min
    const segments = targetSegments(steps, accuracy([1200, 1980]), 3000)

    expect(segments.map((s) => [s.kind, s.start, s.end])).toEqual([
      ['WARMUP', 600, 1200],
      ['INTERVAL', 1200, 1500],
      ['RECOVERY', 1500, 1980],
      ['INTERVAL', 1980, 2280],
      ['COOLDOWN', 2280, 2880],
    ])
    expect(segments[0]).toMatchObject({ lowStart: 132, highStart: 168, lowEnd: 172, highEnd: 218 })
    expect(segments[1]).toMatchObject({ lowStart: 285, highStart: 315 })
  })

  it('schneidet ein Einrollen ab, das vor dem Start der Fahrt läge, mit dem Ziel am Rand', () => {
    const segments = targetSegments(steps, accuracy([300, 900]), 2400)

    expect(segments[0]).toMatchObject({ kind: 'WARMUP', start: 0, end: 300 })
    // die Hälfte der Rampe ist weg: Ziel beginnt bei 57,5 % statt 50 %
    expect(segments[0]!.lowStart).toBe(Math.round(300 * 0.575 * 0.88))
  })

  it('Vollgas-Intervalle sind nach oben offen', () => {
    const allOut = [step('INTERVAL', 1, 150), step('RECOVERY', 4, 50), step('INTERVAL', 1, 150)]
    const found = accuracy([0, 300])
    found.blocks.forEach((block) => {
      block.targetLow = 428 // 150 % von 300 W, −5 %
      block.durationSeconds = 60
    })
    const segments = targetSegments(allOut, found, 600)

    expect(segments[0]!.highStart).toBeNull()
    expect(segments[1]!.highStart).not.toBeNull()
  })

  it('nach Puls gibt es keine Ziele für die lockeren Abschnitte', () => {
    expect(targetSegments(steps, { ...accuracy([600, 1200]), basis: 'HEART_RATE' }, 2400)).toEqual([])
  })

  it('zählt die ganze Einheit; in Pause und Ausrollen ist lockerer richtig', () => {
    const trace = ride([5, 155], [5, 190], [5, 300], [5, 100], [5, 360], [10, 90], [5, 200])
    const segments = targetSegments(steps, accuracy([600, 1200]), trace.length * 10)

    const summary = targetSummary(segments, trace)!
    // 35 min mit Ziel (die 5 min danach zählen nicht); nur das zweite Intervall ist zu hart
    expect(summary.seconds).toBe(35 * 60)
    expect(summary.percentAbove).toBe(Math.round((100 * 5) / 35))
    expect(summary.percentBelow).toBe(0)
  })

  it('zu locker bei Einrollen oder Intervall zählt als darunter, Stillstand gar nicht', () => {
    const trace = ride([10, 100], [5, 300], [5, null], [5, 200], [10, 150])
    const summary = targetSummary(targetSegments(steps, accuracy([600, 1200]), 2100), trace)!

    expect(summary.seconds).toBe(30 * 60)
    expect(summary.percentBelow).toBe(Math.round((100 * 15) / 30))
  })
})

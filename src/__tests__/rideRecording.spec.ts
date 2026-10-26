import { describe, expect, it } from 'vitest'

import { normalizedPower, RideRecorder, summarize } from '../trainer/recording'

const START = Date.parse('2026-10-26T17:00:00Z')
const values = (
  power: number | null,
  cadence: number | null = 90,
  heartRate: number | null = null,
) => ({
  power,
  cadence,
  heartRate,
})

describe('Aufzeichnung einer Fahrt', () => {
  it('schreibt höchstens einen Punkt je Sekunde, gezählt ab dem ersten Messwert', () => {
    const recorder = new RideRecorder()

    recorder.record(START, values(200))
    recorder.record(START + 200, values(205))
    recorder.record(START + 1100, values(210))

    expect(recorder.samples).toEqual([
      { second: 0, power: 200, cadence: 90, heartRate: null },
      { second: 1, power: 210, cadence: 90, heartRate: null },
    ])
    expect(recorder.toJSON()?.startedAt).toBe('2026-10-26T17:00:00.000Z')
  })

  it('lässt Pausen als Lücke stehen und speichert nichts ohne Messwerte', () => {
    const recorder = new RideRecorder()
    recorder.record(START, values(200))
    recorder.record(START + 1000, values(null, null, null))
    recorder.record(START + 60_000, values(180))

    expect(recorder.samples.map((s) => s.second)).toEqual([0, 60])
  })

  it('macht nach dem Neuladen mit der gespeicherten Aufzeichnung weiter', () => {
    const first = new RideRecorder()
    first.record(START, values(200))

    const again = new RideRecorder(first.toJSON())
    again.record(START + 5000, values(220))

    expect(again.samples.map((s) => s.second)).toEqual([0, 5])
  })

  it('fasst die Fahrt zusammen', () => {
    const recorder = new RideRecorder()
    for (let s = 0; s < 600; s++)
      recorder.record(START + s * 1000, values(s < 300 ? 150 : 250, 90, 140))

    expect(summarize(recorder.samples)).toEqual({
      seconds: 600,
      avgPower: 200,
      normalizedPower: expect.any(Number),
      avgCadence: 90,
      avgHeartRate: 140,
    })
    expect(summarize(recorder.samples).normalizedPower).toBeGreaterThan(200)
  })

  it('rechnet NP wie das Backend', () => {
    expect(normalizedPower(Array(60).fill(200))).toBe(200)
    expect(normalizedPower(Array(20).fill(200))).toBe(null)
  })
})

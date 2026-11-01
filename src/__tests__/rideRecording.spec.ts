import { describe, expect, it } from 'vitest'

import { normalizedPower, RideRecorder, summarize } from '../trainer/recording'

const START = Date.parse('2026-10-26T17:00:00Z')
const values = (
  power: number | null,
  cadence: number | null = 90,
  heartRate: number | null = null,
  speed: number | null = null,
) => ({
  speed,
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
      { second: 0, speed: null, power: 200, cadence: 90, heartRate: null },
      { second: 1, speed: null, power: 210, cadence: 90, heartRate: null },
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
      distanceKm: null,
    })
    expect(summarize(recorder.samples).normalizedPower).toBeGreaterThan(200)
  })

  it('schreibt die Geschwindigkeit des Trainers mit und rechnet daraus die Strecke', () => {
    const recorder = new RideRecorder()
    // 36 km/h = 10 m/s, 10 Minuten lang = 6 km
    for (let s = 0; s < 600; s++) recorder.record(START + s * 1000, values(200, 90, 140, 36))

    expect(recorder.samples[0]!.speed).toBe(36)
    expect(summarize(recorder.samples).distanceKm).toBeCloseTo(6, 5)
  })

  it('kommt mit älteren Aufzeichnungen ohne Geschwindigkeit zurecht', () => {
    const old = [{ second: 0, power: 200, cadence: 90, heartRate: 140 }]

    expect(summarize(old).distanceKm).toBe(null)
  })

  it('rechnet NP wie das Backend', () => {
    expect(normalizedPower(Array(60).fill(200))).toBe(200)
    expect(normalizedPower(Array(20).fill(200))).toBe(null)
  })
})

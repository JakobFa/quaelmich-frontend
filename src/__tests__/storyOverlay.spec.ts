import { describe, expect, it, vi } from 'vitest'

import {
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
  drawOverlay,
  eventFooter,
  extraRideOverlay,
  overlayDate,
  overlayFilename,
  plannedOverlay,
  rideChart,
} from '../plan/storyOverlay'
import type { ExtraRide, IntervalAccuracy, PlannedWorkout, SteadyHold } from '../types/plan'
import type { WorkoutStep } from '../types/workout'

function planned(actual: PlannedWorkout['actual']): PlannedWorkout {
  return {
    id: 1,
    date: '2026-11-02',
    phase: 'BASE',
    completed: true,
    rating: null,
    actual,
    adjustment: null,
    workout: {
      id: 2,
      title: 'Grundlage 4:30 h',
      type: 'ENDURANCE',
      description: '',
      steps: [],
      durationInMinutes: 270,
      tss: 204,
    },
  }
}

describe('Story-Overlay', () => {
  it('nimmt Dauer, Distanz und TSS der gefahrenen Einheit', () => {
    const data = plannedOverlay(
      planned({ durationMinutes: 196, distanceKm: 75.6, tss: 118, tssFromHeartRate: true } as never),
    )
    expect(data?.title).toBe('Grundlage 4:30 h')
    expect(data?.date).toBe('2. NOV 2026')
    expect(data?.stats).toEqual([
      { label: 'Dauer', value: '3:16 h' },
      { label: 'Distanz', value: '75,6 km' },
      { label: 'TSS', value: '≈118' },
    ])
  })

  it('nimmt die Abschnitte des Trainings für das Profil mit', () => {
    const withSteps = planned({ durationMinutes: 72, distanceKm: null, tss: 61 } as never)
    withSteps.workout.steps = [
      { kind: 'WARMUP', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 75 },
      { kind: 'INTERVAL', durationSeconds: 600, powerStartPercent: 83, powerEndPercent: 83 },
    ]
    expect(plannedOverlay(withSteps)?.steps).toHaveLength(2)
    withSteps.workout.steps = []
    expect(plannedOverlay(withSteps)?.steps).toBeUndefined()
  })

  it('zeichnet jeden Abschnitt als Balken', () => {
    const fills: unknown[] = []
    const ctx = new Proxy(
      { measureText: (text: string) => ({ width: text.length * 10 }), fill: () => fills.push(1) } as Record<string, unknown>,
      { get: (target, key: string) => target[key] ?? (() => undefined), set: () => true },
    ) as unknown as CanvasRenderingContext2D
    drawOverlay(ctx, {
      title: 'Tempo',
      date: '3. NOV 2026',
      stats: [{ label: 'TSS', value: '63' }],
      steps: [
        { kind: 'WARMUP', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 75 },
        { kind: 'INTERVAL', durationSeconds: 600, powerStartPercent: 83, powerEndPercent: 83 },
        { kind: 'RECOVERY', durationSeconds: 180, powerStartPercent: 55, powerEndPercent: 55 },
      ],
    })
    // eine Karte plus drei Balken
    expect(fills).toHaveLength(4)
  })

  it('gibt es nur für gefahrene Einheiten mit Zahlen', () => {
    expect(plannedOverlay(planned(null))).toBeNull()
    expect(plannedOverlay(planned({ durationMinutes: null, distanceKm: null, tss: null } as never))).toBeNull()
  })

  it('funktioniert für Zusatzfahrten und andere Sportarten', () => {
    const ride: ExtraRide = {
      id: 3,
      date: '2026-11-01',
      durationMinutes: 45,
      distanceKm: null,
      tss: 30,
      assessment: null,
      sport: 'RUN',
      tssFromDuration: true,
    }
    const data = extraRideOverlay(ride)
    expect(data?.title).toBe('Laufen')
    expect(data?.stats).toEqual([
      { label: 'Dauer', value: '45 min' },
      { label: 'TSS', value: '≈30' },
    ])
  })

  it('zählt die Tage bis zum Event', () => {
    expect(eventFooter('Rund um Sachsen', '2027-05-14', '2027-05-04')).toBe('10 Tage bis Rund um Sachsen')
    expect(eventFooter('Rund um Sachsen', '2027-05-14', '2027-05-13')).toBe('1 Tag bis Rund um Sachsen')
    expect(eventFooter('Rund um Sachsen', '2027-05-14', '2027-05-14')).toBe('Heute: Rund um Sachsen')
    expect(eventFooter('Rund um Sachsen', '2027-05-14', '2027-05-15')).toBeUndefined()
    expect(eventFooter(undefined, undefined, '2027-05-15')).toBeUndefined()
  })

  it('formatiert Datum und Dateiname', () => {
    expect(overlayDate('2026-12-24')).toBe('24. DEZ 2026')
    expect(
      overlayFilename({ title: 'Lange Ausfahrt 4:30 h', date: '', stats: [] }),
    ).toBe('quaelmich-lange-ausfahrt-4-30-h.png')
  })

  it('zeichnet auf eine durchsichtige Leinwand und schreibt alle Zahlen', () => {
    const texts: string[] = []
    const ctx = new Proxy(
      {
        measureText: (text: string) => ({ width: text.length * 10 }),
        fillText: (text: string) => texts.push(text),
        clearRect: vi.fn<() => void>(),
      } as Record<string, unknown>,
      {
        get: (target, key: string) => target[key] ?? (() => undefined),
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D

    drawOverlay(ctx, {
      title: 'Tempo 4 × 10',
      date: '3. NOV 2026',
      stats: [
        { label: 'Dauer', value: '1:12 h' },
        { label: 'TSS', value: '63' },
      ],
      footer: '192 Tage bis Rund um Sachsen',
    })

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT)
    expect(texts).toEqual(
      expect.arrayContaining(['3. NOV 2026', 'TEMPO 4 × 10', 'DAUER', '1:12 h', 'TSS', '63', 'QUAELMICH']),
    )
  })
})

describe('Story-Overlay: Soll & Ist', () => {
  const steps: WorkoutStep[] = [
    { kind: 'WARMUP', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 65 },
    { kind: 'INTERVAL', durationSeconds: 300, powerStartPercent: 100, powerEndPercent: 100 },
    { kind: 'COOLDOWN', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 50 },
  ]
  const accuracy: IntervalAccuracy = {
    basis: 'POWER',
    score: 100,
    onTarget: 1,
    uncertain: false,
    tip: null,
    blocks: [
      {
        number: 1,
        startSecond: 600,
        durationSeconds: 300,
        targetLow: 285,
        targetHigh: 315,
        actual: 300,
        verdict: 'ON_TARGET',
        score: 100,
      },
    ],
    trace: Array<number>(150).fill(200),
  }

  it('nimmt bei Intervallen alle Abschnitte mit, an ihrem Platz in der Fahrt', () => {
    const chart = rideChart(steps, { accuracy })!

    expect(chart.unit).toBe('W')
    expect(chart.bands.map((band) => [band.start, band.end])).toEqual([
      [0, 600],
      [600, 900],
      [900, 1500],
    ])
  })

  it('nimmt bei lockeren Fahrten den Zielbereich über die ganze Fahrt', () => {
    const hold: SteadyHold = {
      basis: 'POWER',
      targetLow: 180,
      targetHigh: 230,
      average: 200,
      percentBelow: 0,
      percentInZone: 100,
      percentAbove: 0,
      hold: 'STEADY',
      tip: '',
      trace: Array<number>(360).fill(200),
    }
    const chart = rideChart([{ kind: 'STEADY', durationSeconds: 3600, powerStartPercent: 68, powerEndPercent: 68 }], {
      hold,
    })!

    expect(chart.bands).toEqual([
      { start: 0, end: 3600, lowStart: 180, lowEnd: 180, highStart: 230, highEnd: 230, percent: 68 },
    ])
  })

  it('ohne Kurve keine Variante', () => {
    expect(rideChart(steps, { accuracy: { ...accuracy, trace: [] } })).toBeUndefined()
  })

  it('zeichnet in der Variante die Kurve statt des Profils', () => {
    const calls: string[] = []
    const ctx = new Proxy({ measureText: () => ({ width: 10 }) } as Record<string, unknown>, {
      get: (target, key: string) =>
        target[key] ??
        ((...args: unknown[]) => {
          calls.push(`${key}:${args.length}`)
        }),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D
    const data = {
      title: 'Schwelle',
      date: '3. NOV 2026',
      stats: [{ label: 'TSS', value: '63' }],
      steps,
      ride: rideChart(steps, { accuracy }),
    }

    drawOverlay(ctx, data, 'actual')
    const strokes = calls.filter((call) => call.startsWith('stroke:')).length
    calls.length = 0
    drawOverlay(ctx, data, 'profile')

    // die Kurve ist ein Strich mehr als die Karte allein
    expect(strokes).toBe(calls.filter((call) => call.startsWith('stroke:')).length + 1)
  })
})

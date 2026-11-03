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
} from '../plan/storyOverlay'
import type { ExtraRide, PlannedWorkout } from '../types/plan'

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

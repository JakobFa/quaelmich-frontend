import { describe, expect, it } from 'vitest'

import { buildWeeks, formatDuration, formatHours, mondayOf, weekIndexFor } from '../plan/weeks'
import type { PlannedWorkout, TrainingPlan } from '../types/plan'

function planned(id: number, date: string, minutes: number, completed = false): PlannedWorkout {
  return {
    id,
    date,
    phase: 'BASE',
    completed,
    rating: null,
    actual: null,
    adjustment: null,
    workout: {
      id: 2,
      title: 'Grundlage',
      type: 'ENDURANCE',
      description: '',
      steps: [],
      durationInMinutes: minutes,
      tss: minutes,
    },
  }
}

// Mi 21.10. bis Event So 08.11.2026 → drei Wochen (19.10., 26.10., 02.11.)
const plan: TrainingPlan = {
  id: 1,
  startDate: '2026-10-21',
  eventName: 'Testevent',
  eventDate: '2026-11-08',
  workouts: [
    planned(1, '2026-10-22', 90, true),
    planned(2, '2026-10-24', 180),
    planned(3, '2026-10-27', 60),
  ],
  extraRides: [
    { id: 9, date: '2026-10-23', durationMinutes: 40, distanceKm: 15, tss: 25, assessment: null },
  ],
}

describe('weeks', () => {
  it('findet den Montag einer Woche', () => {
    expect(mondayOf('2026-10-21')).toBe('2026-10-19')
    expect(mondayOf('2026-10-25')).toBe('2026-10-19') // Sonntag gehört zur Woche davor
    expect(mondayOf('2026-10-26')).toBe('2026-10-26')
  })

  it('teilt den Plan in Wochen von Montag bis Sonntag bis zur Event-Woche', () => {
    const weeks = buildWeeks(plan)

    expect(weeks.map((w) => w.monday)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02'])
    expect(weeks.every((w) => w.days.length === 7)).toBe(true)
  })

  it('ordnet Zusatzfahrten ihrem Tag zu', () => {
    const [first] = buildWeeks(plan)
    const friday = first!.days.find((day) => day.date === '2026-10-23')!

    expect(friday.workouts).toHaveLength(0)
    expect(friday.extraRides.map((ride) => ride.id)).toEqual([9])
  })

  it('summiert Umfang, TSS und erledigte Workouts pro Woche', () => {
    const [first, second] = buildWeeks(plan)

    expect(first!.totalMinutes).toBe(270)
    expect(first!.completedCount).toBe(1)
    expect(second!.totalMinutes).toBe(60)
  })

  it('markiert den Event-Tag', () => {
    const weeks = buildWeeks(plan)
    const lastWeek = weeks[weeks.length - 1]!

    expect(lastWeek.days.find((d) => d.isEvent)?.date).toBe('2026-11-08')
  })

  it('springt zur Woche von heute', () => {
    const weeks = buildWeeks(plan)

    expect(weekIndexFor(weeks, '2026-10-28')).toBe(1)
    expect(weekIndexFor(weeks, '2026-01-01')).toBe(0)
    expect(weekIndexFor(weeks, '2027-01-01')).toBe(2)
  })

  it('formatiert Minuten als Stunden', () => {
    expect(formatHours(90)).toBe('1:30 h')
    expect(formatHours(180)).toBe('3 h')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(65)).toBe('1:05 h')
  })

  it('zeigt alle Events und reicht bis zur Woche des letzten', () => {
    const plan = {
      startDate: '2026-10-26',
      eventDate: '2026-11-07',
      eventName: 'Erstes',
      workouts: [],
      moreEvents: [{ name: 'Zweites', date: '2026-11-21', distanceKm: 100, elevationMeters: 500 }],
    } as unknown as Parameters<typeof buildWeeks>[0]

    const weeks = buildWeeks(plan)

    expect(weeks).toHaveLength(4)
    const eventDays = weeks.flatMap((w) => w.days).filter((d) => d.isEvent)
    expect(eventDays.map((d) => [d.date, d.eventName])).toEqual([
      ['2026-11-07', 'Erstes'],
      ['2026-11-21', 'Zweites'],
    ])
  })
})

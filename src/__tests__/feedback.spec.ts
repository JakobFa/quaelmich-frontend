import { describe, expect, it } from 'vitest'

import { missingFeedback, pausedUntil } from '../plan/feedback'
import type { PlannedWorkout, TrainingPlan } from '../types/plan'

function workout(date: string, extra: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: Number(date.split('-').join('')),
    date,
    phase: 'BASE',
    completed: false,
    rating: null,
    workout: {
      id: 5,
      title: 'Sweet Spot',
      type: 'SWEET_SPOT',
      description: '',
      steps: [],
      durationInMinutes: 60,
      tss: 60,
    },
    actual: null,
    adjustment: null,
    ...extra,
  }
}

const plan = (workouts: PlannedWorkout[]) => ({ workouts }) as unknown as TrainingPlan

describe('Rückmeldung', () => {
  it('erinnert nur an vergangene Tage ohne jede Rückmeldung', () => {
    const missing = missingFeedback(
      plan([
        workout('2026-10-20'),
        workout('2026-10-21', { completed: true }),
        workout('2026-10-22', { skipReason: 'NO_TIME' }),
        workout('2026-10-23', { actual: {} as PlannedWorkout['actual'] }),
        workout('2026-10-24'), // heute
      ]),
      '2026-10-24',
    )

    expect(missing.map((p) => p.date)).toEqual(['2026-10-20'])
  })

  it('findet das Ende einer Pause', () => {
    const p = plan([
      workout('2026-10-22', { skipReason: 'PAUSE' }),
      workout('2026-10-25', { skipReason: 'PAUSE' }),
      workout('2026-10-27', { skipReason: 'PAUSE' }),
      workout('2026-10-29'),
    ])

    expect(pausedUntil(p, '2026-10-24')).toBe('2026-10-27')
    expect(pausedUntil(p, '2026-10-28')).toBeNull()
  })
})

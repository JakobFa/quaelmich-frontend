import { describe, expect, it } from 'vitest'

import {
  formatClock,
  nextStepStart,
  percentAt,
  positionAt,
  previousStepStart,
} from '../plan/player'
import type { WorkoutStep } from '../types/workout'

const steps: WorkoutStep[] = [
  { kind: 'WARMUP', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 75 },
  { kind: 'INTERVAL', durationSeconds: 300, powerStartPercent: 110, powerEndPercent: 110 },
  { kind: 'COOLDOWN', durationSeconds: 300, powerStartPercent: 60, powerEndPercent: 45 },
]

describe('Workout-Player', () => {
  it('findet den aktuellen Abschnitt und die Restzeit', () => {
    expect(positionAt(steps, 0)).toMatchObject({ index: 0, stepRemaining: 600 })
    expect(positionAt(steps, 650)).toMatchObject({ index: 1, stepElapsed: 50, stepRemaining: 250 })
    expect(positionAt(steps, 1200)).toMatchObject({ index: 3, finished: true, totalSeconds: 1200 })
  })

  it('rechnet bei Rampen das Ziel im Moment aus', () => {
    expect(percentAt(steps[0]!, 0)).toBe(50)
    expect(percentAt(steps[0]!, 300)).toBe(63)
    expect(percentAt(steps[0]!, 600)).toBe(75)
  })

  it('springt zum nächsten Abschnitt oder zurück', () => {
    expect(nextStepStart(steps, 100)).toBe(600)
    expect(nextStepStart(steps, 1000)).toBe(1200)
    expect(previousStepStart(steps, 700)).toBe(600) // mitten drin → Anfang des Abschnitts
    expect(previousStepStart(steps, 601)).toBe(0) // gerade erst drin → voriger Abschnitt
  })

  it('formatiert die Uhr', () => {
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(0.2)).toBe('0:01')
  })
})

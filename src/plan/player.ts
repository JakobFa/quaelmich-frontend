import type { WorkoutStep } from '../types/workout'

/** Wo steht der Player gerade? */
export type Position = {
  /** Index des aktuellen Abschnitts; steps.length = fertig */
  index: number
  /** Sekunden im aktuellen Abschnitt */
  stepElapsed: number
  stepRemaining: number
  totalSeconds: number
  finished: boolean
}

export function totalSecondsOf(steps: WorkoutStep[]) {
  return steps.reduce((sum, step) => sum + step.durationSeconds, 0)
}

/** Startsekunde jedes Abschnitts */
export function stepStarts(steps: WorkoutStep[]): number[] {
  const starts: number[] = []
  let sum = 0
  for (const step of steps) {
    starts.push(sum)
    sum += step.durationSeconds
  }
  return starts
}

export function positionAt(steps: WorkoutStep[], elapsed: number): Position {
  const totalSeconds = totalSecondsOf(steps)
  const starts = stepStarts(steps)
  for (let index = 0; index < steps.length; index++) {
    const end = starts[index]! + steps[index]!.durationSeconds
    if (elapsed < end) {
      const stepElapsed = elapsed - starts[index]!
      return {
        index,
        stepElapsed,
        stepRemaining: steps[index]!.durationSeconds - stepElapsed,
        totalSeconds,
        finished: false,
      }
    }
  }
  return { index: steps.length, stepElapsed: 0, stepRemaining: 0, totalSeconds, finished: true }
}

/** Ziel in % FTP in diesem Moment – bei Rampen (Aufwärmen, Ausfahren) linear dazwischen */
export function percentAt(step: WorkoutStep, stepElapsed: number): number {
  if (step.durationSeconds <= 0) return step.powerStartPercent
  const share = Math.min(Math.max(stepElapsed / step.durationSeconds, 0), 1)
  return Math.round(
    step.powerStartPercent + (step.powerEndPercent - step.powerStartPercent) * share,
  )
}

/** "Weiter": Anfang des nächsten Abschnitts */
export function nextStepStart(steps: WorkoutStep[], elapsed: number): number {
  const { index, totalSeconds } = positionAt(steps, elapsed)
  return index + 1 < steps.length ? stepStarts(steps)[index + 1]! : totalSeconds
}

/** "Zurück": an den Anfang des Abschnitts – ist man gerade erst drin, an den Anfang des vorherigen */
export function previousStepStart(steps: WorkoutStep[], elapsed: number): number {
  const starts = stepStarts(steps)
  const { index, stepElapsed } = positionAt(steps, elapsed)
  const current = Math.min(index, steps.length - 1)
  if (index < steps.length && stepElapsed > 3) return starts[current]!
  return starts[Math.max(current - 1, 0)] ?? 0
}

/** 75 → "1:15", 3725 → "1:02:05" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

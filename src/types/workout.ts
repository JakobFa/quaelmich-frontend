export type WorkoutType =
  | 'RECOVERY'
  | 'ENDURANCE'
  | 'LONG_RIDE'
  | 'TEMPO'
  | 'SWEET_SPOT'
  | 'THRESHOLD'
  | 'OVER_UNDER'
  | 'VO2MAX'
  | 'ANAEROBIC'
  | 'SPRINT'
  | 'FTP_TEST'

export type StepKind = 'WARMUP' | 'STEADY' | 'INTERVAL' | 'RECOVERY' | 'COOLDOWN'

export type WorkoutStep = {
  kind: StepKind
  durationSeconds: number
  powerStartPercent: number
  powerEndPercent: number
}

export type Workout = {
  id: number
  title: string
  type: WorkoutType
  description: string
  steps: WorkoutStep[]
  durationInMinutes: number
  tss: number
}

export const workoutTypeLabels: Record<WorkoutType, string> = {
  RECOVERY: 'Regeneration',
  ENDURANCE: 'Grundlage',
  LONG_RIDE: 'Lange Ausfahrt',
  TEMPO: 'Tempo',
  SWEET_SPOT: 'Sweet Spot',
  THRESHOLD: 'Schwelle',
  OVER_UNDER: 'Over-Unders',
  VO2MAX: 'VO2max',
  ANAEROBIC: 'Anaerob',
  SPRINT: 'Sprint',
  FTP_TEST: 'FTP-Test',
}

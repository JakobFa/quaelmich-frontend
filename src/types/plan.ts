import type { Workout } from './workout'

export type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY'

export const phaseLabels: Record<Phase, string> = {
  BASE: 'Grundlage',
  BUILD: 'Aufbau',
  PEAK: 'Spitze',
  TAPER: 'Tapering',
  RECOVERY: 'Erholung',
}

/** Wie die gefahrene Einheit im Vergleich zum Plan war (Grenzen: 80 %, 120 %, 150 % der TSS) */
export type Assessment = 'EASIER' | 'AS_PLANNED' | 'HARDER' | 'MUCH_HARDER'

export const assessmentLabels: Record<Assessment, string> = {
  EASIER: '▼ leichter',
  AS_PLANNED: '✓ wie geplant',
  HARDER: '▲ härter',
  MUCH_HARDER: '▲▲ deutlich härter',
}

/** Tatsächlich gefahrene Werte aus intervals.icu (z. B. vom Wahoo oder Garmin) */
export type ActualRide = {
  durationMinutes: number | null
  distanceKm: number | null
  tss: number | null
  assessment: Assessment
  /** null = noch nicht bestätigt, true = war das geplante Training, false = anderes Training */
  confirmed: boolean | null
}

/** Gesetzt, wenn quaelmich das Workout wegen einer härteren Einheit leichter gemacht hat */
export type Adjustment = {
  note: string
  originalTitle: string
}

export type PlannedWorkout = {
  id: number
  date: string
  phase: Phase
  completed: boolean
  rating: number | null
  workout: Workout
  actual: ActualRide | null
  adjustment: Adjustment | null
}

export type TrainingPlan = {
  id: number
  startDate: string
  eventName: string
  eventDate: string
  workouts: PlannedWorkout[]
}

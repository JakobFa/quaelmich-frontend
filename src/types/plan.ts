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
  /** Link "View on Strava", nur bei Fahrten aus Strava */
  stravaUrl?: string | null
  /** TSS nur aus dem Puls geschätzt (ohne Wattmesser) */
  tssFromHeartRate?: boolean
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

/** Fahrt ohne geplantes Workout, z. B. am Ruhetag; assessment null = lockere Runde (unter 50 TSS) */
export type ExtraRide = {
  id: number
  date: string
  durationMinutes: number | null
  distanceKm: number | null
  tss: number | null
  assessment: Assessment | null
  stravaUrl?: string | null
  tssFromHeartRate?: boolean
}

/** Wie quaelmich das Event einschätzt – bestimmt die Auswahl der Workouts */
export type EventFocus =
  'LONG_CLIMBING' | 'LONG_FLAT' | 'MIXED' | 'SHORT_INTENSE' | 'TIME_TRIAL' | 'ULTRA'

export const eventFocusLabels: Record<EventFocus, { title: string; hint: string }> = {
  LONG_CLIMBING: {
    title: 'Lang & bergig',
    hint: 'Sweet Spot und Schwelle in langen Intervallen, lange Ausfahrten mit Tempo-Blöcken.',
  },
  LONG_FLAT: {
    title: 'Lang & flach',
    hint: 'Tempo und Sweet Spot, sehr lange Grundlage, Tempo-Blöcke in der langen Ausfahrt.',
  },
  MIXED: { title: 'Ausgewogen', hint: 'Schwelle, Over-Unders und VO2max für wechselndes Tempo.' },
  SHORT_INTENSE: {
    title: 'Kurz & intensiv',
    hint: 'VO2max, Anaerob und Sprints – für Antritte und harte Rennminuten.',
  },
  TIME_TRIAL: { title: 'Zeitfahren', hint: 'Schwelle: lange gleichmäßig am Limit fahren.' },
  ULTRA: { title: 'Ultra', hint: 'Viel Grundlage und Tempo – stundenlang gleichmäßig.' },
}

export type EventProfile = { estimatedMinutes: number; focus: EventFocus }

export type TrainingPlan = {
  id: number
  startDate: string
  eventName: string
  eventDate: string
  workouts: PlannedWorkout[]
  extraRides?: ExtraRide[]
  eventProfile?: EventProfile
}

import type { EventGoal, WeeklyAvailability } from './athlete'
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

/** Warum ein Workout ausgefallen ist – auch "nichts gemacht" ist eine Rückmeldung */
export type SkipReason = 'NO_TIME' | 'SICK' | 'TIRED' | 'INJURED' | 'OTHER' | 'PAUSE'

export const skipReasonLabels: Record<SkipReason, string> = {
  NO_TIME: 'Keine Zeit',
  SICK: 'Krank',
  TIRED: 'Zu müde',
  INJURED: 'Verletzt',
  OTHER: 'Anderer Grund',
  PAUSE: 'Pause',
}

export type PlannedWorkout = {
  id: number
  date: string
  phase: Phase
  completed: boolean
  rating: number | null
  /** gesetzt = nicht gemacht (mit Grund) oder pausiert */
  skipReason?: SkipReason | null
  workout: Workout
  actual: ActualRide | null
  adjustment: Adjustment | null
  /** welche Anpassungen gerade möglich sind (leichter, härter, kürzer, länger, zurück zum Original) */
  options?: AdjustOptions
}

export type AdjustDirection = 'EASIER' | 'HARDER' | 'SHORTER' | 'LONGER'

export type AdjustOptions = {
  easier: boolean
  harder: boolean
  shorter: boolean
  longer: boolean
  reset: boolean
}

/** Fahrt ohne geplantes Workout, z. B. am Ruhetag; assessment null = lockere Runde (unter 50 TSS) */
/** Sportart einer gemachten Einheit – nur Radfahrten haken geplante Workouts ab */
export type Sport = 'RIDE' | 'RUN' | 'SWIM' | 'WALK' | 'HIKE' | 'STRENGTH' | 'OTHER'

export const sportLabels: Record<Sport, string> = {
  RIDE: '🚴 Zusatzfahrt',
  RUN: '🏃 Laufen',
  SWIM: '🏊 Schwimmen',
  WALK: '🚶 Gehen',
  HIKE: '🥾 Wandern',
  STRENGTH: '🏋️ Kraft',
  OTHER: '⚡ Sonstiges',
}

/** Einheit ohne geplantes Workout: Zusatzfahrt oder andere Sportart, zählt als Belastung */
export type ExtraRide = {
  id: number
  date: string
  durationMinutes: number | null
  distanceKm: number | null
  tss: number | null
  assessment: Assessment | null
  stravaUrl?: string | null
  tssFromHeartRate?: boolean
  /** TSS nur grob aus Dauer und Sportart geschätzt */
  tssFromDuration?: boolean
  /** fehlt bei älteren Einträgen → Radfahrt */
  sport?: Sport
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

export type EventProfile = {
  estimatedMinutes: number
  focus: EventFocus
  goal?: EventGoal
}

export type TrainingPlan = {
  id: number
  startDate: string
  eventName: string
  eventDate: string
  workouts: PlannedWorkout[]
  extraRides?: ExtraRide[]
  eventProfile?: EventProfile
  /** abweichende Zeit für einzelne Wochen, Schlüssel = Montag (ISO-Datum) */
  weekAvailability?: Record<string, WeeklyAvailability>
}

/** Wie genau die Intervalle getroffen wurden (Richtwert) */
export type AccuracyVerdict = 'ON_TARGET' | 'SLIGHTLY_HARD' | 'HARD' | 'SLIGHTLY_EASY' | 'EASY'

export const accuracyVerdictLabels: Record<AccuracyVerdict, string> = {
  ON_TARGET: '✓ im Ziel',
  SLIGHTLY_HARD: '▲ etwas zu hart',
  HARD: '▲▲ zu hart',
  SLIGHTLY_EASY: '▼ etwas zu leicht',
  EASY: '▼▼ zu leicht',
}

export type IntervalAccuracy = {
  basis: 'POWER' | 'HEART_RATE'
  /** 0–100, nach Dauer gewichtet */
  score: number
  onTarget: number
  uncertain: boolean
  tip: string | null
  blocks: {
    number: number
    durationSeconds: number
    targetLow: number
    /** null = Vollgas, nach oben offen */
    targetHigh: number | null
    actual: number
    verdict: AccuracyVerdict
    score: number
  }[]
}

/** Wofür die Phase da ist – eine Zeile beim Workout */
export const phasePurpose: Record<Phase, string> = {
  BASE: 'Grundlagenphase: Ausdauer aufbauen – viel locker, wenig hart.',
  BUILD: 'Aufbauphase: Jetzt kommen gezielt härtere Einheiten dazu, die dich schneller machen.',
  PEAK: 'Spitzenphase: Einheiten, die deinem Event am ähnlichsten sind – Qualität vor Umfang.',
  TAPER: 'Tapering: weniger Umfang, damit du frisch zum Event kommst. Die Form ist schon da.',
  RECOVERY:
    'Erholungswoche: weniger Belastung, damit dein Körper die letzten Wochen verarbeitet – genau hier wirst du stärker.',
}

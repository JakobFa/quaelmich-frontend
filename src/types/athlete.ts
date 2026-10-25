export type Level = 'BEGINNER' | 'HOBBY' | 'AMBITIOUS' | 'PERFORMANCE'

export const levelLabels: Record<Level, string> = {
  BEGINNER: 'Einsteiger',
  HOBBY: 'Hobby',
  AMBITIOUS: 'Ambitioniert',
  PERFORMANCE: 'Leistungsorientiert',
}

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export const weekdayLabels: Record<Weekday, string> = {
  monday: 'Mo',
  tuesday: 'Di',
  wednesday: 'Mi',
  thursday: 'Do',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'So',
}

export type WeeklyAvailability = Record<Weekday, number>

/** Training nach Watt (mit Wattmesser) oder nach Puls (ohne) */
export type TrainingMode = 'POWER' | 'HEART_RATE'

export const trainingModeLabels: Record<TrainingMode, string> = {
  POWER: 'Watt',
  HEART_RATE: 'Puls',
}

/** Art des Events – optional, sonst schätzt quaelmich den Schwerpunkt aus Dauer und Höhenmetern */
export type EventType =
  'GRAN_FONDO' | 'ROAD_RACE' | 'CRITERIUM' | 'TIME_TRIAL' | 'GRAVEL' | 'ULTRA' | 'BIKEPACKING'

export const eventTypeLabels: Record<EventType, string> = {
  GRAN_FONDO: 'Radmarathon',
  ROAD_RACE: 'Straßenrennen',
  CRITERIUM: 'Kriterium',
  TIME_TRIAL: 'Zeitfahren',
  GRAVEL: 'Gravel',
  ULTRA: 'Ultra-Rennen',
  BIKEPACKING: 'Bikepacking',
}

/** Was beim Event das Ziel ist – macht den Plan etwas leichter oder härter */
export type EventGoal = 'FINISH' | 'GOOD_TIME' | 'COMPETE'

export const eventGoalLabels: Record<EventGoal, { title: string; hint: string }> = {
  FINISH: { title: 'Ankommen', hint: 'Durchkommen und genießen – harte Einheiten etwas leichter.' },
  GOOD_TIME: {
    title: 'Gute Zeit',
    hint: 'Eine starke Zeit für dein Level – der Plan wie berechnet.',
  },
  COMPETE: {
    title: 'Vorne mitfahren',
    hint: 'Ganz vorne dabei sein – härtere Einheiten und mehr Renntempo.',
  },
}

export type TargetEvent = {
  id?: number
  name: string
  date: string
  distanceKm: number | null
  elevationMeters: number | null
  type?: EventType | null
  /** Ankommen, gute Zeit oder vorne mitfahren – ohne Angabe "gute Zeit" */
  goal?: EventGoal | null
}

export type Athlete = {
  id?: number
  /** im Puls-Modus optional */
  ftp: number | null
  trainingMode?: TrainingMode | null
  /** Beginn von Leistungszone 2–7 in % FTP, optional – sonst die Standardzonen nach Coggan */
  powerZoneStarts?: number[] | null
  /** Beginn von Zone 2–5 in bpm, optional – sonst aus dem Maximalpuls berechnet */
  heartRateZoneStarts?: number[] | null
  /** Maximalpuls, optional – Grundlage für den Puls-TSS bei Fahrten ohne Wattmesser */
  maxHeartRate?: number | null
  /** Schwellenpuls (LTHR), optional – nur wenn aus einem Test bekannt, sonst 90 % vom Maximalpuls */
  thresholdHeartRate?: number | null
  weightKg: number | null
  /** gesetzt von quaelmich: geschätzte FTP aus einer Fahrt, die mit der eingetragenen FTP nicht möglich ist */
  suggestedFtp?: number | null
  suggestedFtpNote?: string | null
  dismissedSuggestedFtp?: number | null
  level: Level | null
  event: TargetEvent
  availability: WeeklyAvailability
}

export function emptyAthlete(): Athlete {
  return {
    ftp: null,
    trainingMode: 'POWER',
    heartRateZoneStarts: null,
    maxHeartRate: null,
    thresholdHeartRate: null,
    weightKg: null,
    level: null,
    event: { name: '', date: '', distanceKm: null, elevationMeters: null },
    availability: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
    },
  }
}

/** Eingetragener Schwellenpuls, sonst 90 % vom Maximalpuls (wie im Backend) */
export function effectiveThresholdHeartRate(athlete: Athlete): number | null {
  if (athlete.thresholdHeartRate) return athlete.thresholdHeartRate
  return athlete.maxHeartRate ? Math.round(athlete.maxHeartRate * 0.9) : null
}

export function isHeartRateMode(athlete: Athlete | null): boolean {
  return athlete?.trainingMode === 'HEART_RATE'
}

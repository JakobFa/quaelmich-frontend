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

export type TargetEvent = {
  id?: number
  name: string
  date: string
  distanceKm: number | null
  elevationMeters: number | null
}

export type Athlete = {
  id?: number
  ftp: number | null
  /** Maximalpuls, optional – Grundlage für den Puls-TSS bei Fahrten ohne Wattmesser */
  maxHeartRate?: number | null
  /** Schwellenpuls (LTHR), optional – nur wenn aus einem Test bekannt, sonst 90 % vom Maximalpuls */
  thresholdHeartRate?: number | null
  weightKg: number | null
  level: Level | null
  event: TargetEvent
  availability: WeeklyAvailability
}

export function emptyAthlete(): Athlete {
  return {
    ftp: null,
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

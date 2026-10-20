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
  weightKg: number | null
  level: Level | null
  event: TargetEvent
  availability: WeeklyAvailability
}

export function emptyAthlete(): Athlete {
  return {
    ftp: null,
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

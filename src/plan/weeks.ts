import type { ExtraRide, Phase, PlannedWorkout, TrainingPlan } from '../types/plan'

export type PlanDay = {
  date: string
  workouts: PlannedWorkout[]
  extraRides: ExtraRide[]
  isEvent: boolean
}

export type PlanWeek = {
  monday: string
  days: PlanDay[]
  phase: Phase | null
  totalMinutes: number
  totalTss: number
  completedCount: number
}

/** Datum ohne Uhrzeit als "YYYY-MM-DD" in lokaler Zeit */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function mondayOf(iso: string): string {
  const date = parseIsoDate(iso)
  const weekday = (date.getDay() + 6) % 7 // Mo = 0 … So = 6
  return addDays(iso, -weekday)
}

/** Teilt den Plan in Wochen (Mo–So) vom Planstart bis zur Event-Woche. */
export function buildWeeks(plan: TrainingPlan): PlanWeek[] {
  const byDate = new Map<string, PlannedWorkout[]>()
  for (const planned of plan.workouts) {
    byDate.set(planned.date, [...(byDate.get(planned.date) ?? []), planned])
  }
  const extraByDate = new Map<string, ExtraRide[]>()
  for (const ride of plan.extraRides ?? []) {
    extraByDate.set(ride.date, [...(extraByDate.get(ride.date) ?? []), ride])
  }

  const weeks: PlanWeek[] = []
  const lastMonday = mondayOf(plan.eventDate)
  for (let monday = mondayOf(plan.startDate); monday <= lastMonday; monday = addDays(monday, 7)) {
    const days: PlanDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i)
      return {
        date,
        workouts: byDate.get(date) ?? [],
        extraRides: extraByDate.get(date) ?? [],
        isEvent: date === plan.eventDate,
      }
    })
    const workouts = days.flatMap((day) => day.workouts)
    weeks.push({
      monday,
      days,
      phase: workouts[0]?.phase ?? null,
      totalMinutes: workouts.reduce((sum, p) => sum + p.workout.durationInMinutes, 0),
      totalTss: workouts.reduce((sum, p) => sum + p.workout.tss, 0),
      completedCount: workouts.filter((p) => p.completed).length,
    })
  }
  return weeks
}

/** Index der Woche, in der das Datum liegt – vor Planstart 0, nach Planende die letzte Woche. */
export function weekIndexFor(weeks: PlanWeek[], iso: string): number {
  const monday = mondayOf(iso)
  const index = weeks.findIndex((week) => week.monday === monday)
  if (index >= 0) return index
  return weeks.length > 0 && monday > weeks[weeks.length - 1]!.monday ? weeks.length - 1 : 0
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, '0')} h`
}

/** Dauer eines Workouts: unter einer Stunde in Minuten, sonst in Stunden */
export function formatDuration(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : formatHours(minutes)
}

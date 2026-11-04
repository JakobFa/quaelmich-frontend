import type { PlannedWorkout, TrainingPlan } from '../types/plan'

/** Vergangen und ohne jede Rückmeldung: weder abgehakt, noch Fahrt zugeordnet, noch "nicht gemacht" */
export function needsFeedback(planned: PlannedWorkout, today: string): boolean {
  return planned.date < today && !planned.completed && !planned.actual && !planned.skipReason
}

/**
 * Tage ohne Rückmeldung, an die die App erinnert. Wer krank gemeldet ist, wird nicht ans Nachtragen erinnert –
 * die Tage ab Krankheitsbeginn sind ohnehin ausgesetzt, und davor kann das warten, bis man wieder fit ist.
 */
export function missingFeedback(plan: TrainingPlan, today: string): PlannedWorkout[] {
  if (plan.sickSince) return []
  return plan.workouts.filter((planned) => needsFeedback(planned, today))
}

/** Letzter pausierter Tag ab heute, null = keine laufende oder geplante Pause */
export function pausedUntil(plan: TrainingPlan, today: string): string | null {
  const paused = plan.workouts
    .filter((planned) => planned.skipReason === 'PAUSE' && planned.date >= today)
    .map((planned) => planned.date)
    .sort()
  return paused[paused.length - 1] ?? null
}

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
  /** Krafttraining – keine Radeinheit (keine .fit-Datei, kein Player) */
  | 'STRENGTH'

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
  STRENGTH: 'Kraft',
}

/** Warum man die Einheit fährt und wie sie sich anfühlen soll – kurz, damit es nicht überlädt */
export const workoutPurpose: Record<WorkoutType, { why: string; how: string }> = {
  RECOVERY: {
    why: 'Die Durchblutung hilft den Beinen, sich zu erholen – ohne neue Ermüdung.',
    how: 'Wirklich locker, unterhalten geht problemlos. Lieber zu leicht als zu hart.',
  },
  ENDURANCE: {
    why: 'Die Basis für alles: Dein Körper bildet mehr Mitochondrien und Kapillaren, der Fettstoffwechsel wird besser – du hältst länger durch und erholst dich schneller.',
    how: 'Gleichmäßig in Zone 2, ganze Sätze sprechen geht noch. Nicht zum Bolzen verleiten lassen.',
  },
  LONG_RIDE: {
    why: 'Gewöhnt Körper und Kopf an viele Stunden im Sattel – und ist die beste Probe für Verpflegung und Sitzposition.',
    how: 'Ruhig starten, alle 20–30 Minuten essen und trinken, so wie am Eventtag.',
  },
  TEMPO: {
    why: 'Muskuläre Ausdauer knapp unter der Schwelle – die Intensität für lange Anstiege und Führungsarbeit.',
    how: 'Angenehm anstrengend: nur noch kurze Sätze. Gleichmäßig treten.',
  },
  SWEET_SPOT: {
    why: 'Viel Reiz für deine FTP bei überschaubarer Ermüdung – besonders effizient, wenn die Zeit knapp ist.',
    how: 'Fordernd, aber kontrolliert. Die letzten Minuten jedes Blocks dürfen zäh sein.',
  },
  THRESHOLD: {
    why: 'Hebt deine FTP direkt an – die Leistung, die du etwa eine Stunde halten kannst.',
    how: 'Hart und gleichmäßig, nicht zu schnell anfangen. Sprechen geht kaum noch.',
  },
  OVER_UNDER: {
    why: 'Lehrt den Körper, Laktat abzubauen, während du weiterfährst – wie bei Tempowechseln und Attacken im Rennen.',
    how: 'Die „Unders“ sind keine Pause, die „Overs“ kontrolliert statt Sprint.',
  },
  VO2MAX: {
    why: 'Steigert deine maximale Sauerstoffaufnahme, das „Dach“ deiner Ausdauer. Davon profitiert auf Dauer auch die Schwelle.',
    how: 'Sehr hart, aber gleichmäßig über das ganze Intervall. Die Pausen wirklich locker.',
  },
  ANAEROBIC: {
    why: 'Trainiert kurze Spitzen über der VO2max – für Antritte, kurze Rampen und um an einem Hinterrad dranzubleiben.',
    how: 'In jedem Intervall voll da sein, in den Pausen ganz locker rollen.',
  },
  SPRINT: {
    why: 'Kraft und Explosivität bei kaum Ermüdung. Vor einem Event weckt das die Beine auf.',
    how: 'Kurz und maximal, dazwischen genug Erholung – Qualität vor Menge.',
  },
  FTP_TEST: {
    why: 'Misst deine aktuelle FTP, damit alle Wattangaben im Plan zu dir passen.',
    how: 'Ausgeruht fahren, die ersten Minuten eher zurückhaltend, am Ende alles geben.',
  },
  STRENGTH: {
    why: 'Stärkere Beine und ein stabiler Rumpf bringen mehr Druck aufs Pedal, schützen Knie und Rücken und halten dich auch nach Stunden im Sattel stabil.',
    how: 'Zu Hause, ohne Geräte – eine Matte reicht. Jede Wiederholung kontrolliert, die letzten zwei sollen fordern, aber nicht wackeln. 30–60 Sekunden Pause zwischen den Sätzen.',
  },
}

/** Eigene Workouts haben IDs ab 1.000.000 (Bibliothek darunter) */
export const CUSTOM_WORKOUT_ID_OFFSET = 1_000_000

export function isCustomWorkout(id: number) {
  return id >= CUSTOM_WORKOUT_ID_OFFSET
}

export const stepKindLabels: Record<StepKind, string> = {
  WARMUP: 'Aufwärmen',
  STEADY: 'Gleichmäßig',
  INTERVAL: 'Intervall',
  RECOVERY: 'Pause',
  COOLDOWN: 'Ausfahren',
}

/** TSS eines Abschnitts wie im Backend: Stunden × Ø(Intensität²) × 100, bei Rampen (a² + ab + b²) / 3 */
export function stepTss(step: WorkoutStep) {
  const a = step.powerStartPercent / 100
  const b = step.powerEndPercent / 100
  return (step.durationSeconds / 3600) * ((a * a + a * b + b * b) / 3) * 100
}

/** Passende Trainingsart aus dem härtesten Intervall (Vorschlag im Builder) */
export function suggestWorkoutType(steps: WorkoutStep[]): WorkoutType {
  const minutes = steps.reduce((sum, step) => sum + step.durationSeconds, 0) / 60
  const hardest = Math.max(
    0,
    ...steps
      .filter((step) => step.kind === 'INTERVAL' || step.kind === 'STEADY')
      .map((step) => Math.max(step.powerStartPercent, step.powerEndPercent)),
  )
  if (hardest <= 55) return 'RECOVERY'
  if (hardest <= 75) return minutes >= 150 ? 'LONG_RIDE' : 'ENDURANCE'
  if (hardest <= 87) return 'TEMPO'
  if (hardest <= 93) return 'SWEET_SPOT'
  if (hardest <= 105) return 'THRESHOLD'
  if (hardest <= 120) return 'VO2MAX'
  if (hardest <= 150) return 'ANAEROBIC'
  return 'SPRINT'
}

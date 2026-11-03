import type { WorkoutStep } from '../types/workout'
import type { Position } from './player'

/** Was der Player gerade weiß – mehr braucht die Anfeuerung nicht */
export type CheerContext = {
  steps: WorkoutStep[]
  position: Position
  elapsed: number
  running: boolean
  /** Watt im Vergleich zum Ziel (nur mit Trainer und Wattmessung), sonst '' */
  verdict: '' | 'low' | 'high' | 'ok'
}

const BEFORE_START = 'Gleich geht’s los. Erst einrollen – heute zählt jede Minute.'
const PAUSED = 'Pause. Kurz durchatmen, dann geht’s weiter – du bist noch nicht fertig.'
const LAST_WARMUP = 'Gleich wird’s ernst: Ab jetzt wird jede Minute ein Stück härter.'
const COOLDOWN = 'Geschafft! Locker ausrollen und tief durchatmen. Das war stark.'

const WARMUP = [
  'Locker einrollen. Tief atmen, Schultern fallen lassen.',
  'Noch Luft ohne Ende – genieß die ruhigen Minuten.',
]

/** Nach der Höhe der Stufe (% FTP): je weiter oben, desto mehr Anfeuerung */
const BANDS: { below: number; texts: string[] }[] = [
  {
    below: 85,
    texts: [
      'Noch locker. Ruhig atmen, Kadenz oben halten.',
      'Spar dir die Körner – das Beste kommt noch.',
      'Rund treten, nicht verkrampfen.',
    ],
  },
  {
    below: 100,
    texts: [
      'Jetzt wird’s spürbar. Gleichmäßig bleiben!',
      'Schultern locker, Blick nach vorn.',
      'Du bist stark. Jeder Tritt zählt.',
    ],
  },
  {
    below: 115,
    texts: [
      'Über deiner Schwelle – hier fängt der Test richtig an!',
      'Das tut jetzt weh? Gut, genau dafür bist du hier.',
      'Atmen! Lang ausatmen, Druck aufs Pedal.',
    ],
  },
  {
    below: 130,
    texts: [
      'Hier trennt sich die Spreu vom Weizen. Du schaffst noch eine Minute!',
      'Nur diese eine Minute. Dann die nächste.',
      'Kopf aus, Beine an – nicht aufgeben!',
    ],
  },
  {
    below: Infinity,
    texts: [
      'Das ist dein Moment. Hol alles raus, es gibt kein Später!',
      'Jetzt zählt nur noch Wille. Durchziehen!',
      'Wahnsinn! Noch ein bisschen – nicht jetzt aufhören!',
    ],
  },
]

const NEW_STEP = [
  'Neue Stufe – halte die Watt!',
  'Eine Stufe höher. Du hast das im Griff.',
  'Weiter geht’s – ruhig bleiben, Druck halten.',
]

const LAST_SECONDS = [
  'Noch 10 Sekunden – halte durch!',
  'Gleich geschafft – drück noch einmal!',
  'Die Minute gehört dir. Noch ein paar Tritte!',
]

const LOW = 'Ein Tick mehr Druck – du hast noch was!'
const HIGH = 'Nicht übertreiben. Ruhig bleiben, die Rampe wartet noch.'

/** Die erste Zeile, wenn der Test geschafft ist (Fertig-Karte) */
export const RAMP_TEST_DONE = 'Stark! Du hast alles gegeben. Das war echte Arbeit.'

const NEW_STEP_SECONDS = 6
const LAST_SECONDS_LEFT = 10
const LAST_WARMUP_SECONDS = 30

function pick(texts: string[], index: number): string {
  return texts[index % texts.length]!
}

/**
 * Anfeuerung für den Rampentest. Reihenfolge der Wichtigkeit: Pause, die letzten Sekunden einer Stufe,
 * der Anfang einer neuen Stufe, die Höhe der Stufe. Ohne Zufall – dieselbe Stelle sagt immer dasselbe,
 * aufeinanderfolgende Stufen wechseln den Text.
 */
export function rampTestCheer(context: CheerContext): string {
  const { steps, position, elapsed, running, verdict } = context
  if (position.finished) return RAMP_TEST_DONE
  if (elapsed === 0 && !running) return BEFORE_START
  if (!running) return PAUSED

  const step = steps[position.index]
  if (!step) return ''
  if (step.kind === 'COOLDOWN') return COOLDOWN
  if (step.kind === 'WARMUP') {
    return position.stepRemaining <= LAST_WARMUP_SECONDS ? LAST_WARMUP : pick(WARMUP, Math.floor(position.stepElapsed / 120))
  }

  // Stufe 1, 2, 3 … der Rampe (nur Abschnitte, die selbst gefahren werden)
  const rampMinute = steps.slice(0, position.index + 1).filter((s) => s.kind === 'INTERVAL').length
  if (position.stepRemaining <= LAST_SECONDS_LEFT) return pick(LAST_SECONDS, rampMinute)
  if (position.stepElapsed <= NEW_STEP_SECONDS && rampMinute > 1) return pick(NEW_STEP, rampMinute)
  if (verdict === 'low' && position.stepElapsed > 15) return LOW
  if (verdict === 'high' && position.stepElapsed > 15) return HIGH

  const band = BANDS.find((b) => step.powerEndPercent < b.below)!
  return pick(band.texts, rampMinute)
}

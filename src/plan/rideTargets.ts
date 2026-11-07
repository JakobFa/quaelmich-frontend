import type { IntervalAccuracy } from '../types/plan'
import type { StepKind, WorkoutStep } from '../types/workout'

/**
 * Soll über die ganze Fahrt: Jeder Abschnitt des Trainings bekommt einen Zielbereich in Watt und einen Platz in der
 * Fahrt. Die Intervalle stehen dort, wo das Backend sie gefunden hat; Einrollen, Pausen und Ausrollen hängen davor,
 * dazwischen und dahinter. So passt es auch mit Anfahrt, längeren Pausen oder Ampelstopps.
 */

/** Sekunden je Punkt der Kurve (wie im Backend) */
export const TRACE_SECONDS = 10
/** um das Ziel der Intervalle gilt ±5 % als getroffen (wie im Backend) */
export const INTERVAL_BAND = 0.05
/** um das Ziel der lockeren Abschnitte ±12 % (wie bei "Zielbereich gehalten" im Backend) */
export const STEADY_BAND = 0.12
/** ab hier Vollgas: nach oben offen (wie im Backend) */
export const ALL_OUT_PERCENT = 120

export type TargetSegment = {
  /** Sekunden seit Start der Fahrt */
  start: number
  end: number
  kind: StepKind
  /** Zielbereich in Watt am Anfang und Ende (Rampen); high null = nach oben offen */
  lowStart: number
  lowEnd: number
  highStart: number | null
  highEnd: number | null
  /** Ziel in % FTP (Mitte), für die Zonenfarbe */
  percent: number
}

export type TargetSummary = {
  /** gezählte Sekunden: gefahren und mit Ziel */
  seconds: number
  percentInZone: number
  percentAbove: number
  percentBelow: number
}

type Group = { steps: WorkoutStep[]; interval: boolean }

/** Abschnitte in Gruppen: aufeinanderfolgende Intervalle bilden einen Block (wie blocksOf im Backend) */
function groups(steps: WorkoutStep[]): Group[] {
  const result: Group[] = []
  for (const step of steps) {
    const interval = step.kind === 'INTERVAL'
    const last = result[result.length - 1]
    if (last && last.interval === interval) last.steps.push(step)
    else result.push({ steps: [step], interval })
  }
  return result
}

function blockPercent(steps: WorkoutStep[]): number {
  const duration = steps.reduce((sum, step) => sum + step.durationSeconds, 0)
  const weighted = steps.reduce(
    (sum, step) => sum + (step.durationSeconds * (step.powerStartPercent + step.powerEndPercent)) / 2,
    0,
  )
  return duration > 0 ? weighted / duration : 0
}

/**
 * Die FTP, mit der das Backend gerechnet hat – aus den Zielen der gefundenen Intervalle, damit Soll und Ist zur
 * selben FTP gehören (auch wenn sie sich seit der Fahrt geändert hat). null ohne Intervalle.
 */
export function ftpOf(steps: WorkoutStep[], accuracy: IntervalAccuracy): number | null {
  if (accuracy.basis !== 'POWER') return null // Puls: die Ziele der lockeren Abschnitte kennt nur das Backend
  const blocks = groups(steps).filter((group) => group.interval)
  if (blocks.length === 0 || blocks.length !== accuracy.blocks.length) return null
  const estimates = blocks.map((group, index) => {
    const percent = blockPercent(group.steps)
    return percent > 0 ? (accuracy.blocks[index]!.targetLow / (1 - INTERVAL_BAND)) * (100 / percent) : 0
  })
  const valid = estimates.filter((value) => value > 0)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
}

/**
 * Ein Abschnitt an seinem Platz; from/to = welcher Teil der geplanten Rampe in der Fahrt liegt (0–1), damit ein
 * abgeschnittenes Einrollen am Rand das richtige Ziel hat
 */
function segment(step: WorkoutStep, start: number, end: number, ftp: number, from = 0, to = 1): TargetSegment {
  const interval = step.kind === 'INTERVAL'
  const band = interval ? INTERVAL_BAND : STEADY_BAND
  const percent = (step.powerStartPercent + step.powerEndPercent) / 2
  const allOut = interval && percent >= ALL_OUT_PERCENT
  const at = (share: number) =>
    ((step.powerStartPercent + (step.powerEndPercent - step.powerStartPercent) * Math.min(1, share)) * ftp) / 100
  return {
    start,
    end,
    kind: step.kind,
    lowStart: Math.round(at(from) * (1 - band)),
    lowEnd: Math.round(at(to) * (1 - band)),
    highStart: allOut ? null : Math.round(at(from) * (1 + band)),
    highEnd: allOut ? null : Math.round(at(to) * (1 + band)),
    percent,
  }
}

/**
 * Die Ziele aller Abschnitte, an ihrem Platz in der Fahrt. Abschnitte vor dem ersten Intervall enden dort, wo es
 * beginnt; zwischen zwei Intervallen beginnen sie nach dem einen und enden spätestens mit dem nächsten (die letzte
 * Pause füllt eine längere Lücke auf). Was nach dem Ausrollen noch gefahren wurde, hat kein Ziel.
 */
export function targetSegments(
  steps: WorkoutStep[],
  accuracy: IntervalAccuracy,
  rideSeconds: number,
): TargetSegment[] {
  const ftp = ftpOf(steps, accuracy)
  if (ftp === null) return []
  const all = groups(steps)
  const result: TargetSegment[] = []
  let blockIndex = 0
  let lastBlockEnd: number | null = null
  for (let g = 0; g < all.length; g++) {
    const group = all[g]!
    if (group.interval) {
      const found = accuracy.blocks[blockIndex++]!
      let second = found.startSecond
      for (const step of group.steps) {
        result.push(segment(step, second, second + step.durationSeconds, ftp))
        second += step.durationSeconds
      }
      lastBlockEnd = found.startSecond + found.durationSeconds
      continue
    }
    const nextBlock = blockIndex < accuracy.blocks.length ? accuracy.blocks[blockIndex]! : null
    if (lastBlockEnd === null) {
      // vor dem ersten Intervall: rückwärts vom ersten Fund
      let second = nextBlock ? nextBlock.startSecond : 0
      const before: TargetSegment[] = []
      for (const step of [...group.steps].reverse()) {
        const start = Math.max(0, second - step.durationSeconds)
        const from = step.durationSeconds > 0 ? 1 - (second - start) / step.durationSeconds : 0
        if (second > 0) before.unshift(segment(step, start, second, ftp, from))
        second = start
      }
      result.push(...before)
      continue
    }
    let second = lastBlockEnd
    const limit = nextBlock ? nextBlock.startSecond : rideSeconds
    group.steps.forEach((step, index) => {
      if (second >= limit) return
      const last = index === group.steps.length - 1
      const end = nextBlock && last ? limit : Math.min(limit, second + step.durationSeconds)
      const to = step.durationSeconds > 0 ? (end - second) / step.durationSeconds : 1
      result.push(segment(step, second, end, ftp, 0, to))
      second = end
    })
  }
  return result
}

/** Ziel einer Sekunde im Abschnitt (Rampen linear) */
function bandAt(seg: TargetSegment, second: number): { low: number; high: number | null } {
  const span = seg.end - seg.start
  const share = span > 0 ? (second - seg.start) / span : 0
  const low = seg.lowStart + (seg.lowEnd - seg.lowStart) * share
  const high =
    seg.highStart === null || seg.highEnd === null
      ? null
      : seg.highStart + (seg.highEnd - seg.highStart) * share
  return { low, high }
}

/** Locker gemeinte Abschnitte: darunter ist nicht falsch (wie beim Ausrollen im Backend) */
const EASY_KINDS: StepKind[] = ['RECOVERY', 'COOLDOWN']

/**
 * Wie viel der Zeit mit Ziel im Zielbereich lag – über die ganze Einheit, je Punkt der Kurve (10 s). Stillstand
 * zählt nicht. Bei Pausen und Ausrollen gilt "darunter" als im Ziel. null, wenn kaum etwas zu zählen ist.
 */
export function targetSummary(segments: TargetSegment[], trace: (number | null)[]): TargetSummary | null {
  let counted = 0
  let inZone = 0
  let above = 0
  let below = 0
  trace.forEach((value, index) => {
    if (value === null) return
    const second = index * TRACE_SECONDS + TRACE_SECONDS / 2
    const seg = segments.find((s) => second >= s.start && second < s.end)
    if (!seg) return
    counted++
    const { low, high } = bandAt(seg, second)
    if (high !== null && value > high) above++
    else if (value < low && !EASY_KINDS.includes(seg.kind)) below++
    else inZone++
  })
  if (counted * TRACE_SECONDS < 5 * 60) return null
  const percentAbove = Math.round((100 * above) / counted)
  const percentBelow = Math.round((100 * below) / counted)
  return {
    seconds: counted * TRACE_SECONDS,
    percentAbove,
    percentBelow,
    percentInZone: Math.max(0, 100 - percentAbove - percentBelow),
  }
}

/** Für die Anzeige auf 30 s geglättet (Nachbarpunkte), Stillstand bleibt eine Lücke */
export function smoothTrace(trace: (number | null)[]): (number | null)[] {
  return trace.map((value, index) => {
    if (value === null) return null
    const around = [trace[index - 1], value, trace[index + 1]].filter(
      (v): v is number => v !== null && v !== undefined,
    )
    return Math.round(around.reduce((sum, v) => sum + v, 0) / around.length)
  })
}

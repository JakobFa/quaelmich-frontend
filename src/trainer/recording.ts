import type { TrainerValues } from './connection'

/** Ein Messpunkt je gefahrener Sekunde; second zählt ab dem Start (Pausen mitgezählt) */
export type RecordedSample = {
  second: number
  power: number | null
  cadence: number | null
  heartRate: number | null
}

export type Recording = { startedAt: string; samples: RecordedSample[] }

/**
 * Schreibt mit, solange das Training läuft. Die Sekunde kommt von der Uhrzeit, nicht vom Player-Timer:
 * so stimmen die Zeitstempel in der .fit-Datei auch nach einer Pause.
 */
export class RideRecorder {
  startedAt: number | null = null
  samples: RecordedSample[] = []

  constructor(saved?: Recording | null) {
    if (saved?.samples.length) {
      this.startedAt = Date.parse(saved.startedAt)
      this.samples = saved.samples
    }
  }

  /** Höchstens ein Punkt je Sekunde; ohne jeden Messwert wird nichts gespeichert */
  record(now: number, values: TrainerValues) {
    if (values.power === null && values.cadence === null && values.heartRate === null) return
    this.startedAt ??= now
    const second = Math.floor((now - this.startedAt) / 1000)
    const last = this.samples[this.samples.length - 1]
    if (last && second <= last.second) return
    this.samples.push({ second, ...values })
  }

  get hasData() {
    return this.samples.length > 0
  }

  toJSON(): Recording | null {
    return this.startedAt === null
      ? null
      : { startedAt: new Date(this.startedAt).toISOString(), samples: this.samples }
  }
}

export type RideSummary = {
  seconds: number
  avgPower: number | null
  normalizedPower: number | null
  avgCadence: number | null
  avgHeartRate: number | null
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null
}

/** NP: gleitender 30-s-Schnitt, vierte Potenz gemittelt (wie im Backend und bei TrainingPeaks) */
export function normalizedPower(power: number[]): number | null {
  const window = 30
  if (power.length < window) return null
  let sum = 0
  let fourth = 0
  for (let i = 0; i < power.length; i++) {
    sum += power[i]!
    if (i >= window) sum -= power[i - window]!
    if (i >= window - 1) fourth += (sum / window) ** 4
  }
  return Math.round((fourth / (power.length - window + 1)) ** 0.25)
}

export function summarize(samples: RecordedSample[]): RideSummary {
  const present = (key: 'power' | 'cadence' | 'heartRate') =>
    samples.map((s) => s[key]).filter((v): v is number => v !== null)
  const power = present('power')
  return {
    seconds: samples.length,
    avgPower: average(power),
    normalizedPower: normalizedPower(power),
    avgCadence: average(present('cadence').filter((rpm) => rpm > 0)),
    avgHeartRate: average(present('heartRate')),
  }
}

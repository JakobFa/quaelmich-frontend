import type { Athlete } from '../types/athlete'
import type { WorkoutStep } from '../types/workout'

/**
 * Pulsbereiche fürs Training ohne Wattmesser – dieselbe Logik wie im Backend (HeartRateTargets),
 * damit Anzeige und .fit-Datei übereinstimmen.
 */
export type HeartRateZones = {
  /** Beginn von Zone 2–5 in bpm */
  zoneStarts: number[]
  maxHeartRate: number
}

export type HeartRateRange = { zone: number; low: number; high: number }

/** Anteile des Maximalpulses, bei denen Zone 2–5 beginnen (wie bei Strava) */
const ZONE_SHARES_OF_MAX = [0.65, 0.81, 0.89, 0.97]
const ZONE_ONE_FLOOR = 60
/** Kürzere harte Abschnitte werden nach Gefühl gefahren – der Puls reagiert zu langsam */
export const MIN_SECONDS_FOR_TARGET = 120

/** Eigene Zonen, sonst aus dem Maximalpuls berechnet; null, wenn beides fehlt */
export function heartRateZonesOf(athlete: Athlete | null): HeartRateZones | null {
  if (!athlete) return null
  const own = athlete.heartRateZoneStarts
  if (own && own.length === 4) {
    const max = athlete.maxHeartRate ?? Math.round(own[3]! / ZONE_SHARES_OF_MAX[3]!)
    return { zoneStarts: own, maxHeartRate: Math.max(max, own[3]! + 1) }
  }
  if (!athlete.maxHeartRate) return null
  const max = athlete.maxHeartRate
  return {
    zoneStarts: ZONE_SHARES_OF_MAX.map((share) => Math.round(max * share)),
    maxHeartRate: max,
  }
}

/** Leistungszone nach Coggan → Pulszone 1–5 */
export function zoneFor(powerPercent: number): number {
  if (powerPercent < 56) return 1
  if (powerPercent < 76) return 2
  if (powerPercent < 91) return 3
  if (powerPercent < 106) return 4
  return 5
}

export function rangeFor(zones: HeartRateZones, zone: number): HeartRateRange {
  const low = zone === 1 ? ZONE_ONE_FLOOR : zones.zoneStarts[zone - 2]!
  const high = zone === 5 ? zones.maxHeartRate : zones.zoneStarts[zone - 1]! - 1
  return { zone, low, high }
}

/** Pulsbereich eines Abschnitts; null bei kurzen, harten Abschnitten */
export function targetForStep(zones: HeartRateZones, step: WorkoutStep): HeartRateRange | null {
  const zone = zoneFor((step.powerStartPercent + step.powerEndPercent) / 2)
  if (zone === 5 && step.durationSeconds < MIN_SECONDS_FOR_TARGET) return null
  return rangeFor(zones, zone)
}

export function formatRange(range: HeartRateRange): string {
  return `${range.low}–${range.high}`
}

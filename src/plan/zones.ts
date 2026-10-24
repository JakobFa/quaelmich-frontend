import { ref } from 'vue'

/**
 * Leistungszonen (in % FTP) mit den üblichen Farben von Zwift, TrainingPeaks & Co.:
 * grau, blau, grün, gelb, orange, rot, weinrot. Standard sind die Grenzen nach Coggan;
 * ambitionierte Fahrer können eigene eintragen (Beginn von Zone 2–7).
 */
export type PowerZone = { zone: number; name: string; color: string; from: number; upTo: number }

export const DEFAULT_POWER_ZONE_STARTS = [56, 76, 91, 106, 121, 151]

const ZONE_LOOK = [
  { name: 'Regeneration', color: '#8c9491' },
  { name: 'Grundlage', color: '#3b8eea' },
  { name: 'Tempo', color: '#35b86b' },
  { name: 'Schwelle', color: '#f4c430' },
  { name: 'VO2max', color: '#f5862b' },
  { name: 'Anaerob', color: '#e5403a' },
  { name: 'Sprint', color: '#b0306a' },
]

/** Eigene Zonen des angemeldeten Fahrers (gesetzt beim Laden des Profils), sonst null = Standard */
const ownStarts = ref<number[] | null>(null)

export function setPowerZoneStarts(starts: number[] | null | undefined) {
  ownStarts.value = starts?.length === 6 ? [...starts] : null
}

export function hasOwnPowerZones() {
  return ownStarts.value !== null
}

/** Alle sieben Zonen; ohne Angabe die eigenen (falls gesetzt) oder die Standardzonen */
export function powerZones(starts: number[] | null = ownStarts.value): PowerZone[] {
  const begins = [0, ...(starts ?? DEFAULT_POWER_ZONE_STARTS)]
  return ZONE_LOOK.map((look, index) => ({
    zone: index + 1,
    ...look,
    from: begins[index]!,
    upTo: index < 6 ? begins[index + 1]! - 1 : Infinity,
  }))
}

export function powerZoneFor(percent: number): PowerZone {
  const zones = powerZones()
  return zones.find((zone) => percent <= zone.upTo) ?? zones[zones.length - 1]!
}

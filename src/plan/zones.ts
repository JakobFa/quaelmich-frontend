/**
 * Klassische Leistungszonen nach Coggan (in % FTP) mit den üblichen Farben
 * von Zwift, TrainingPeaks & Co.: grau, blau, grün, gelb, orange, rot.
 */
export type PowerZone = { zone: number; name: string; color: string }

export const POWER_ZONES: (PowerZone & { upTo: number })[] = [
  { zone: 1, name: 'Regeneration', color: '#8c9491', upTo: 55 },
  { zone: 2, name: 'Grundlage', color: '#3b8eea', upTo: 75 },
  { zone: 3, name: 'Tempo', color: '#35b86b', upTo: 90 },
  { zone: 4, name: 'Schwelle', color: '#f4c430', upTo: 105 },
  { zone: 5, name: 'VO2max', color: '#f5862b', upTo: 120 },
  { zone: 6, name: 'Anaerob', color: '#e5403a', upTo: 150 },
  { zone: 7, name: 'Sprint', color: '#b0306a', upTo: Infinity },
]

export function powerZoneFor(percent: number): PowerZone {
  return POWER_ZONES.find((zone) => percent <= zone.upTo)!
}

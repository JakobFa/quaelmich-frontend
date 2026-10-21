import { describe, expect, it } from 'vitest'

import { heartRateZonesOf, rangeFor, targetForStep, zoneFor } from '../plan/heartRate'
import { emptyAthlete } from '../types/athlete'

describe('heartRate', () => {
  const zones = { zoneStarts: [123, 153, 168, 183], maxHeartRate: 189 }

  it('berechnet die Zonen aus dem Maximalpuls wie Strava', () => {
    const athlete = { ...emptyAthlete(), maxHeartRate: 189 }
    expect(heartRateZonesOf(athlete)).toEqual(zones)
  })

  it('nimmt eigene Zonen, wenn eingetragen', () => {
    const athlete = {
      ...emptyAthlete(),
      maxHeartRate: 189,
      heartRateZoneStarts: [120, 150, 165, 178],
    }
    expect(heartRateZonesOf(athlete)?.zoneStarts).toEqual([120, 150, 165, 178])
  })

  it('ordnet Leistung in % FTP einer Pulszone zu', () => {
    expect([50, 65, 88, 100, 120].map(zoneFor)).toEqual([1, 2, 3, 4, 5])
    expect(rangeFor(zones, 2)).toEqual({ zone: 2, low: 123, high: 152 })
    expect(rangeFor(zones, 5)).toEqual({ zone: 5, low: 183, high: 189 })
  })

  it('gibt kurzen, harten Abschnitten kein Pulsziel', () => {
    const sprint = {
      kind: 'INTERVAL' as const,
      durationSeconds: 60,
      powerStartPercent: 150,
      powerEndPercent: 150,
    }
    expect(targetForStep(zones, sprint)).toBeNull()
  })
})

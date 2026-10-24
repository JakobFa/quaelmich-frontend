import { afterEach, describe, expect, it } from 'vitest'

import { powerZoneFor, powerZones, setPowerZoneStarts } from '../plan/zones'

describe('Leistungszonen', () => {
  afterEach(() => setPowerZoneStarts(null))

  it('klassisch nach Coggan', () => {
    expect(powerZoneFor(55).zone).toBe(1)
    expect(powerZoneFor(68).zone).toBe(2)
    expect(powerZoneFor(105).zone).toBe(4)
    expect(powerZoneFor(170).zone).toBe(7)
  })

  it('nimmt eigene Zonen, sobald sie gesetzt sind', () => {
    setPowerZoneStarts([60, 80, 95, 110, 130, 160])

    expect(powerZoneFor(58).zone).toBe(1)
    expect(powerZoneFor(105).zone).toBe(4)
    expect(powerZones()[3]).toMatchObject({ from: 95, upTo: 109 })
  })

  it('ignoriert unvollständige Zonen', () => {
    setPowerZoneStarts([60, 80])
    expect(powerZoneFor(58).zone).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'

import {
  cadenceBetween,
  flatRoad,
  parseControlResponse,
  parseCyclingPower,
  parseHeartRate,
  parseIndoorBikeData,
  setTargetPower,
} from '../trainer/protocol'

const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer)

describe('Bluetooth-Protokoll der Trainer', () => {
  it('liest Watt und Trittfrequenz aus FTMS Indoor Bike Data', () => {
    // Flags 0x0044: Geschwindigkeit (Bit 0 nicht gesetzt), Trittfrequenz, Leistung
    // Geschwindigkeit 30,00 km/h = 3000, Trittfrequenz 90 rpm = 180 (Einheit 0,5), Leistung 250 W
    const data = view(0x44, 0x00, 0xb8, 0x0b, 0xb4, 0x00, 0xfa, 0x00)

    expect(parseIndoorBikeData(data)).toEqual({ cadence: 90, power: 250 })
  })

  it('überspringt Felder, die vor der Leistung stehen (wie beim KICKR)', () => {
    // Flags 0x0254: Geschw., Trittfrequenz, Strecke (3 Byte), Leistung, Puls
    // prettier-ignore
    const data = view(
      0x54, 0x02, // Flags
      0x10, 0x0e, // Geschwindigkeit
      0xa0, 0x00, // 80 rpm
      0x01, 0x02, 0x03, // Strecke
      0x2c, 0x01, // 300 W
      0x8c, // 140 bpm
    )

    expect(parseIndoorBikeData(data)).toEqual({ cadence: 80, power: 300, heartRate: 140 })
  })

  it('bricht bei zu kurzen Paketen ab, statt Unsinn zu lesen', () => {
    expect(parseIndoorBikeData(view(0x44, 0x00, 0xb8))).toEqual({})
    expect(parseIndoorBikeData(view(0x44))).toEqual({})
  })

  it('liest Cycling Power mit und ohne Kurbeldaten', () => {
    expect(parseCyclingPower(view(0x00, 0x00, 0xc8, 0x00))).toEqual({ power: 200 })
    // Flags 0x20: Kurbeldaten – 10 Umdrehungen, Zeitpunkt 2048 (= 2 s)
    expect(parseCyclingPower(view(0x20, 0x00, 0xc8, 0x00, 0x0a, 0x00, 0x00, 0x08))).toEqual({
      power: 200,
      crank: { revolutions: 10, time: 2048 },
    })
  })

  it('rechnet aus Kurbelumdrehungen die Trittfrequenz, auch wenn der Zähler überläuft', () => {
    // 3 Umdrehungen in 2 s = 90 rpm
    expect(cadenceBetween({ revolutions: 10, time: 1024 }, { revolutions: 13, time: 3072 })).toBe(
      90,
    )
    expect(cadenceBetween({ revolutions: 65535, time: 65000 }, { revolutions: 1, time: 828 })).toBe(
      90,
    )
    expect(cadenceBetween({ revolutions: 10, time: 1024 }, { revolutions: 10, time: 1024 })).toBe(
      null,
    )
  })

  it('liest den Puls in 8 und 16 Bit', () => {
    expect(parseHeartRate(view(0x00, 0x91))).toBe(145)
    expect(parseHeartRate(view(0x01, 0x2c, 0x01))).toBe(300)
    expect(parseHeartRate(view(0x00, 0x00))).toBe(null)
  })

  it('baut die Befehle für den Trainer', () => {
    expect([...setTargetPower(250)]).toEqual([0x05, 0xfa, 0x00])
    expect([...setTargetPower(1234.4)]).toEqual([0x05, 0xd2, 0x04])
    expect([...flatRoad()]).toEqual([0x11, 0, 0, 0, 0, 40, 51])
  })

  it('versteht die Antwort des Trainers', () => {
    expect(parseControlResponse(view(0x80, 0x05, 0x01))).toEqual({ command: 0x05, ok: true })
    expect(parseControlResponse(view(0x80, 0x00, 0x05))).toEqual({ command: 0x00, ok: false })
    expect(parseControlResponse(view(0x05, 0x00))).toBe(null)
  })
})

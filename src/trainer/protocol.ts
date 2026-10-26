/**
 * Die Bluetooth-Standards, die Smart-Trainer, Wattmesser und Pulsgurte sprechen – nur Bytes rein, Werte raus.
 *
 * - FTMS (Fitness Machine Service): fast alle aktuellen Trainer (KICKR, Tacx, Elite, Zwift Hub …).
 *   Liefert Watt und Trittfrequenz und lässt sich steuern (ERG = feste Wattzahl).
 * - Cycling Power: ältere Trainer und Wattmesser – nur messen, nicht steuern.
 * - Heart Rate: jeder Bluetooth-Pulsgurt.
 */

export const FTMS_SERVICE = 0x1826
export const INDOOR_BIKE_DATA = 0x2ad2
export const FTMS_CONTROL_POINT = 0x2ad9
export const CYCLING_POWER_SERVICE = 0x1818
export const CYCLING_POWER_MEASUREMENT = 0x2a63
export const HEART_RATE_SERVICE = 0x180d
export const HEART_RATE_MEASUREMENT = 0x2a37

export type Reading = { power?: number; cadence?: number; heartRate?: number }

/** Liest der Reihe nach; hört auf, wenn die Nachricht kürzer ist als angekündigt (kaputte Pakete) */
class Reader {
  offset: number
  constructor(
    private readonly view: DataView,
    start: number,
  ) {
    this.offset = start
  }
  has(bytes: number) {
    return this.offset + bytes <= this.view.byteLength
  }
  skip(bytes: number) {
    this.offset += bytes
  }
  uint8() {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }
  uint16() {
    const value = this.view.getUint16(this.offset, true)
    this.offset += 2
    return value
  }
  int16() {
    const value = this.view.getInt16(this.offset, true)
    this.offset += 2
    return value
  }
}

/** FTMS "Indoor Bike Data": welche Felder drin sind, steht in den Flag-Bits am Anfang */
export function parseIndoorBikeData(view: DataView): Reading {
  if (view.byteLength < 2) return {}
  const flags = view.getUint16(0, true)
  const read = new Reader(view, 2)
  const reading: Reading = {}
  // Bit 0 = "weitere Daten folgen": nur wenn es NICHT gesetzt ist, steht die Geschwindigkeit drin
  if (!(flags & 0x0001)) read.skip(2)
  if (flags & 0x0002) read.skip(2) // Durchschnittsgeschwindigkeit
  if (flags & 0x0004) {
    if (!read.has(2)) return reading
    reading.cadence = Math.round(read.uint16() / 2) // Einheit 0,5 rpm
  }
  if (flags & 0x0008) read.skip(2) // Durchschnitts-Trittfrequenz
  if (flags & 0x0010) read.skip(3) // Strecke
  if (flags & 0x0020) read.skip(2) // Widerstandsstufe
  if (flags & 0x0040) {
    if (!read.has(2)) return reading
    reading.power = Math.max(0, read.int16())
  }
  if (flags & 0x0080) read.skip(2) // Durchschnittsleistung
  if (flags & 0x0100) read.skip(5) // Energie
  if (flags & 0x0200 && read.has(1)) {
    const heartRate = read.uint8()
    if (heartRate > 0) reading.heartRate = heartRate
  }
  return reading
}

/** Kurbelumdrehungen bisher und Zeitpunkt der letzten (in 1/1024 s) – daraus wird die Trittfrequenz */
export type CrankEvent = { revolutions: number; time: number }

/** "Cycling Power Measurement": Watt immer, Kurbeldaten nur wenn das Gerät sie mitschickt */
export function parseCyclingPower(view: DataView): { power?: number; crank?: CrankEvent } {
  if (view.byteLength < 4) return {}
  const flags = view.getUint16(0, true)
  const power = Math.max(0, view.getInt16(2, true))
  const read = new Reader(view, 4)
  if (flags & 0x0001) read.skip(1) // Links/rechts-Verteilung
  if (flags & 0x0004) read.skip(2) // Drehmoment
  if (flags & 0x0010) read.skip(6) // Radumdrehungen
  if (flags & 0x0020 && read.has(4)) {
    return { power, crank: { revolutions: read.uint16(), time: read.uint16() } }
  }
  return { power }
}

/** Trittfrequenz zwischen zwei Kurbel-Ereignissen; null = seitdem keine neue Umdrehung */
export function cadenceBetween(before: CrankEvent, after: CrankEvent): number | null {
  const revolutions = (after.revolutions - before.revolutions) & 0xffff // Zähler laufen über
  const ticks = (after.time - before.time) & 0xffff
  if (ticks === 0 || revolutions === 0) return null
  const cadence = Math.round((revolutions * 60 * 1024) / ticks)
  return cadence <= 250 ? cadence : null
}

export function parseHeartRate(view: DataView): number | null {
  if (view.byteLength < 2) return null
  const wide = view.getUint8(0) & 0x01
  if (wide && view.byteLength < 3) return null
  const value = wide ? view.getUint16(1, true) : view.getUint8(1)
  return value > 0 ? value : null
}

// ---------- Befehle an den Trainer (FTMS Control Point) ----------

export const REQUEST_CONTROL = 0x00
export const SET_TARGET_POWER = 0x05
export const START_OR_RESUME = 0x07
export const STOP_OR_PAUSE = 0x08
export const SET_SIMULATION = 0x11

export const requestControl = () => new Uint8Array([REQUEST_CONTROL])
export const startOrResume = () => new Uint8Array([START_OR_RESUME])
export const pause = () => new Uint8Array([STOP_OR_PAUSE, 0x02])

export function setTargetPower(watts: number) {
  const command = new DataView(new ArrayBuffer(3))
  command.setUint8(0, SET_TARGET_POWER)
  command.setInt16(1, Math.round(watts), true)
  return new Uint8Array(command.buffer)
}

/** Ohne ERG: wie auf flacher Straße fahren (kein Wind, 0 % Steigung, normaler Rollwiderstand) */
export function flatRoad() {
  const command = new DataView(new ArrayBuffer(7))
  command.setUint8(0, SET_SIMULATION)
  command.setInt16(1, 0, true) // Wind in 0,001 m/s
  command.setInt16(3, 0, true) // Steigung in 0,01 %
  command.setUint8(5, 40) // Rollwiderstand 0,0040
  command.setUint8(6, 51) // Luftwiderstand 0,51 kg/m
  return new Uint8Array(command.buffer)
}

/** Antwort des Trainers auf einen Befehl: [0x80, Befehl, Ergebnis]; 0x01 = ausgeführt */
export function parseControlResponse(view: DataView): { command: number; ok: boolean } | null {
  if (view.byteLength < 3 || view.getUint8(0) !== 0x80) return null
  return { command: view.getUint8(1), ok: view.getUint8(2) === 0x01 }
}

import { reactive, readonly } from 'vue'

import {
  CYCLING_POWER_MEASUREMENT,
  CYCLING_POWER_SERVICE,
  FTMS_CONTROL_POINT,
  FTMS_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  INDOOR_BIKE_DATA,
  cadenceBetween,
  flatRoad,
  parseCyclingPower,
  parseHeartRate,
  parseIndoorBikeData,
  pause,
  requestControl,
  setTargetPower,
  startOrResume,
  type CrankEvent,
} from './protocol'
import {
  bluetooth,
  valueOf,
  type Bluetooth,
  type BluetoothDevice,
  type GattCharacteristic,
} from './webBluetooth'

export type DeviceStatus = 'none' | 'connecting' | 'connected' | 'reconnecting' | 'lost'

/** SMART = lässt sich steuern (ERG), POWER_ONLY = misst nur */
export type TrainerKind = 'SMART' | 'POWER_ONLY'

/** Ein Messwert ohne neue Daten seit so vielen ms gilt als weg (z. B. aufgehört zu treten) */
const STALE_MS = 3000
/** Angezeigte Watt: Schnitt der letzten 3 s, sonst springt die Zahl zu sehr */
const POWER_AVERAGE_MS = 3000
/** Wartezeiten zwischen den Versuchen, nach einem Abbruch neu zu verbinden (gut 1 Minute insgesamt) */
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000]

export type TrainerValues = {
  power: number | null
  cadence: number | null
  heartRate: number | null
}

/**
 * Verbindung zu Trainer und Pulsgurt – eine für die ganze App, damit sie beim Wechseln der Seite bleibt.
 * Bricht Bluetooth ab (Trainer kurz ohne Strom, Laptop zu weit weg), wird automatisch neu verbunden und das
 * letzte Ziel wieder gesetzt.
 */
export function createTrainerConnection(
  getBluetooth: () => Bluetooth | null = bluetooth,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
) {
  const state = reactive({
    trainerStatus: 'none' as DeviceStatus,
    trainerName: null as string | null,
    trainerKind: null as TrainerKind | null,
    heartRateStatus: 'none' as DeviceStatus,
    heartRateName: null as string | null,
    error: null as string | null,
    ...emptyValues(),
  })

  // ---------- Messwerte ----------

  let powerHistory: { at: number; watts: number }[] = []
  let cadence: { at: number; rpm: number } | null = null
  let lastCrank: { at: number; event: CrankEvent } | null = null
  let trainerHeartRate: { at: number; bpm: number } | null = null
  let strapHeartRate: { at: number; bpm: number } | null = null
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  function emptyValues(): TrainerValues {
    return { power: null, cadence: null, heartRate: null }
  }

  /** Aktuelle Werte; was zu lange nicht kam, ist null */
  function values(now = Date.now()): TrainerValues {
    powerHistory = powerHistory.filter((p) => now - p.at <= POWER_AVERAGE_MS)
    const fresh = <T extends { at: number }>(value: T | null) =>
      value && now - value.at <= STALE_MS ? value : null
    const recentPower = powerHistory.filter((p) => now - p.at <= STALE_MS)
    const heartRate = fresh(strapHeartRate) ?? fresh(trainerHeartRate)
    return {
      power: recentPower.length
        ? Math.round(recentPower.reduce((sum, p) => sum + p.watts, 0) / recentPower.length)
        : null,
      cadence: fresh(cadence)?.rpm ?? null,
      heartRate: heartRate?.bpm ?? null,
    }
  }

  function refresh() {
    Object.assign(state, values())
  }

  function startRefreshing() {
    refreshTimer ??= setInterval(refresh, 1000)
  }

  function stopRefreshingIfIdle() {
    if (state.trainerStatus === 'none' && state.heartRateStatus === 'none') {
      clearInterval(refreshTimer)
      refreshTimer = undefined
      Object.assign(state, emptyValues())
    }
  }

  function onIndoorBikeData(event: Event) {
    const view = valueOf(event)
    if (!view) return
    const reading = parseIndoorBikeData(view)
    const now = Date.now()
    if (reading.power !== undefined) powerHistory.push({ at: now, watts: reading.power })
    if (reading.cadence !== undefined) cadence = { at: now, rpm: reading.cadence }
    if (reading.heartRate !== undefined) trainerHeartRate = { at: now, bpm: reading.heartRate }
    refresh()
  }

  function onCyclingPower(event: Event) {
    const view = valueOf(event)
    if (!view) return
    const { power, crank } = parseCyclingPower(view)
    const now = Date.now()
    if (power !== undefined) powerHistory.push({ at: now, watts: power })
    if (crank) {
      const rpm = lastCrank ? cadenceBetween(lastCrank.event, crank) : null
      if (rpm !== null) cadence = { at: now, rpm }
      // ohne neue Umdrehung bleibt das alte Ereignis die Basis
      if (!lastCrank || rpm !== null) lastCrank = { at: now, event: crank }
    }
    refresh()
  }

  function onHeartRate(event: Event) {
    const view = valueOf(event)
    const bpm = view ? parseHeartRate(view) : null
    if (bpm !== null) strapHeartRate = { at: Date.now(), bpm }
    refresh()
  }

  // ---------- Steuerung (nur SMART) ----------

  let controlPoint: GattCharacteristic | null = null
  /** gewünschtes Ziel: Watt im ERG, null = frei fahren (flache Straße) */
  let wanted: number | null = null
  /** was der Trainer zuletzt bekommen hat; undefined = noch nichts */
  let sent: number | null | undefined = undefined
  /** vor dem Start und in der Pause bekommt der Trainer kein Ziel */
  let paused = true
  /** Bluetooth verträgt nur einen Befehl gleichzeitig – deshalb hintereinander */
  let queue: Promise<void> = Promise.resolve()

  function send(command: Uint8Array) {
    const target = controlPoint
    queue = queue
      .then(() => target?.writeValueWithResponse(command as Uint8Array<ArrayBuffer>))
      .catch(() => undefined) // ein verlorener Befehl wird beim nächsten Ziel ersetzt
    return queue
  }

  function sync() {
    if (!controlPoint || paused || wanted === sent) return
    sent = wanted
    void send(wanted === null ? flatRoad() : setTargetPower(wanted))
  }

  /** Ziel für den ERG-Modus; null = ERG aus, frei fahren */
  function setTarget(watts: number | null) {
    wanted = watts === null ? null : Math.max(0, Math.round(watts))
    sync()
  }

  function pauseTrainer() {
    if (paused) return
    paused = true
    sent = undefined
    if (controlPoint) void send(pause())
  }

  function resumeTrainer() {
    if (!paused) return
    paused = false
    sent = undefined
    if (controlPoint) void send(startOrResume())
    sync()
  }

  // ---------- Verbinden ----------

  /** Nach dem Neuverbinden liefert Chrome oft dieselben Objekte – dann nicht doppelt zuhören */
  const listening = new WeakSet<GattCharacteristic>()

  async function subscribe(characteristic: GattCharacteristic, handler: (event: Event) => void) {
    if (!listening.has(characteristic)) {
      characteristic.addEventListener('characteristicvaluechanged', handler)
      listening.add(characteristic)
    }
    await characteristic.startNotifications()
  }

  let trainerDevice: BluetoothDevice | null = null
  let heartRateDevice: BluetoothDevice | null = null

  /** Trainer verbinden: erst FTMS (steuerbar), sonst Cycling Power (nur messen) */
  async function setUpTrainer(device: BluetoothDevice) {
    const server = await device.gatt!.connect()
    try {
      const ftms = await server.getPrimaryService(FTMS_SERVICE)
      const data = await ftms.getCharacteristic(INDOOR_BIKE_DATA)
      await subscribe(data, onIndoorBikeData)
      const control = await ftms.getCharacteristic(FTMS_CONTROL_POINT)
      // die Antworten kommen als Indication – ohne Abo nimmt der Trainer keine Befehle an
      await control.startNotifications()
      controlPoint = control
      state.trainerKind = 'SMART'
      await send(requestControl())
      sent = undefined
      if (!paused) {
        await send(startOrResume())
        sync()
      }
      return
    } catch {
      controlPoint = null
    }
    const power = await server.getPrimaryService(CYCLING_POWER_SERVICE)
    const measurement = await power.getCharacteristic(CYCLING_POWER_MEASUREMENT)
    await subscribe(measurement, onCyclingPower)
    state.trainerKind = 'POWER_ONLY'
  }

  async function setUpHeartRate(device: BluetoothDevice) {
    const server = await device.gatt!.connect()
    const service = await server.getPrimaryService(HEART_RATE_SERVICE)
    const measurement = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
    await subscribe(measurement, onHeartRate)
  }

  /** Nach einem Abbruch: ein paar Mal mit wachsender Pause neu versuchen */
  async function reconnect(
    device: BluetoothDevice,
    isCurrent: () => boolean,
    setUp: (device: BluetoothDevice) => Promise<void>,
    setStatus: (status: DeviceStatus) => void,
  ) {
    setStatus('reconnecting')
    for (const delay of RECONNECT_DELAYS_MS) {
      await sleep(delay)
      if (!isCurrent()) return
      try {
        await setUp(device)
        if (isCurrent()) setStatus('connected')
        return
      } catch {
        // nächster Versuch
      }
    }
    if (isCurrent()) setStatus('lost')
  }

  function setTrainerStatus(status: DeviceStatus) {
    state.trainerStatus = status
  }

  function setHeartRateStatus(status: DeviceStatus) {
    state.heartRateStatus = status
  }

  function friendlyError(error: unknown) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotFoundError') return null // Auswahl abgebrochen – kein Fehler
    if (name === 'SecurityError') return 'Bluetooth ist für diese Seite gesperrt.'
    return 'Verbinden hat nicht geklappt. Ist das Gerät an und nicht mit Zwift oder der Wahoo-App verbunden?'
  }

  async function connectTrainer() {
    const api = getBluetooth()
    if (!api) return
    state.error = null
    let device: BluetoothDevice
    try {
      device = await api.requestDevice({
        filters: [{ services: [FTMS_SERVICE] }, { services: [CYCLING_POWER_SERVICE] }],
        optionalServices: [FTMS_SERVICE, CYCLING_POWER_SERVICE],
      })
    } catch (error) {
      state.error = friendlyError(error)
      return
    }
    disconnectTrainer()
    trainerDevice = device
    state.trainerName = device.name ?? 'Trainer'
    state.trainerStatus = 'connecting'
    device.addEventListener('gattserverdisconnected', () => {
      if (trainerDevice !== device) return
      controlPoint = null
      void reconnect(device, () => trainerDevice === device, setUpTrainer, setTrainerStatus)
    })
    try {
      await setUpTrainer(device)
      state.trainerStatus = 'connected'
      startRefreshing()
    } catch (error) {
      trainerDevice = null
      state.trainerStatus = 'none'
      state.trainerKind = null
      state.error = friendlyError(error) ?? 'Verbinden hat nicht geklappt.'
    }
  }

  async function connectHeartRate() {
    const api = getBluetooth()
    if (!api) return
    state.error = null
    let device: BluetoothDevice
    try {
      device = await api.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] })
    } catch (error) {
      state.error = friendlyError(error)
      return
    }
    disconnectHeartRate()
    heartRateDevice = device
    state.heartRateName = device.name ?? 'Pulsgurt'
    state.heartRateStatus = 'connecting'
    device.addEventListener('gattserverdisconnected', () => {
      if (heartRateDevice !== device) return
      void reconnect(device, () => heartRateDevice === device, setUpHeartRate, setHeartRateStatus)
    })
    try {
      await setUpHeartRate(device)
      state.heartRateStatus = 'connected'
      startRefreshing()
    } catch (error) {
      heartRateDevice = null
      state.heartRateStatus = 'none'
      state.error = friendlyError(error) ?? 'Verbinden hat nicht geklappt.'
    }
  }

  function disconnectTrainer() {
    const device = trainerDevice
    trainerDevice = null // zuerst, damit der Abbruch nicht als Verbindungsverlust zählt
    controlPoint = null
    sent = undefined
    device?.gatt?.disconnect()
    powerHistory = []
    cadence = null
    lastCrank = null
    trainerHeartRate = null
    state.trainerStatus = 'none'
    state.trainerName = null
    state.trainerKind = null
    stopRefreshingIfIdle()
    refresh()
  }

  function disconnectHeartRate() {
    const device = heartRateDevice
    heartRateDevice = null
    device?.gatt?.disconnect()
    strapHeartRate = null
    state.heartRateStatus = 'none'
    state.heartRateName = null
    stopRefreshingIfIdle()
    refresh()
  }

  return {
    state: readonly(state),
    isSupported: () => getBluetooth() !== null,
    values,
    connectTrainer,
    connectHeartRate,
    disconnectTrainer,
    disconnectHeartRate,
    setTarget,
    pauseTrainer,
    resumeTrainer,
  }
}

export type TrainerConnection = ReturnType<typeof createTrainerConnection>

export const trainer = createTrainerConnection()

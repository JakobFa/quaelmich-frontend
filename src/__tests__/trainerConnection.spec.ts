import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTrainerConnection } from '../trainer/connection'
import {
  CYCLING_POWER_MEASUREMENT,
  CYCLING_POWER_SERVICE,
  FTMS_CONTROL_POINT,
  FTMS_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  INDOOR_BIKE_DATA,
} from '../trainer/protocol'
import type { Bluetooth, GattCharacteristic } from '../trainer/webBluetooth'

/** Ein Trainer zum Anfassen: merkt sich Befehle und kann Messwerte schicken oder die Verbindung verlieren */
function fakeDevice(name: string, services: Record<number, number[]>) {
  const listeners = new Map<number, (event: Event) => void>()
  const commands: number[][] = []
  let connected = false
  let failConnects = 0
  let onDisconnect = () => {}

  const characteristic = (uuid: number): GattCharacteristic => {
    const self: GattCharacteristic & { value?: DataView } = {
      startNotifications: async () => self,
      writeValueWithResponse: async (value) => {
        commands.push([...new Uint8Array(value as ArrayBuffer)])
      },
      addEventListener: (_type, listener) => listeners.set(uuid, listener),
    }
    return self
  }
  const characteristics = new Map<number, GattCharacteristic>()
  const server = {
    get connected() {
      return connected
    },
    connect: async () => {
      if (failConnects > 0) {
        failConnects--
        throw new Error('weg')
      }
      connected = true
      return server
    },
    disconnect: () => {
      connected = false
    },
    getPrimaryService: async (uuid: number) => {
      const chars = services[uuid]
      if (!chars) throw new DOMException('kein Dienst', 'NotFoundError')
      return {
        getCharacteristic: async (char: number) => {
          if (!chars.includes(char)) throw new Error('keine Eigenschaft')
          if (!characteristics.has(char)) characteristics.set(char, characteristic(char))
          return characteristics.get(char)!
        },
      }
    },
  }
  return {
    device: {
      name,
      gatt: server,
      addEventListener: (_type: string, listener: () => void) => {
        onDisconnect = listener
      },
    },
    commands,
    /** Messung vom Gerät */
    notify(uuid: number, ...bytes: number[]) {
      const target = characteristics.get(uuid) as { value?: DataView }
      target.value = new DataView(new Uint8Array(bytes).buffer)
      listeners.get(uuid)?.({ target } as unknown as Event)
    },
    drop(failingAttempts = 0) {
      connected = false
      failConnects = failingAttempts
      onDisconnect()
    },
  }
}

const smartTrainer = () =>
  fakeDevice('KICKR CORE', {
    [FTMS_SERVICE]: [INDOOR_BIKE_DATA, FTMS_CONTROL_POINT],
    [CYCLING_POWER_SERVICE]: [CYCLING_POWER_MEASUREMENT],
  })

function setUp(devices: ReturnType<typeof fakeDevice>[]) {
  const queue = [...devices]
  const api: Bluetooth = { requestDevice: vi.fn(async () => queue.shift()!.device) }
  const sleep = vi.fn(async () => {})
  return { connection: createTrainerConnection(() => api, sleep), api, sleep }
}

/** alle offenen Promises (Befehls-Warteschlange) abarbeiten */
const settle = () => new Promise((done) => setTimeout(done, 0))

describe('Trainer-Verbindung', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-26T17:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verbindet einen Smart-Trainer per FTMS und übernimmt die Steuerung', async () => {
    const kickr = smartTrainer()
    const { connection } = setUp([kickr])

    await connection.connectTrainer()
    await settle()

    expect(connection.state.trainerStatus).toBe('connected')
    expect(connection.state.trainerKind).toBe('SMART')
    expect(connection.state.trainerName).toBe('KICKR CORE')
    expect(kickr.commands).toEqual([[0x00]]) // Steuerung anfordern – noch kein Ziel
  })

  it('setzt im ERG das Ziel erst beim Start und nur, wenn es sich ändert', async () => {
    const kickr = smartTrainer()
    const { connection } = setUp([kickr])
    await connection.connectTrainer()

    connection.setTarget(200)
    await settle()
    expect(kickr.commands).toEqual([[0x00]]) // vor dem Start nichts

    connection.resumeTrainer()
    connection.setTarget(200)
    connection.setTarget(200.2)
    await settle()
    expect(kickr.commands).toEqual([[0x00], [0x07], [0x05, 200, 0]])

    connection.setTarget(null) // ERG aus → flache Straße
    connection.pauseTrainer()
    await settle()
    expect(kickr.commands.slice(3)).toEqual([
      [0x11, 0, 0, 0, 0, 40, 51],
      [0x08, 0x02],
    ])
  })

  it('zeigt Watt als 3-s-Schnitt und vergisst Werte, die nicht mehr kommen', async () => {
    const kickr = smartTrainer()
    const { connection } = setUp([kickr])
    await connection.connectTrainer()

    kickr.notify(INDOOR_BIKE_DATA, 0x44, 0x00, 0, 0, 180, 0, 200, 0) // 90 rpm, 200 W
    vi.advanceTimersByTime(1000)
    kickr.notify(INDOOR_BIKE_DATA, 0x44, 0x00, 0, 0, 180, 0, 220, 0) // 220 W
    expect(connection.state.power).toBe(210)
    expect(connection.state.cadence).toBe(90)

    vi.advanceTimersByTime(4000) // aufgehört zu treten
    expect(connection.state.power).toBe(null)
    expect(connection.state.cadence).toBe(null)
  })

  it('nimmt ältere Trainer ohne FTMS als reinen Wattmesser', async () => {
    const old = fakeDevice('Alter Trainer', {
      [CYCLING_POWER_SERVICE]: [CYCLING_POWER_MEASUREMENT],
    })
    const { connection } = setUp([old])

    await connection.connectTrainer()
    old.notify(CYCLING_POWER_MEASUREMENT, 0x20, 0x00, 150, 0, 10, 0, 0x00, 0x04) // 150 W, 10 Umdr.
    vi.advanceTimersByTime(2000)
    old.notify(CYCLING_POWER_MEASUREMENT, 0x20, 0x00, 150, 0, 13, 0, 0x00, 0x0c) // +3 in 2 s

    expect(connection.state.trainerKind).toBe('POWER_ONLY')
    expect(connection.state.power).toBe(150)
    expect(connection.state.cadence).toBe(90)
  })

  it('nimmt den Puls vom Gurt lieber als den vom Trainer', async () => {
    const kickr = smartTrainer()
    const strap = fakeDevice('HRM-Pro', { [HEART_RATE_SERVICE]: [HEART_RATE_MEASUREMENT] })
    const { connection } = setUp([kickr, strap])
    await connection.connectTrainer()
    await connection.connectHeartRate()

    kickr.notify(INDOOR_BIKE_DATA, 0x40, 0x02, 0, 0, 200, 0, 130) // Trainer meldet 130 bpm
    strap.notify(HEART_RATE_MEASUREMENT, 0x00, 142)

    expect(connection.state.heartRateStatus).toBe('connected')
    expect(connection.state.heartRate).toBe(142)
  })

  it('verbindet nach einem Abbruch neu und setzt das letzte Ziel wieder', async () => {
    const kickr = smartTrainer()
    const { connection, sleep } = setUp([kickr])
    await connection.connectTrainer()
    connection.resumeTrainer()
    connection.setTarget(250)
    await settle()
    kickr.commands.length = 0

    kickr.drop(2) // die ersten zwei Versuche scheitern
    expect(connection.state.trainerStatus).toBe('reconnecting')
    await settle()
    await settle()

    expect(sleep).toHaveBeenCalledTimes(3)
    expect(connection.state.trainerStatus).toBe('connected')
    expect(kickr.commands).toEqual([[0x00], [0x07], [0x05, 250, 0]])
  })

  it('gibt nach mehreren Fehlversuchen auf', async () => {
    const kickr = smartTrainer()
    const { connection } = setUp([kickr])
    await connection.connectTrainer()

    kickr.drop(99)
    for (let i = 0; i < 10; i++) await settle()

    expect(connection.state.trainerStatus).toBe('lost')
  })

  it('zählt Trennen nicht als Verbindungsabbruch', async () => {
    const kickr = smartTrainer()
    const { connection, sleep } = setUp([kickr])
    await connection.connectTrainer()

    connection.disconnectTrainer()
    kickr.drop()
    await settle()

    expect(connection.state.trainerStatus).toBe('none')
    expect(sleep).not.toHaveBeenCalled()
  })

  it('meldet abgebrochene Auswahl nicht als Fehler', async () => {
    const api: Bluetooth = {
      requestDevice: async () => {
        throw new DOMException('abgebrochen', 'NotFoundError')
      },
    }
    const connection = createTrainerConnection(() => api)

    await connection.connectTrainer()

    expect(connection.state.trainerStatus).toBe('none')
    expect(connection.state.error).toBe(null)
  })

  it('weiß, wenn der Browser kein Bluetooth kann', () => {
    expect(createTrainerConnection(() => null).isSupported()).toBe(false)
  })
})

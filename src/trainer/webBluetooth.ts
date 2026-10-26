/**
 * Das Stück Web Bluetooth, das wir brauchen. TypeScript bringt dafür keine Typen mit (die API gibt es nur in
 * Chrome und Edge), deshalb hier von Hand – bewusst klein gehalten.
 */

export type GattCharacteristic = {
  readonly value?: DataView
  startNotifications(): Promise<GattCharacteristic>
  writeValueWithResponse(value: BufferSource): Promise<void>
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
}

export type GattService = {
  getCharacteristic(uuid: number): Promise<GattCharacteristic>
}

export type GattServer = {
  readonly connected: boolean
  connect(): Promise<GattServer>
  disconnect(): void
  getPrimaryService(uuid: number): Promise<GattService>
}

export type BluetoothDevice = {
  readonly name?: string
  readonly gatt?: GattServer
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void
}

export type RequestDeviceOptions = {
  filters: { services: number[] }[]
  optionalServices?: number[]
}

export type Bluetooth = {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
}

export function bluetooth(): Bluetooth | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { bluetooth?: Bluetooth }).bluetooth ?? null
}

/** Der neue Wert einer Messung aus dem Event */
export function valueOf(event: Event): DataView | null {
  return (event.target as GattCharacteristic | null)?.value ?? null
}

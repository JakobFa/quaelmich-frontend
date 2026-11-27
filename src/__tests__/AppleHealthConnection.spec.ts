import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import AppleHealthConnection from '../components/AppleHealthConnection.vue'
import type { HealthStatus } from '../api'

const api = vi.hoisted(() => ({
  getHealthStatus: vi.fn<() => Promise<HealthStatus>>(),
  createHealthKey: vi.fn<() => Promise<{ key: string }>>(),
  endHealthConnection: vi.fn<() => Promise<void>>(),
  healthUploadUrl: () => 'https://api.example.test/health-data',
}))
vi.mock('../api', () => api)

const notConnected: HealthStatus = {
  connected: false,
  lastChars: null,
  lastUploadAt: null,
  days: [],
}
const connected: HealthStatus = {
  connected: true,
  lastChars: 'wxyz',
  lastUploadAt: '2026-11-27T20:30:00Z',
  days: [
    {
      date: '2026-11-27',
      sleepMinutes: 450,
      steps: 8432,
      activeEnergyKcal: 512,
      restingHeartRate: 52,
      hrvMs: 61,
    },
  ],
}

describe('AppleHealthConnection', () => {
  beforeEach(() => {
    Object.values(api).forEach(
      (fn) => typeof fn === 'function' && 'mockReset' in fn && fn.mockReset(),
    )
  })

  it('erzeugt den Schlüssel erst nach der Einwilligung und zeigt ihn mit Anleitung', async () => {
    api.getHealthStatus.mockResolvedValueOnce(notConnected).mockResolvedValue(connected)
    api.createHealthKey.mockResolvedValue({ key: 'geheim-wxyz' })
    const wrapper = mount(AppleHealthConnection)
    await flushPromises()

    const button = wrapper.find('button.button')
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.find('[data-test="health-consent"]').setValue(true)
    await button.trigger('click')
    await flushPromises()

    expect(api.createHealthKey).toHaveBeenCalled()
    expect(wrapper.find('[data-test="health-key"]').text()).toBe('geheim-wxyz')
    expect(wrapper.find('[data-test="health-url"]').text()).toBe(
      'https://api.example.test/health-data',
    )
    expect(wrapper.find('[data-test="health-guide"]').text()).toContain('X-Health-Key')
  })

  it('zeigt empfangene Tage und lässt die Verbindung samt Daten beenden', async () => {
    api.getHealthStatus.mockResolvedValueOnce(connected).mockResolvedValue(notConnected)
    api.endHealthConnection.mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(AppleHealthConnection)
    await flushPromises()

    expect(wrapper.find('[data-test="health-connected"]').text()).toContain('…wxyz')
    const table = wrapper.find('[data-test="health-days"]').text()
    expect(table).toContain('7:30 h')
    expect(table).toContain('8.432')
    expect(wrapper.find('[data-test="health-key"]').exists()).toBe(false)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Beenden und Daten löschen')!
      .trigger('click')
    await flushPromises()

    expect(api.endHealthConnection).toHaveBeenCalled()
    expect(wrapper.find('[data-test="health-consent"]').exists()).toBe(true)
  })
})

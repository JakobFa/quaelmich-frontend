import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import HealthPanel from '../components/HealthPanel.vue'
import type { HealthStatus } from '../api'

const api = vi.hoisted(() => ({
  getHealthStatus: vi.fn<() => Promise<HealthStatus>>(),
  enableHealthImport: vi.fn<() => Promise<HealthStatus>>(),
  importHealthNow: vi.fn<() => Promise<HealthStatus>>(),
  disableHealthImport: vi.fn<() => Promise<void>>(),
  shareHealthWithAi: vi.fn<(share: boolean) => Promise<HealthStatus>>(),
}))
vi.mock('../api', () => api)

const base = { consentAt: null, lastImportAt: null, sharedWithAi: false, days: [] }
const noIntervals: HealthStatus = { ...base, intervalsConnected: false, importEnabled: false }
const off: HealthStatus = { ...base, intervalsConnected: true, importEnabled: false }
const on: HealthStatus = {
  intervalsConnected: true,
  importEnabled: true,
  consentAt: '2026-11-27T09:00:00Z',
  lastImportAt: '2026-11-27T09:00:00Z',
  sharedWithAi: false,
  days: [
    {
      date: '2026-11-27',
      sleepMinutes: 450,
      sleepScore: 82,
      steps: 9500,
      activeEnergyKcal: null,
      restingHeartRate: 48,
      hrvMs: null,
      hrvSdnnMs: 45,
    },
  ],
}

describe('HealthPanel', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
  })

  it('verweist ohne intervals.icu auf die Verbindung', async () => {
    api.getHealthStatus.mockResolvedValue(noIntervals)
    const wrapper = mount(HealthPanel)
    await flushPromises()

    expect(wrapper.find('[data-test="health-needs-intervals"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="health-consent"]').exists()).toBe(false)
  })

  it('schaltet die Übernahme erst nach der Einwilligung ein und zeigt die Tage', async () => {
    api.getHealthStatus.mockResolvedValue(off)
    api.enableHealthImport.mockResolvedValue(on)
    const wrapper = mount(HealthPanel)
    await flushPromises()

    const button = wrapper.find('button.button')
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.find('[data-test="health-consent"]').setValue(true)
    await button.trigger('click')
    await flushPromises()

    expect(api.enableHealthImport).toHaveBeenCalled()
    const table = wrapper.find('[data-test="health-days"]').text()
    expect(table).toContain('7:30 h')
    expect(table).toContain('82')
    expect(table).toContain('45 ms*')
    expect(table).toContain('9.500')
  })

  it('beendet die Übernahme samt Daten', async () => {
    api.getHealthStatus.mockResolvedValueOnce(on).mockResolvedValue(off)
    api.disableHealthImport.mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(HealthPanel)
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Beenden und Daten löschen')!
      .trigger('click')
    await flushPromises()

    expect(api.disableHealthImport).toHaveBeenCalled()
    expect(wrapper.find('[data-test="health-consent"]').exists()).toBe(true)
  })

  it('gibt Schlaf & Erholung erst nach eigener Einwilligung für die KI frei', async () => {
    api.getHealthStatus.mockResolvedValue(on)
    api.shareHealthWithAi.mockResolvedValue({ ...on, sharedWithAi: true })
    const wrapper = mount(HealthPanel)
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text() === 'Für meine KI freigeben')!
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.find('[data-test="health-ai-consent"]').setValue(true)
    await button.trigger('click')
    await flushPromises()

    expect(api.shareHealthWithAi).toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-test="health-ai"]').text()).toContain('Für deine KI freigegeben')
  })
})

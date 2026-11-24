import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import AiModeBanner from '../components/AiModeBanner.vue'

const { getAiMode } = vi.hoisted(() => ({
  getAiMode: vi.fn<() => Promise<{ enabled: boolean }>>(),
}))
vi.mock('../api', () => ({ getAiMode }))

const stubs = { RouterLink: { template: '<a><slot /></a>' } }

describe('AiModeBanner', () => {
  beforeEach(() => {
    getAiMode.mockReset()
  })

  it('zeigt den Hinweis bei eingeschaltetem KI-Modus', async () => {
    getAiMode.mockResolvedValue({ enabled: true })
    const wrapper = mount(AiModeBanner, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="ai-mode-banner"]').text()).toContain('KI-Modus an')
  })

  it('zeigt nichts bei ausgeschaltetem KI-Modus', async () => {
    getAiMode.mockResolvedValue({ enabled: false })
    const wrapper = mount(AiModeBanner, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="ai-mode-banner"]').exists()).toBe(false)
  })

  it('zeigt nichts, wenn die Abfrage fehlschlägt', async () => {
    getAiMode.mockRejectedValue(new Error('404'))
    const wrapper = mount(AiModeBanner, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-test="ai-mode-banner"]').exists()).toBe(false)
  })
})

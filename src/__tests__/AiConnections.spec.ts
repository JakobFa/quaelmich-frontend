import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import AiConnections from '../components/AiConnections.vue'
import type { AiConnection } from '../api'

const { listAiConnections, revokeAiConnection, getAiMode, setAiMode } = vi.hoisted(() => ({
  listAiConnections: vi.fn<() => Promise<AiConnection[]>>(),
  revokeAiConnection: vi.fn<(id: number) => Promise<void>>(),
  getAiMode: vi.fn<() => Promise<{ enabled: boolean }>>(),
  setAiMode: vi.fn<(enabled: boolean) => Promise<{ enabled: boolean }>>(),
}))
vi.mock('../api', () => ({
  listAiConnections,
  revokeAiConnection,
  getAiMode,
  setAiMode,
  mcpUrl: () => 'https://api.example.test/mcp',
}))

const connection: AiConnection = {
  id: 4,
  clientName: 'Claude',
  scope: 'plan:read',
  createdAt: '2026-11-04T10:00:00Z',
  lastUsedAt: null,
}

describe('AiConnections', () => {
  beforeEach(() => {
    listAiConnections.mockReset()
    revokeAiConnection.mockReset()
    getAiMode.mockReset()
    setAiMode.mockReset()
    getAiMode.mockResolvedValue({ enabled: true })
  })

  it('zeigt bei ausgeschaltetem KI-Modus keine Adresse und keine Verbindungen', async () => {
    getAiMode.mockResolvedValue({ enabled: false })
    const wrapper = mount(AiConnections)
    await flushPromises()

    expect(wrapper.find('[data-test="mcp-url"]').exists()).toBe(false)
    expect(listAiConnections).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="ai-mode-toggle"]').text()).toBe('KI-Modus einschalten')
  })

  it('schaltet den KI-Modus ein und zeigt dann die Adresse', async () => {
    getAiMode.mockResolvedValue({ enabled: false })
    setAiMode.mockResolvedValue({ enabled: true })
    listAiConnections.mockResolvedValue([])
    const wrapper = mount(AiConnections)
    await flushPromises()

    await wrapper.find('[data-test="ai-mode-toggle"]').trigger('click')
    await flushPromises()

    expect(setAiMode).toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-test="mcp-url"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ai-mode-toggle"]').text()).toBe('KI-Modus ausschalten')
  })

  it('schaltet den KI-Modus aus und blendet Adresse und Verbindungen aus', async () => {
    listAiConnections.mockResolvedValue([connection])
    setAiMode.mockResolvedValue({ enabled: false })
    const wrapper = mount(AiConnections)
    await flushPromises()
    expect(wrapper.find('[data-test="connections"]').exists()).toBe(true)

    await wrapper.find('[data-test="ai-mode-toggle"]').trigger('click')
    await flushPromises()

    expect(setAiMode).toHaveBeenCalledWith(false)
    expect(wrapper.find('[data-test="mcp-url"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="connections"]').exists()).toBe(false)
  })

  it('zeigt die Adresse für den Konnektor', async () => {
    listAiConnections.mockResolvedValue([])
    const wrapper = mount(AiConnections)
    await flushPromises()

    expect(wrapper.find('[data-test="mcp-url"]').text()).toBe('https://api.example.test/mcp')
    expect(wrapper.find('[data-test="ai-mode-frozen"]').text()).toContain('nicht mehr von selbst')
    expect(wrapper.find('[data-test="ai-rides-hint"]').text()).toContain('Strava-Konnektor')
    expect(wrapper.text()).toContain('Noch keine KI-App verbunden')
  })

  it('listet verbundene KI-Apps und beendet eine', async () => {
    listAiConnections.mockResolvedValue([connection])
    revokeAiConnection.mockResolvedValue()
    const wrapper = mount(AiConnections)
    await flushPromises()

    const list = wrapper.find('[data-test="connections"]')
    expect(list.text()).toContain('Claude')
    expect(list.text()).toContain('liest Trainingsplan')
    expect(list.text()).toContain('noch nie')

    await list.find('button').trigger('click')
    await flushPromises()

    expect(revokeAiConnection).toHaveBeenCalledWith(4)
    expect(wrapper.find('[data-test="connections"]').exists()).toBe(false)
  })
})

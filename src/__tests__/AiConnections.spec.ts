import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import AiConnections from '../components/AiConnections.vue'
import type { AiConnection } from '../api'

const { listAiConnections, revokeAiConnection } = vi.hoisted(() => ({
  listAiConnections: vi.fn<() => Promise<AiConnection[]>>(),
  revokeAiConnection: vi.fn<(id: number) => Promise<void>>(),
}))
vi.mock('../api', () => ({
  listAiConnections,
  revokeAiConnection,
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
  })

  it('zeigt die Adresse für den Konnektor', async () => {
    listAiConnections.mockResolvedValue([])
    const wrapper = mount(AiConnections)
    await flushPromises()

    expect(wrapper.find('[data-test="mcp-url"]').text()).toBe('https://api.example.test/mcp')
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

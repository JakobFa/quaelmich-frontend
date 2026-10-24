import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'
import { endSession, startSession } from '../auth'

describe('App', () => {
  it('mounts renders properly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    )
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.find('img.logo').attributes('alt')).toBe('quaelmich')
    expect(wrapper.text()).toContain('Plan erstellen')
  })

  it('das Logo führt angemeldet zum Plan, sonst zur Startseite', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    )
    endSession()
    const guest = mount(App, { global: { plugins: [router] } })
    expect(guest.find('a.stage').attributes('href')).toBe('/')

    startSession('abc.def.ghi', 'lina@example.com')
    const user = mount(App, { global: { plugins: [router] } })
    expect(user.find('a.stage').attributes('href')).toBe('/plan')
    endSession()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import StravaConnection from '../components/StravaConnection.vue'
import { stravaAuthorizeUrl } from '../strava/oauth'

function backend(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })),
  )
}

const base = { clientId: '12345', athleteName: null, connectedAt: null }

describe('StravaConnection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('ist unsichtbar, solange Strava auf dem Server nicht eingerichtet ist', async () => {
    backend({ ...base, available: false, clientId: null, connected: false })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.text()).toBe('')
  })

  it('zeigt den Strava-Button, solange nicht verbunden', async () => {
    backend({ ...base, available: true, connected: false })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.find('.strava-button').text()).toBe('Connect with Strava')
    expect(wrapper.text()).toContain('Powered by Strava')
  })

  it('zeigt, mit wem verbunden ist', async () => {
    backend({ ...base, available: true, connected: true, athleteName: 'Jakob' })
    const wrapper = mount(StravaConnection)
    await flushPromises()

    expect(wrapper.text()).toContain('Verbunden als Jakob')
    expect(wrapper.find('.strava-button').exists()).toBe(false)
  })

  it('leitet mit Rücksprung-Adresse und Leserecht zu Strava weiter', () => {
    const url = new URL(stravaAuthorizeUrl('12345', 'https://quaelmich.test', 'zufall'))

    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('12345')
    expect(url.searchParams.get('redirect_uri')).toBe('https://quaelmich.test/strava/callback')
    expect(url.searchParams.get('scope')).toBe('activity:read_all')
    expect(url.searchParams.get('state')).toBe('zufall')
  })
})

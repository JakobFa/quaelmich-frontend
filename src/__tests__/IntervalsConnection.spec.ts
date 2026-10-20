import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import IntervalsConnection from '../components/IntervalsConnection.vue'

type FakeResponse = { status: number; body?: unknown }

/** Antwortet der Reihe nach mit den angegebenen Antworten und merkt sich die Anfragen. */
function backend(...responses: FakeResponse[]) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(() => {
    const next = responses.shift() ?? { status: 500 }
    return Promise.resolve({
      ok: next.status < 400,
      status: next.status,
      json: () => Promise.resolve(next.body ?? {}),
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const disconnected = { connected: false, intervalsAthleteId: null, connectedAt: null }
const connected = {
  connected: true,
  intervalsAthleteId: 'i42',
  connectedAt: '2026-10-20T10:00:00Z',
}

describe('IntervalsConnection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('zeigt das Formular, solange nicht verbunden', async () => {
    backend({ status: 200, body: disconnected })
    const wrapper = mount(IntervalsConnection)
    await flushPromises()

    expect(wrapper.find('input[type=password]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Developer Settings')
  })

  it('verbindet und leert danach das Schlüsselfeld', async () => {
    const fetchMock = backend({ status: 200, body: disconnected }, { status: 200, body: connected })
    const wrapper = mount(IntervalsConnection)
    await flushPromises()

    await wrapper.find('input[type=password]').setValue('mein-schluessel')
    await wrapper.find('input[type=text]').setValue('i42')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const [, init] = fetchMock.mock.calls[1]!
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual({
      apiKey: 'mein-schluessel',
      athleteId: 'i42',
    })
    expect(wrapper.text()).toContain('Verbunden mit i42')
    expect(wrapper.find('input[type=password]').exists()).toBe(false)
  })

  it('erklärt, wenn intervals.icu den Schlüssel ablehnt', async () => {
    backend({ status: 200, body: disconnected }, { status: 422 })
    const wrapper = mount(IntervalsConnection)
    await flushPromises()

    await wrapper.find('input[type=password]').setValue('falsch')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('abgelehnt')
  })
})

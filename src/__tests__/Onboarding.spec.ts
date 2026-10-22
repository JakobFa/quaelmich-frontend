import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { endSession, startSession } from '../auth'
import router from '../router'
import { emptyAthlete } from '../types/athlete'
import OnboardingView from '../views/OnboardingView.vue'

const existing = {
  ...emptyAthlete(),
  ftp: 250,
  weightKg: 72,
  level: 'AMBITIOUS',
  event: {
    name: 'Ötztaler',
    date: '2027-07-04',
    distanceKm: 227,
    elevationMeters: 5500,
    type: null,
  },
}

/** Antwortet auf GET /me/athlete mit dem Profil, auf alles andere mit 200 */
function backend() {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>((url, init) => {
    const body = url.endsWith('/me/athlete') && !init?.method ? existing : {}
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function mountAt(path: string) {
  await router.push(path)
  await router.isReady()
  const wrapper = mount(OnboardingView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('Angaben ändern', () => {
  beforeEach(() => startSession('abc.def.ghi', 'lina@example.com'))
  afterEach(() => {
    vi.unstubAllGlobals()
    endSession()
  })

  it('zeigt bei einem einzelnen Bereich nur diesen Schritt und speichert direkt', async () => {
    const fetchMock = backend()
    const wrapper = await mountAt('/onboarding?bereich=event')

    expect(wrapper.find('.stepper').exists()).toBe(false)
    expect(wrapper.text()).toContain('Worauf trainierst du hin?')
    expect(wrapper.text()).not.toContain('Wer bist du?')

    await wrapper.find('input[type=text]').setValue('Maratona')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)
    expect(calls.some((c) => c.startsWith('PUT') && c.endsWith('/me/athlete'))).toBe(true)
    expect(calls.some((c) => c.startsWith('POST') && c.endsWith('/me/plan'))).toBe(true)
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('ohne Bereich bleibt es das Formular mit allen Schritten', async () => {
    backend()
    const wrapper = await mountAt('/onboarding')

    expect(wrapper.find('.stepper').exists()).toBe(true)
    expect(wrapper.text()).toContain('Wer bist du?')
  })
})

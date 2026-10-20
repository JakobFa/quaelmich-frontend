import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'

import WorkoutList from '../components/WorkoutList.vue'
import type { Workout } from '../types/workout'

const sweetSpot: Workout = {
  id: 5,
  title: 'Sweet Spot 3 × 12',
  type: 'SWEET_SPOT',
  description: '',
  durationInMinutes: 71,
  tss: 67,
  steps: [
    { kind: 'WARMUP', durationSeconds: 600, powerStartPercent: 50, powerEndPercent: 75 },
    { kind: 'INTERVAL', durationSeconds: 720, powerStartPercent: 90, powerEndPercent: 90 },
  ],
}

function mountList() {
  return mount(WorkoutList, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

describe('WorkoutList', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('zeigt während des Ladens einen Hinweis', () => {
    // Antwort kommt nie → Komponente bleibt im Ladezustand
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<unknown>>(() => new Promise(() => {})),
    )
    const wrapper = mountList()

    expect(wrapper.text()).toContain('Lädt Workouts')
  })

  it('rendert die Workouts aus dem Backend', async () => {
    const fetchMock = vi.fn<() => Promise<unknown>>(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([sweetSpot]) }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mountList()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/workouts$/), expect.anything())
    expect(wrapper.findAll('.workouts li')).toHaveLength(1)
    expect(wrapper.text()).toContain('Sweet Spot 3 × 12')
    expect(wrapper.text()).toContain('1:11 h')
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/workouts/5')
  })

  it('zeigt eine Fehlermeldung, wenn das Backend nicht antwortet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<unknown>>(() => Promise.reject(new Error('offline'))),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.text()).toContain('konnten nicht geladen werden')
    expect(wrapper.find('button').text()).toContain('Nochmal versuchen')
  })
})

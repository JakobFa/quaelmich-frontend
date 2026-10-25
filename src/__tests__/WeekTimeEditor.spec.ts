import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import WeekTimeEditor from '../components/WeekTimeEditor.vue'

const athlete = {
  availability: {
    monday: 0,
    tuesday: 1.5,
    wednesday: 0,
    thursday: 1.5,
    friday: 0,
    saturday: 3,
    sunday: 2,
  },
}

function mountEditor(
  start = '2026-10-19',
  weekAvailability: Record<string, unknown> | null = null,
) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.endsWith('/me/athlete') ? athlete : { workouts: [] }),
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(WeekTimeEditor, {
    props: { start, today: '2026-10-21', weekAvailability: weekAvailability as never },
  })
  return { wrapper, fetchMock }
}

describe('Zeit für eine Woche', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('übernimmt die normale Zeit und sperrt vergangene Tage', async () => {
    const { wrapper } = mountEditor()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('1.5')
    expect(inputs[0]!.attributes('disabled')).toBeDefined() // Mo 19.10.
    expect(inputs[2]!.attributes('disabled')).toBeUndefined() // Mi 21.10. = heute
  })

  it('"Nur diese Woche" ändert nur die Woche', async () => {
    const { wrapper, fetchMock } = mountEditor()
    await flushPromises()

    await wrapper.findAll('input')[5]!.setValue(0) // Samstag keine Zeit
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const call = fetchMock.mock.calls.find(([url]) => url.includes('/me/plan/weeks/'))!
    expect(call[0]).toContain('/me/plan/weeks/2026-10-19/availability')
    expect(call[1]!.method).toBe('PUT')
    expect(JSON.parse(String(call[1]!.body)).saturday).toBe(0)
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => init?.method === 'PUT' && init.body && String(init.body).includes('"event"'),
      ),
    ).toBe(false)
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('in der laufenden Woche: die nächsten 7 Tage ab heute, verteilt auf zwei Wochen', async () => {
    // heute Mi 21.10. → Mi bis Di; diese Woche schon angepasst (Mo 1 h), die nächste nicht
    const { wrapper, fetchMock } = mountEditor('2026-10-21', {
      '2026-10-19': { ...athlete.availability, monday: 1 },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Zeit für die nächsten 7 Tage')
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(7)
    expect(inputs.every((input) => input.attributes('disabled') === undefined)).toBe(true)

    await inputs[5]!.setValue(2) // Mo 26.10. (nächste Woche)
    await inputs[3]!.setValue(0) // Sa 24.10. (diese Woche)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const weekCalls = fetchMock.mock.calls.filter(([url]) => url.includes('/me/plan/weeks/'))
    expect(weekCalls.map(([url]) => url.match(/weeks\/([\d-]+)/)![1])).toEqual([
      '2026-10-19',
      '2026-10-26',
    ])
    const thisWeek = JSON.parse(String(weekCalls[0]![1]!.body))
    const nextWeek = JSON.parse(String(weekCalls[1]![1]!.body))
    expect(thisWeek.monday).toBe(1) // vergangen, bleibt wie angepasst
    expect(thisWeek.saturday).toBe(0)
    expect(nextWeek.monday).toBe(2)
    expect(nextWeek.wednesday).toBe(0) // gehört nicht mehr zu den 7 Tagen → normal
    expect(wrapper.emitted('saved')![0]![1]).toContain('Die nächsten 7 Tage')
  })

  it('speichert keine Ausnahme für eine Woche, die gleich bleibt', async () => {
    // heute Mi 21.10.: nur Mo 26.10. (nächste Woche) ändern – diese Woche bleibt normal
    const { wrapper, fetchMock } = mountEditor('2026-10-21')
    await flushPromises()

    await wrapper.findAll('input')[5]!.setValue(2)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const weekCalls = fetchMock.mock.calls.filter(([url]) => url.includes('/me/plan/weeks/'))
    expect(weekCalls.map(([url]) => url.match(/weeks\/([\d-]+)/)![1])).toEqual(['2026-10-26'])
    expect(wrapper.text()).toContain('Mi 21.10. – Di 27.10.')
  })
})

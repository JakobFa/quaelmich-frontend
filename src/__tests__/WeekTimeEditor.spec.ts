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

function mountEditor() {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.endsWith('/me/athlete') ? athlete : { workouts: [] }),
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(WeekTimeEditor, {
    props: { monday: '2026-10-19', today: '2026-10-21', override: null },
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
})

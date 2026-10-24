import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import IntervalAccuracyPanel from '../components/IntervalAccuracyPanel.vue'

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn<() => Promise<unknown>>(() =>
      Promise.resolve({ ok: true, status, json: () => Promise.resolve(body) }),
    ),
  )
}

describe('Intervall-Genauigkeit', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('zeigt Wert, Tipp und Intervalle', async () => {
    respond(200, {
      basis: 'POWER',
      score: 86,
      onTarget: 2,
      uncertain: false,
      tip: 'Zu schnell angegangen',
      blocks: [
        {
          number: 1,
          durationSeconds: 720,
          targetLow: 214,
          targetHigh: 236,
          actual: 250,
          verdict: 'HARD',
          score: 78,
        },
        {
          number: 2,
          durationSeconds: 720,
          targetLow: 214,
          targetHigh: 236,
          actual: 226,
          verdict: 'ON_TARGET',
          score: 99,
        },
      ],
    })
    const wrapper = mount(IntervalAccuracyPanel, { props: { plannedId: 1 } })
    await flushPromises()

    expect(wrapper.text()).toContain('86%')
    expect(wrapper.text()).toContain('2 von 2 Intervallen im Ziel')
    expect(wrapper.text()).toContain('250 W')
    expect(wrapper.text()).toContain('zu hart')
  })

  it('bleibt leer, wenn nichts auswertbar ist', async () => {
    respond(204)
    const wrapper = mount(IntervalAccuracyPanel, { props: { plannedId: 1 } })
    await flushPromises()

    expect(wrapper.text()).toBe('')
  })
})

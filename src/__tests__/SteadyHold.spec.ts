import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SteadyHoldPanel from '../components/SteadyHoldPanel.vue'
import type { SteadyHold } from '../types/plan'

const result: SteadyHold = {
  basis: 'POWER',
  targetLow: 150,
  targetHigh: 190,
  average: 168,
  percentBelow: 8,
  percentInZone: 86,
  percentAbove: 6,
  hold: 'STEADY',
  tip: 'Schön gleichmäßig im Zielbereich – genau so sollen lockere Tage aussehen.',
  // 90 Minuten, ein Punkt je 10 s, mit einer Ampelpause in der Mitte
  trace: Array.from({ length: 540 }, (_, i) => (i >= 300 && i < 306 ? null : 165 + (i % 5) * 4)),
}

vi.mock('../api', () => ({
  getSteadyHold: vi.fn<(id: number) => Promise<SteadyHold | null>>(),
}))

async function mountWith(value: SteadyHold | null) {
  const { getSteadyHold } = await import('../api')
  vi.mocked(getSteadyHold).mockResolvedValue(value)
  const wrapper = mount(SteadyHoldPanel, { props: { plannedId: 1 } })
  await flushPromises()
  return wrapper
}

describe('Einschätzung lockerer Fahrten', () => {
  it('zeigt Urteil, Schnitt, Zielbereich und die Verteilung', async () => {
    const text = (await mountWith(result)).text()
    expect(text).toContain('Locker gehalten')
    expect(text).toContain('Ø 168 W')
    expect(text).toContain('Ziel 150–190 W')
    expect(text).toContain('86 % im Zielbereich')
    expect(text).toContain('gleichmäßig')
  })

  it('legt die Kurve über den Zielbereich, Stillstand unterbricht die Linie', async () => {
    const wrapper = await mountWith(result)

    expect(wrapper.find('svg rect').exists()).toBe(true)
    expect(wrapper.findAll('polyline')).toHaveLength(2)
    expect(wrapper.find('figcaption').text()).toContain('Zielbereich')
    expect(wrapper.find('svg').attributes('aria-label')).toContain('150 bis 190 W')
  })

  it('nennt den Puls, wenn nach Puls gemessen wurde', async () => {
    const text = (await mountWith({ ...result, basis: 'HEART_RATE', hold: 'TOO_HARD' })).text()
    expect(text).toContain('nach Puls')
    expect(text).toContain('Zu hart gefahren')
  })

  it('bleibt leer ohne Auswertung', async () => {
    expect((await mountWith(null)).text()).toBe('')
  })
})

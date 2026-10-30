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

  it('nennt den Puls, wenn nach Puls gemessen wurde', async () => {
    const text = (await mountWith({ ...result, basis: 'HEART_RATE', hold: 'TOO_HARD' })).text()
    expect(text).toContain('nach Puls')
    expect(text).toContain('Zu hart gefahren')
  })

  it('bleibt leer ohne Auswertung', async () => {
    expect((await mountWith(null)).text()).toBe('')
  })
})

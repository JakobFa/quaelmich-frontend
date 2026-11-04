import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SicknessPanel from '../components/SicknessPanel.vue'
import type { TrainingPlan } from '../types/plan'

const { startSickness, endSickness } = vi.hoisted(() => ({
  startSickness: vi.fn<(from: string, until?: string) => Promise<TrainingPlan>>(),
  endSickness: vi.fn<(since?: string) => Promise<TrainingPlan>>(),
}))
vi.mock('../api', () => ({ startSickness, endSickness }))

const today = '2026-11-04'

function planWith(sickSince: string | null): TrainingPlan {
  return {
    id: 1,
    startDate: '2026-11-02',
    eventName: null,
    eventDate: null,
    workouts: [],
    sickSince,
  }
}

describe('SicknessPanel', () => {
  beforeEach(() => {
    startSickness.mockReset()
    endSickness.mockReset()
  })

  it('meldet krank ab einem Tag in der Vergangenheit (rückwirkend)', async () => {
    startSickness.mockResolvedValue(planWith('2026-11-01'))
    const wrapper = mount(SicknessPanel, { props: { plan: planWith(null), today } })

    await wrapper.find('button.open-link').trigger('click')
    await wrapper.find('input[type="date"]').setValue('2026-11-01')
    await wrapper.findAll('button').find((b) => b.text() === 'Eintragen')!.trigger('click')
    await flushPromises()

    expect(startSickness).toHaveBeenCalledWith('2026-11-01')
    expect(wrapper.emitted('updated')?.[0]?.[0]).toMatchObject({ sickSince: '2026-11-01' })
  })

  it('trägt eine vorbeigegangene Krankheit mit Von und Bis nach', async () => {
    startSickness.mockResolvedValue(planWith(null))
    const wrapper = mount(SicknessPanel, { props: { plan: planWith(null), today } })

    await wrapper.find('button.open-link').trigger('click')
    await wrapper.find('input[value="past"]').setValue(true)
    const [from, until] = wrapper.findAll('input[type="date"]')
    await from!.setValue('2026-10-28')
    await until!.setValue('2026-11-01')
    await wrapper.findAll('button').find((b) => b.text() === 'Eintragen')!.trigger('click')
    await flushPromises()

    expect(startSickness).toHaveBeenCalledWith('2026-10-28', '2026-11-01')
  })

  it('zeigt bei offener Krankheit den Stillstand und setzt mit "Wieder gesund" fort', async () => {
    endSickness.mockResolvedValue(planWith(null))
    const wrapper = mount(SicknessPanel, { props: { plan: planWith('2026-11-01'), today } })

    expect(wrapper.text()).toContain('Krank seit')
    expect(wrapper.text()).toContain('angehalten')
    await wrapper.findAll('button').find((b) => b.text().startsWith('Wieder gesund'))!.trigger('click')
    await flushPromises()

    expect(endSickness).toHaveBeenCalledWith(undefined)
    expect(wrapper.emitted('updated')).toHaveLength(1)
  })

  it('kann rückwirkend "schon seit" gesund melden', async () => {
    endSickness.mockResolvedValue(planWith(null))
    const wrapper = mount(SicknessPanel, { props: { plan: planWith('2026-11-01'), today } })

    await wrapper.findAll('button').find((b) => b.text() === 'Schon früher gesund?')!.trigger('click')
    await wrapper.find('input[type="date"]').setValue('2026-11-03')
    await wrapper.findAll('button').find((b) => b.text().startsWith('Wieder gesund'))!.trigger('click')
    await flushPromises()

    expect(endSickness).toHaveBeenCalledWith('2026-11-03')
  })

  it('zeigt eine Fehlermeldung, wenn es nicht geht', async () => {
    startSickness.mockRejectedValue(new Error('409'))
    const wrapper = mount(SicknessPanel, { props: { plan: planWith(null), today } })

    await wrapper.find('button.open-link').trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Eintragen')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.emitted('updated')).toBeUndefined()
  })
})

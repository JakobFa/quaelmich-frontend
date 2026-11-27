import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import PlannedWorkoutView from '../views/PlannedWorkoutView.vue'
import { toIsoDate } from '../plan/weeks'
import type { PlannedWorkout } from '../types/plan'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '7' } }) }))

const { getPlannedWorkout, getMyAthlete, healthySince } = vi.hoisted(() => ({
  getPlannedWorkout: vi.fn<(id: number) => Promise<PlannedWorkout>>(),
  getMyAthlete: vi.fn<() => Promise<null>>(),
  healthySince: vi.fn<(since: string) => Promise<unknown>>(),
}))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  getPlannedWorkout,
  getMyAthlete,
  healthySince,
  listExtraRidesOfDay: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  getRampTestResult: vi.fn<() => Promise<null>>().mockResolvedValue(null),
  getIntervalAccuracy: vi.fn<() => Promise<null>>().mockResolvedValue(null),
}))

function sickWorkout(date: string, extra: Partial<PlannedWorkout> = {}): PlannedWorkout {
  return {
    id: 7,
    date,
    completed: false,
    rating: null,
    skipReason: 'SICK',
    actual: null,
    adjustment: null,
    workout: {
      id: 1,
      title: 'Grundlage 90 min',
      type: 'ENDURANCE',
      durationMinutes: 90,
      steps: [],
    },
    ...extra,
  } as unknown as PlannedWorkout
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

describe('PlannedWorkoutView: ab diesem Tag wieder gesund', () => {
  beforeEach(() => {
    getPlannedWorkout.mockReset()
    getMyAthlete.mockReset()
    healthySince.mockReset()
    getMyAthlete.mockResolvedValue(null)
  })

  it('bietet es an einem vergangenen Krankheitstag an und meldet den Tag', async () => {
    const day = daysAgo(3)
    getPlannedWorkout.mockResolvedValueOnce(sickWorkout(day))
    getPlannedWorkout.mockResolvedValueOnce(sickWorkout(day, { skipReason: null }))
    healthySince.mockResolvedValue({})
    const wrapper = mount(PlannedWorkoutView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()

    const box = wrapper.find('[data-test="healthy-since"]')
    expect(box.exists()).toBe(true)
    await box.find('button').trigger('click')
    await flushPromises()

    expect(healthySince).toHaveBeenCalledWith(day)
    expect(wrapper.find('[data-test="healthy-since"]').exists()).toBe(false)
  })

  it('zeigt es nicht für kommende Tage und nicht bei anderen Gründen', async () => {
    getPlannedWorkout.mockResolvedValueOnce(sickWorkout(daysAgo(-2)))
    let wrapper = mount(PlannedWorkoutView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    expect(wrapper.find('[data-test="healthy-since"]').exists()).toBe(false)

    getPlannedWorkout.mockResolvedValueOnce(sickWorkout(daysAgo(3), { skipReason: 'TIRED' }))
    wrapper = mount(PlannedWorkoutView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    expect(wrapper.find('[data-test="healthy-since"]').exists()).toBe(false)
  })
})

describe('PlannedWorkoutView: KI-Zeichen', () => {
  it('zeigt, dass deine KI die Einheit geplant hat', async () => {
    getMyAthlete.mockResolvedValue(null)
    getPlannedWorkout.mockReset()
    getPlannedWorkout.mockResolvedValue(
      sickWorkout(daysAgo(-2), { skipReason: null, aiDecided: true }),
    )
    const wrapper = mount(PlannedWorkoutView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()

    expect(wrapper.find('[data-test="ai-decided"]').text()).toContain('Von deiner KI geplant')
  })

  it('zeigt es nicht für eigene Einheiten', async () => {
    getPlannedWorkout.mockReset()
    getPlannedWorkout.mockResolvedValue(sickWorkout(daysAgo(-2), { skipReason: null }))
    const wrapper = mount(PlannedWorkoutView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()

    expect(wrapper.find('[data-test="ai-decided"]').exists()).toBe(false)
  })
})

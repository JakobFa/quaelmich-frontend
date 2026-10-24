import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import WorkoutPicker from '../components/WorkoutPicker.vue'

const library = [
  {
    id: 2,
    title: 'Grundlage 90 min',
    type: 'ENDURANCE',
    description: '',
    steps: [],
    durationInMinutes: 90,
    tss: 60,
  },
  {
    id: 8,
    title: 'VO2max 5 × 4',
    type: 'VO2MAX',
    description: '',
    steps: [],
    durationInMinutes: 60,
    tss: 75,
  },
]

let own: unknown[] = []

async function mountPicker(currentWorkoutId = 5) {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<unknown>>((url) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(url.includes('/me/workouts') ? own : library),
      }),
    ),
  )
  const wrapper = mount(WorkoutPicker, { props: { currentWorkoutId } })
  await flushPromises()
  return wrapper
}

describe('WorkoutPicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    own = []
  })

  it('zeigt eigene Workouts als eigene Gruppe zuerst', async () => {
    own = [
      {
        id: 1_000_001,
        title: 'Hausberg 4 × 8',
        type: 'THRESHOLD',
        description: '',
        steps: [],
        durationInMinutes: 64,
        tss: 70,
      },
    ]
    const wrapper = await mountPicker()

    expect(wrapper.findAll('summary').map((s) => s.text())).toEqual([
      'Eigene Workouts',
      'Grundlage',
      'VO2max',
    ])
  })

  it('gruppiert die Bibliothek nach Trainingsart', async () => {
    const wrapper = await mountPicker()

    expect(wrapper.findAll('summary').map((s) => s.text())).toEqual(['Grundlage', 'VO2max'])
  })

  it('übergibt ein Intervall-Workout ohne Dauer', async () => {
    const wrapper = await mountPicker()

    await wrapper.findAll('li')[1]!.find('button').trigger('click')

    expect(wrapper.emitted('pick')).toEqual([[8, undefined]])
  })

  it('lässt bei Grundlage die Dauer wählen', async () => {
    const wrapper = await mountPicker()
    const row = wrapper.findAll('li')[0]!

    await row.find('select').setValue('120')
    await row.find('button').trigger('click')

    expect(row.text()).toContain('≈ 80 TSS')
    expect(wrapper.emitted('pick')).toEqual([[2, 120]])
  })

  it('das aktuelle Intervall-Workout lässt sich nicht nochmal wählen', async () => {
    const wrapper = await mountPicker(8)

    expect(wrapper.findAll('li')[1]!.find('button').attributes('disabled')).toBeDefined()
  })
})

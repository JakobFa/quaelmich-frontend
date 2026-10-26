import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import RampTestResult from '../components/RampTestResult.vue'
import { evaluateRampTest } from '../plan/rampTest'
import type { Athlete } from '../types/athlete'

vi.mock('../api', () => ({
  saveMyAthlete: vi.fn<(athlete: Athlete) => Promise<Athlete>>(async (athlete) => athlete),
  generatePlan: vi.fn<() => Promise<object>>(async () => ({})),
}))

/** seconds Sekunden mit genau watts */
const ride = (seconds: number, watts: number) => Array<number>(seconds).fill(watts)

/** wie in der App: 8 min einrollen, ab 150 W jede Minute +15 W bis lastWatts, dann ausfahren */
function rampTest(lastWatts: number) {
  const watts = ride(8 * 60, 130)
  for (let w = 150; w <= lastWatts; w += 15) watts.push(...ride(60, w))
  return [...watts, ...ride(10 * 60, 110)]
}

describe('Rampentest', () => {
  it('FTP sind 75 % der besten Minute', () => {
    expect(evaluateRampTest(rampTest(360))).toEqual({ bestMinuteWatts: 360, ftp: 270 })
  })

  it('erkennt Intervall-Workouts und gleichmäßige Fahrten nicht als Test', () => {
    const vo2max = ride(10 * 60, 140)
    for (let i = 0; i < 5; i++) vo2max.push(...ride(240, 300), ...ride(240, 120))
    expect(evaluateRampTest(vo2max)).toBeNull()
    expect(evaluateRampTest(ride(3600, 200))).toBeNull()
    expect(evaluateRampTest(ride(300, 200))).toBeNull()
  })

  it('zeigt das Ergebnis und übernimmt die FTP mit einem Klick', async () => {
    const athlete = { ftp: 250 } as Athlete
    const wrapper = mount(RampTestResult, {
      props: { result: { bestMinuteWatts: 360, ftp: 270 }, athlete },
    })
    expect(wrapper.text()).toContain('Beste Minute 360 W')
    expect(wrapper.text()).toContain('20 W mehr')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    const { saveMyAthlete } = await import('../api')
    expect(saveMyAthlete).toHaveBeenCalledWith({ ftp: 270 })
    expect(wrapper.emitted('adopted')?.[0]).toEqual([{ ftp: 270 }])
    expect(wrapper.text()).toContain('Übernommen')
  })
})

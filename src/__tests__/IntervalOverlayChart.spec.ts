import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import IntervalOverlayChart from '../components/IntervalOverlayChart.vue'
import type { IntervalAccuracy } from '../types/plan'

/** 30 min Anfahrt mit Ampel (Stillstand = null), dann 2 × 10 min bei 240 W mit 5 min Pause */
function accuracy(): IntervalAccuracy {
  const trace: (number | null)[] = []
  const add = (minutes: number, watts: number | null) => {
    for (let i = 0; i < minutes * 6; i++) trace.push(watts)
  }
  add(25, 190)
  add(2, null) // Ampel, kurz vor dem ersten Intervall
  add(3, 160)
  add(10, 240)
  add(5, 130)
  add(10, 245)
  add(15, 150)
  const block = (number: number, startSecond: number, actual: number) => ({
    number,
    startSecond,
    durationSeconds: 600,
    targetLow: 224,
    targetHigh: 248,
    actual,
    verdict: 'ON_TARGET' as const,
    score: 95,
  })
  return {
    basis: 'POWER',
    score: 95,
    onTarget: 2,
    uncertain: false,
    tip: null,
    blocks: [block(1, 30 * 60, 240), block(2, 45 * 60, 245)],
    trace,
  }
}

describe('Kurve über den Intervallen', () => {
  it('zeichnet die Zielbereiche dort, wo die Intervalle gefunden wurden', () => {
    const wrapper = mount(IntervalOverlayChart, { props: { accuracy: accuracy() } })

    const bands = wrapper.findAll('.band rect')
    expect(bands).toHaveLength(2)
    const [first, second] = bands.map((band) => Number(band.attributes('x')))
    // 15 min Abstand zwischen den Starts, beide gleich breit
    expect(second! - first!).toBeCloseTo((Number(bands[0]!.attributes('width')) * 15) / 10, 0)
    expect(wrapper.text()).toContain('30′')
    expect(wrapper.text()).toContain('45′')
  })

  it('unterbricht die Linie beim Stillstand', () => {
    const wrapper = mount(IntervalOverlayChart, { props: { accuracy: accuracy() } })

    expect(wrapper.findAll('polyline.trace')).toHaveLength(2)
  })

  it('ohne Kurve kein Diagramm', () => {
    const wrapper = mount(IntervalOverlayChart, {
      props: { accuracy: { ...accuracy(), trace: undefined } },
    })

    expect(wrapper.find('svg').exists()).toBe(false)
  })
})

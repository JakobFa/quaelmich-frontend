import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProgressHeader from '../components/ProgressHeader.vue'
import type { Progress } from '../api'

const progress: Progress = {
  xp: 4210,
  level: { number: 7, name: 'Bergziegen-Punk', fromXp: 3800 },
  nextLevel: { number: 8, name: 'Laktat-Rebell', fromXp: 5200 },
  streakWeeks: 4,
  plan: { week: 3, totalWeeks: 12, completed: 7, due: 9, daysToEvent: 81, eventName: 'Ötztaler' },
}

describe('ProgressHeader', () => {
  it('zeigt Level, Punkte bis zum nächsten Level und den Stand im Plan', () => {
    const text = mount(ProgressHeader, { props: { progress } }).text()

    expect(text).toContain('Bergziegen-Punk')
    expect(text).toContain('4.210 XP')
    expect(text).toContain('noch 990 bis „Laktat-Rebell“')
    expect(text).toContain('78%')
    expect(text).toContain('81 Tage')
    expect(text).toContain('🔥 4')
  })

  it('füllt den Balken anteilig bis zum nächsten Level', () => {
    const bar = mount(ProgressHeader, { props: { progress } }).find('[role=progressbar]')
    expect(bar.attributes('aria-valuenow')).toBe('29') // (4210-3800)/(5200-3800)
  })

  it('zeigt ohne Plan nur das Level', () => {
    const wrapper = mount(ProgressHeader, {
      props: { progress: { ...progress, plan: null, streakWeeks: 0 } },
    })
    expect(wrapper.text()).toContain('Bergziegen-Punk')
    expect(wrapper.find('.stats').text()).toBe('')
  })
})

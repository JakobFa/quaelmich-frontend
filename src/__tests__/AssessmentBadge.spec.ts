import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AssessmentBadge from '../components/AssessmentBadge.vue'

describe('AssessmentBadge', () => {
  it('zeigt die Einschätzung als Text', () => {
    const wrapper = mount(AssessmentBadge, { props: { assessment: 'MUCH_HARDER' } })
    expect(wrapper.text()).toBe('▲▲ deutlich härter')
    expect(wrapper.classes()).toContain('much_harder')
  })

  it('markiert wie geplant', () => {
    const wrapper = mount(AssessmentBadge, { props: { assessment: 'AS_PLANNED' } })
    expect(wrapper.text()).toContain('wie geplant')
  })

  it('nennt bei Zusatzfahrten die Belastung statt "härter"', () => {
    const wrapper = mount(AssessmentBadge, { props: { assessment: 'HARDER', extra: true } })
    expect(wrapper.text()).toBe('▲ fordernd')
  })
})

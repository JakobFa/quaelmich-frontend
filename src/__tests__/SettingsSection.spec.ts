import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import SettingsSection from '../components/SettingsSection.vue'

const route = vi.hoisted(() => ({ hash: '' }))
vi.mock('vue-router', () => ({ useRoute: () => route }))

const props = { id: 'ki-modus', title: 'KI-Modus', summary: 'Deine KI plant mit' }

describe('SettingsSection', () => {
  it('ist zu und zeigt Titel und eine Zeile', () => {
    route.hash = ''
    const wrapper = mount(SettingsSection, { props, slots: { default: '<p>Inhalt</p>' } })
    expect(wrapper.find('details').attributes('open')).toBeUndefined()
    expect(wrapper.find('summary').text()).toContain('KI-Modus')
    expect(wrapper.find('summary').text()).toContain('Deine KI plant mit')
  })

  it('öffnet sich, wenn die Adresse auf ihn zeigt', async () => {
    route.hash = '#ki-modus'
    const wrapper = mount(SettingsSection, { props, slots: { default: '<p>Inhalt</p>' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('details').attributes('open')).toBeDefined()
  })
})

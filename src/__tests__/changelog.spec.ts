import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { changelog } from '../changelog'
import NewsView from '../views/NewsView.vue'

describe('Neuigkeiten', () => {
  it('hat die neuesten Einträge zuerst und jeden Tag nur einmal', () => {
    const dates = changelog.map((release) => release.date)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('hat zu jeder Änderung Titel und Text', () => {
    for (const release of changelog) {
      expect(release.changes.length).toBeGreaterThan(0)
      for (const change of release.changes) {
        expect(change.title.trim()).not.toBe('')
        expect(change.text.trim()).not.toBe('')
        expect(['Neu', 'Besser']).toContain(change.kind)
      }
    }
  })

  it('zeigt Datum, Version und Änderungen auf der Seite', () => {
    const wrapper = mount(NewsView)
    const first = changelog[0]!
    expect(wrapper.text()).toContain('Was ist neu in quaelmich?')
    expect(wrapper.text()).toContain('3. November 2026')
    expect(wrapper.text()).toContain(`v${first.version}`)
    expect(wrapper.text()).toContain(first.changes[0]!.title)
    expect(wrapper.findAll('article')).toHaveLength(changelog.length)
  })
})

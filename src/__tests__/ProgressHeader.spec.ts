import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProgressHeader from '../components/ProgressHeader.vue'
import type { AiAssessment, Progress } from '../api'
import type { PlanWeek } from '../plan/weeks'
import type { Phase } from '../types/plan'

const progress: Progress = {
  xp: 4210,
  level: { number: 7, name: 'Bergziegen-Punk', fromXp: 3800 },
  nextLevel: { number: 8, name: 'Laktat-Rebell', fromXp: 5200 },
  streakWeeks: 4,
  plan: { week: 3, totalWeeks: 4, completed: 7, due: 9, daysToEvent: 18, eventName: 'Ötztaler' },
  load: { plannedTss: 340, actualTss: 310, chronicTss: 320, status: 'ON_TRACK' as const },
}

function week(monday: string, phase: Phase | null): PlanWeek {
  return { monday, days: [], phase, totalMinutes: 0, totalTss: 0, completedCount: 0 }
}

// 4 Wochen ab Mo 05.10.2026, heute Mi 21.10. (Woche 3)
const weeks = [
  week('2026-10-05', 'BASE'),
  week('2026-10-12', 'BUILD'),
  week('2026-10-19', 'PEAK'),
  week('2026-10-26', null),
]

function mountHeader(overrides: Partial<Progress> = {}) {
  return mount(ProgressHeader, {
    props: { progress: { ...progress, ...overrides }, weeks, today: '2026-10-21', selectedWeek: 2 },
  })
}

describe('ProgressHeader', () => {
  it('zeigt die aktuelle Woche, die Tage bis zum Event und die Einschätzung', () => {
    const text = mountHeader().text()

    expect(text).toContain('Woche 3 von 4')
    expect(text).toContain('noch 18 Tage bis Ötztaler')
    expect(text).toContain('Auf Kurs')
    expect(text).toContain('310 / 340 TSS geplant')
    expect(text).not.toContain('(7/9)')
    expect(text).toContain('4')
    expect(text).not.toContain('Bergziegen-Punk')
  })

  it('zeigt bei "zu viel" den Schnitt als Vergleich, nicht den Plan', () => {
    const text = mountHeader({
      load: { plannedTss: 201, actualTss: 232, chronicTss: 150, status: 'TOO_MUCH' as const },
    }).text()
    expect(text).toContain('Zu viel')
    expect(text).toContain('232 / 150 TSS Schnitt')
    expect(text).toContain('Deutlich mehr als sonst')
  })

  it('füllt den Balken nach der vergangenen Zeit', () => {
    // 17 von 28 Tagen (inkl. heute) → 61 %
    const bar = mountHeader().find('[role=progressbar]')
    expect(bar.attributes('aria-valuenow')).toBe('61')
  })

  it('hat einen Abschnitt pro Woche in der Farbe der Phase, die letzte Woche ist Tapering', () => {
    const segments = mountHeader().findAll('.segment')
    expect(segments.map((s) => s.classes()[1])).toEqual(['base', 'build', 'peak', 'taper'])
  })

  it('springt per Klick zur Woche', async () => {
    const wrapper = mountHeader()
    await wrapper.findAll('.segment')[1]!.trigger('click')
    expect(wrapper.emitted('select-week')).toEqual([[1]])
  })

  describe('im KI-Modus', () => {
    const fresh: AiAssessment = {
      status: null,
      note: 'Zwei harte Tage, morgen locker.',
      updatedAt: '2026-10-21T05:12:00Z',
      fresh: true,
    }

    function mountAi(aiAssessment: AiAssessment | null, load = progress.load) {
      return mount(ProgressHeader, {
        props: {
          progress: { ...progress, load },
          weeks,
          today: '2026-10-21',
          selectedWeek: 2,
          aiMode: true,
          aiAssessment,
        },
      })
    }

    it('zeigt die Werte von quaelmich und darunter die kurze Einschätzung der KI', () => {
      const wrapper = mountAi(fresh)

      expect(wrapper.find('[data-test="tile-load"]').text()).toContain('Auf Kurs')
      expect(wrapper.find('[data-test="ai-assessment"]').text()).toContain(
        'Zwei harte Tage, morgen locker.',
      )
    })

    it('zeigt eine alte Einschätzung nicht, sondern sagt, seit wann die KI schweigt', () => {
      const wrapper = mountAi({ ...fresh, fresh: false })

      expect(wrapper.find('[data-test="ai-assessment"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="ai-stale"]').text()).toContain(
        'nicht zu deiner Form gemeldet',
      )
    })

    it('verspricht keine automatische Anpassung', () => {
      const wrapper = mountAi(null, {
        plannedTss: 300,
        actualTss: 600,
        chronicTss: 300,
        status: 'TOO_MUCH',
      })

      expect(wrapper.text()).not.toContain('quaelmich macht')
      expect(wrapper.text()).toContain('deine KI')
    })
  })

  it('zeigt die übergebenen Kacheln und die Serie', () => {
    const wrapper = mount(ProgressHeader, {
      props: {
        progress,
        weeks,
        today: '2026-10-21',
        selectedWeek: 2,
        tiles: [{ key: 'ftp', label: 'FTP', value: '265 W', sub: '3,7 W/kg', tone: null }],
      },
    })

    expect(wrapper.find('[data-test="tile-ftp"]').text()).toContain('265 W')
    expect(wrapper.find('[data-test="tile-streak"]').text()).toContain('4 Wo.')
    expect(wrapper.text()).not.toContain('Bergziegen-Punk')
  })
})

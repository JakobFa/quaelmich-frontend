import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import FtpHint from '../components/FtpHint.vue'
import type { Athlete } from '../types/athlete'
import type { TrainingPlan } from '../types/plan'

const plan = { workouts: [] } as unknown as TrainingPlan

function mountHint(extra: Partial<Athlete>) {
  const athlete = {
    ftp: 240,
    suggestedFtpNote: 'Am Sa, 24.10. bist du 75 min mit 272 W gefahren.',
    ...extra,
  }
  return mount(FtpHint, {
    props: { athlete: athlete as Athlete, plan, today: '2026-10-24' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('FTP-Hinweis', () => {
  it('zeigt den Vorschlag mit Begründung', () => {
    const wrapper = mountHint({ suggestedFtp: 272 })
    expect(wrapper.text()).toContain('wahrscheinlich zu niedrig')
    expect(wrapper.text()).toContain('FTP auf 272 W setzen')
  })

  it('bleibt weg ohne Vorschlag oder wenn ausgeblendet', () => {
    expect(mountHint({ suggestedFtp: null }).text()).toBe('')
    expect(mountHint({ suggestedFtp: 272, dismissedSuggestedFtp: 272 }).text()).toBe('')
  })

  it('zeigt das Ergebnis eines Rampentests auch, wenn die FTP sinkt', () => {
    const wrapper = mountHint({
      suggestedFtp: 228,
      suggestedFtpFromTest: true,
      suggestedFtpNote: 'Dein Rampentest am Mo, 26.10.: beste Minute 304 W, davon 75 % sind 228 W.',
    })
    expect(wrapper.text()).toContain('Neue FTP aus deinem Rampentest')
    expect(wrapper.text()).toContain('FTP auf 228 W setzen')
    // eine normale Fahrt schlägt nie eine niedrigere FTP vor
    expect(mountHint({ suggestedFtp: 228 }).text()).toBe('')
  })
})

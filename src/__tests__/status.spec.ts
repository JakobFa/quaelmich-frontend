import { describe, expect, it } from 'vitest'

import type { FormCurve, FormDay, HealthDay, Progress } from '../api'
import { formTile, ftpTile, recoveryTile, sleepTile, streakTile } from '../plan/status'

function formDay(date: string, form: number): FormDay {
  return { date, tss: 50, fitness: 60, fatigue: 60 - form, form, planned: false }
}

function curve(form: number, history = 20): FormCurve {
  const days = Array.from({ length: history }, (_, i) =>
    formDay(`2026-10-${String(i + 1).padStart(2, '0')}`, 0),
  )
  const today = formDay('2026-10-25', form)
  return { days: [...days, today], today, eventForm: null, eventDate: null }
}

function health(date: string, values: Partial<HealthDay>): HealthDay {
  return {
    date,
    sleepMinutes: null,
    sleepScore: null,
    steps: null,
    activeEnergyKcal: null,
    restingHeartRate: null,
    hrvMs: null,
    hrvSdnnMs: null,
    ...values,
  }
}

const TODAY = '2026-10-25'

describe('Statuskarte', () => {
  it('Form: Wort und Farbe nach den üblichen Grenzen', () => {
    expect(formTile(curve(8))).toMatchObject({ value: '+8 · frisch', tone: 'good' })
    expect(formTile(curve(-3))).toMatchObject({ value: '-3 · ausgeglichen', tone: null })
    expect(formTile(curve(-22))).toMatchObject({ value: '-22 · im Training', tone: 'warn' })
    expect(formTile(curve(-40))).toMatchObject({ value: '-40 · sehr müde', tone: 'bad' })
    expect(formTile(curve(-40, 5))).toMatchObject({ sub: 'noch wenig Daten', tone: null })
    expect(formTile(null)).toBeNull()
  })

  it('FTP mit Watt pro Kilo, ohne FTP keine Kachel', () => {
    expect(ftpTile(265, 72)).toMatchObject({ value: '265 W', sub: '3,7 W/kg' })
    expect(ftpTile(265, null)).toMatchObject({ sub: null })
    expect(ftpTile(null, 72)).toBeNull()
  })

  it('Schlaf: letzte Nacht gegen den Schnitt der Tage davor', () => {
    const days = [
      health('2026-10-25', { sleepMinutes: 452, sleepScore: 81 }),
      health('2026-10-24', { sleepMinutes: 420 }),
      health('2026-10-23', { sleepMinutes: 420 }),
      health('2026-10-22', { sleepMinutes: 420 }),
    ]
    expect(sleepTile(days, TODAY)).toMatchObject({
      value: '7:32 h',
      sub: 'Schnitt 7:00 h · ↑ · Score 81',
    })

    const short = [health('2026-10-25', { sleepMinutes: 330 }), ...days.slice(1)]
    expect(sleepTile(short, TODAY)).toMatchObject({ value: '5:30 h', tone: 'warn' })
  })

  it('Schlaf: alte Werte zählen nicht als letzte Nacht', () => {
    expect(sleepTile([health('2026-10-20', { sleepMinutes: 450 })], TODAY)).toBeNull()
  })

  it('Erholung: erhöhter Ruhepuls und niedrige HRV werden markiert', () => {
    const base = ['2026-10-24', '2026-10-23', '2026-10-22'].map((date) =>
      health(date, { restingHeartRate: 48, hrvMs: 60 }),
    )
    expect(
      recoveryTile([health('2026-10-25', { restingHeartRate: 49, hrvMs: 62 }), ...base], TODAY),
    ).toMatchObject({
      value: '49 Ruhepuls',
      sub: 'HRV 62 ms · normal',
      tone: null,
    })
    expect(
      recoveryTile([health('2026-10-25', { restingHeartRate: 55, hrvMs: 45 }), ...base], TODAY),
    ).toMatchObject({
      sub: 'HRV 45 ms · Puls erhöht · HRV niedrig',
      tone: 'warn',
    })
  })

  it('Erholung: Apple Watch liefert HRV als SDNN', () => {
    expect(recoveryTile([health('2026-10-24', { hrvSdnnMs: 52 })], TODAY)).toMatchObject({
      value: '52 ms HRV',
      sub: null,
    })
  })

  it('Serie nur, wenn es eine gibt', () => {
    const progress = { streakWeeks: 4 } as Progress
    expect(streakTile(progress)).toMatchObject({ value: '4 Wo.', tone: 'good' })
    expect(streakTile({ ...progress, streakWeeks: 0 })).toBeNull()
  })
})

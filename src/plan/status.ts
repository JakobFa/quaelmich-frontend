import type { FormCurve, HealthDay, Progress } from '../api'

/**
 * Statuskarte oben auf der Planseite: Kacheln mit dem aktuellen Zustand, alles von quaelmich selbst gerechnet
 * (Form aus der Belastung, FTP aus dem Profil, Schlaf und Erholung aus intervals.icu).
 */
export type Tone = 'good' | 'warn' | 'bad' | null

/**
 * Mini-Verlauf der letzten Tage für eine Kachel: ein Wert je Tag (null = kein Wert),
 * dazu der eigene Normalbereich als Band oder bei der Form die Nulllinie (darüber frisch, darunter müde).
 */
export type Trend = {
  points: (number | null)[]
  band: [number, number] | null
  zeroLine: boolean
}

export type StatusTile = {
  key: string
  label: string
  value: string
  sub: string | null
  tone: Tone
  trend?: Trend | null
}

/** So viele Tage zeigt der Mini-Verlauf */
export const TREND_DAYS = 14
/** So viele Vergleichstage braucht das Band des Normalbereichs */
export const BAND_MIN_DAYS = 5

/** So viele Tage Geschichte braucht die Formkurve, bevor ihr Wert etwas aussagt */
export const FORM_MIN_DAYS = 14
/** So viele Vergleichstage braucht ein Schnitt für Schlaf, Puls und HRV */
export const BASELINE_MIN_DAYS = 3

/** Form = Fitness − Ermüdung (TSB). Grenzen wie üblich: unter −30 sehr müde, −10 bis −30 im Training */
export function formTile(curve: FormCurve | null): StatusTile | null {
  const today = curve?.today
  if (!curve || !today) return null
  const history = curve.days.filter((day) => day.date < today.date).length
  const form = Math.round(today.form)
  const value = `${form > 0 ? '+' : ''}${form}`
  const trend = formTrend(curve.days, today.date)
  if (history < FORM_MIN_DAYS) {
    return { key: 'form', label: 'Form', value, sub: 'noch wenig Daten', tone: null, trend }
  }
  const [word, tone]: [string, Tone] =
    form > 15
      ? ['sehr frisch', 'good']
      : form > 5
        ? ['frisch', 'good']
        : form >= -10
          ? ['ausgeglichen', null]
          : form >= -30
            ? ['im Training', 'warn']
            : ['sehr müde', 'bad']
  return {
    key: 'form',
    label: 'Form',
    value: `${value} · ${word}`,
    sub: `Fitness ${Math.round(today.fitness)} · Ermüdung ${Math.round(today.fatigue)}`,
    tone,
    trend,
  }
}

function formTrend(days: FormCurve['days'], today: string): Trend | null {
  const byDate = new Map(days.map((day) => [day.date, day.form]))
  return trendOf(
    lastDates(today).map((date) => byDate.get(date) ?? null),
    null,
    true,
  )
}

export function ftpTile(
  ftp: number | null | undefined,
  weightKg: number | null | undefined,
): StatusTile | null {
  if (!ftp) return null
  const perKg = weightKg
    ? (ftp / weightKg).toLocaleString('de-DE', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : null
  return {
    key: 'ftp',
    label: 'FTP',
    value: `${ftp} W`,
    sub: perKg ? `${perKg} W/kg` : null,
    tone: null,
  }
}

function hours(minutes: number) {
  const rounded = Math.round(minutes)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')} h`
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

/** Die letzten TREND_DAYS Tage bis heute, ältester zuerst */
function lastDates(today: string) {
  const dates = [today]
  while (dates.length < TREND_DAYS) dates.unshift(dayBefore(dates[0]!))
  return dates
}

/** Ohne mindestens drei Werte sagt ein Verlauf nichts */
function trendOf(points: (number | null)[], band: [number, number] | null, zeroLine = false) {
  return points.filter((point) => point != null).length >= 3 ? { points, band, zeroLine } : null
}

/**
 * Verlauf eines Gesundheitswerts: dazu der Normalbereich aus den Tagen vor dem neuesten Wert
 * (Schnitt ± Streuung, mindestens ± minSpread, damit ein sehr gleichmäßiger Verlauf kein Strich wird)
 */
function healthTrend(
  days: HealthDay[],
  today: string,
  pick: (day: HealthDay) => number | null,
  minSpread: number,
): Trend | null {
  const byDate = new Map(days.map((day) => [day.date, pick(day)]))
  const points = lastDates(today).map((date) => byDate.get(date) ?? null)
  const values = points.filter((point): point is number => point != null)
  const before = values.slice(0, -1)
  let band: [number, number] | null = null
  if (before.length >= BAND_MIN_DAYS) {
    const mean = average(before)
    const spread = Math.max(standardDeviation(before), minSpread)
    band = [mean - spread, mean + spread]
  }
  return trendOf(points, band)
}

function dayBefore(iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Der neueste Tag mit diesem Wert, wenn er von heute oder gestern ist; dazu die Tage davor als Vergleich */
function latest(days: HealthDay[], today: string, pick: (day: HealthDay) => number | null) {
  const withValue = days
    .filter((day) => pick(day) != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const newest = withValue[0]
  if (!newest || newest.date < dayBefore(today)) return null
  const before = withValue.slice(1).map((day) => pick(day) as number)
  return { day: newest, value: pick(newest) as number, before }
}

/** Schlaf der letzten Nacht im Vergleich zum Schnitt der Tage davor */
export function sleepTile(days: HealthDay[], today: string): StatusTile | null {
  const last = latest(days, today, (day) => day.sleepMinutes)
  if (!last) return null
  let sub: string | null = null
  let tone: Tone = null
  if (last.before.length >= BASELINE_MIN_DAYS) {
    const mean = average(last.before)
    const diff = last.value - mean
    sub = `Schnitt ${hours(mean)}${diff >= 20 ? ' · ↑' : diff <= -20 ? ' · ↓' : ''}`
    if (diff <= -45) tone = 'warn'
  }
  if (last.day.sleepScore != null) {
    sub = sub ? `${sub} · Score ${last.day.sleepScore}` : `Score ${last.day.sleepScore}`
  }
  return {
    key: 'sleep',
    label: 'Schlaf',
    value: hours(last.value),
    sub,
    tone,
    trend: healthTrend(days, today, (day) => day.sleepMinutes, 20),
  }
}

/** Ruhepuls und HRV im Vergleich zum eigenen Schnitt: erhöhter Puls oder niedrige HRV heißt "weniger erholt" */
export function recoveryTile(days: HealthDay[], today: string): StatusTile | null {
  const pulse = latest(days, today, (day) => day.restingHeartRate)
  const hrv = latest(days, today, (day) => day.hrvMs ?? day.hrvSdnnMs)
  if (!pulse && !hrv) return null
  const notes: string[] = []
  let tone: Tone = null
  if (
    pulse &&
    pulse.before.length >= BASELINE_MIN_DAYS &&
    pulse.value >= average(pulse.before) + 5
  ) {
    notes.push('Puls erhöht')
    tone = 'warn'
  }
  if (hrv && hrv.before.length >= BASELINE_MIN_DAYS) {
    const ratio = hrv.value / average(hrv.before)
    if (ratio < 0.85) {
      notes.push('HRV niedrig')
      tone = 'warn'
    } else if (ratio > 1.15) {
      notes.push('HRV hoch')
    }
  }
  const baselineKnown =
    (pulse?.before.length ?? 0) >= BASELINE_MIN_DAYS ||
    (hrv?.before.length ?? 0) >= BASELINE_MIN_DAYS
  const verdict = notes.length ? notes.join(' · ') : baselineKnown ? 'normal' : null
  if (pulse) {
    const parts = [hrv ? `HRV ${Math.round(hrv.value)} ms` : null, verdict].filter(Boolean)
    return {
      key: 'recovery',
      label: 'Erholung',
      value: `${pulse.value} Ruhepuls`,
      sub: parts.length ? parts.join(' · ') : null,
      tone,
      trend: hrv
        ? healthTrend(days, today, (day) => day.hrvMs ?? day.hrvSdnnMs, 3)
        : healthTrend(days, today, (day) => day.restingHeartRate, 2),
    }
  }
  return {
    key: 'recovery',
    label: 'Erholung',
    value: `${Math.round(hrv!.value)} ms HRV`,
    sub: verdict,
    tone,
    trend: healthTrend(days, today, (day) => day.hrvMs ?? day.hrvSdnnMs, 3),
  }
}

/** Serie: Wochen in Folge mit fast allem erledigt – ohne Serie keine Kachel */
export function streakTile(progress: Progress): StatusTile | null {
  if (progress.streakWeeks <= 0) return null
  return {
    key: 'streak',
    label: 'Serie',
    value: `${progress.streakWeeks} Wo.`,
    sub: 'in Folge durchgezogen',
    tone: 'good',
  }
}

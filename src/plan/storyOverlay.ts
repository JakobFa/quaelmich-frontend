import type { ExtraRide, PlannedWorkout } from '../types/plan'
import { sportLabels } from '../types/plan'
import type { WorkoutStep } from '../types/workout'
import { powerZoneFor } from './zones'
import { formatDuration } from './weeks'

/** Was auf dem Overlay steht: Titel, Datum und bis zu vier Kennzahlen */
export type OverlayData = {
  title: string
  date: string
  stats: { label: string; value: string }[]
  /** z. B. "37 Tage bis Rund um Sachsen" */
  footer?: string
  /** Abschnitte des Trainings: werden als Profil (Intervallblöcke) über den Zahlen gezeichnet */
  steps?: WorkoutStep[]
}

export const OVERLAY_WIDTH = 1080
export const OVERLAY_HEIGHT = 1920

const MONTHS = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ']

/** 03.11.2026 → "3. NOV 2026" */
export function overlayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${day}. ${MONTHS[(month ?? 1) - 1]} ${year}`
}

/** "37 Tage bis <Event>" – leer, wenn das Event vorbei ist oder fehlt */
export function eventFooter(name: string | undefined, eventDate: string | undefined, today: string): string | undefined {
  if (!name || !eventDate) return undefined
  const days = Math.round((Date.parse(eventDate) - Date.parse(today)) / 86_400_000)
  if (days < 0) return undefined
  return days === 0 ? `Heute: ${name}` : `${days} ${days === 1 ? 'Tag' : 'Tage'} bis ${name}`
}

function tssText(tss: number, estimated: boolean | undefined): string {
  return `${estimated ? '≈' : ''}${tss}`
}

/** Gefahrene Einheit aus dem Plan; ohne gefahrene Werte gibt es kein Overlay */
export function plannedOverlay(planned: PlannedWorkout, footer?: string): OverlayData | null {
  const actual = planned.actual
  if (!actual) return null
  const stats: OverlayData['stats'] = []
  if (actual.durationMinutes) stats.push({ label: 'Dauer', value: formatDuration(actual.durationMinutes) })
  if (actual.distanceKm) {
    stats.push({ label: 'Distanz', value: `${actual.distanceKm.toLocaleString('de-DE')} km` })
  }
  if (actual.tss) stats.push({ label: 'TSS', value: tssText(actual.tss, actual.tssFromHeartRate) })
  if (stats.length === 0) return null
  const steps = planned.workout.steps?.length ? planned.workout.steps : undefined
  return { title: planned.workout.title, date: overlayDate(planned.date), stats, footer, steps }
}

/** Zusatzfahrt oder andere Sportart ohne geplantes Workout */
export function extraRideOverlay(ride: ExtraRide, footer?: string): OverlayData | null {
  const stats: OverlayData['stats'] = []
  if (ride.durationMinutes) stats.push({ label: 'Dauer', value: formatDuration(ride.durationMinutes) })
  if (ride.distanceKm) stats.push({ label: 'Distanz', value: `${ride.distanceKm.toLocaleString('de-DE')} km` })
  if (ride.tss) {
    stats.push({ label: 'TSS', value: tssText(ride.tss, ride.tssFromHeartRate || ride.tssFromDuration) })
  }
  if (stats.length === 0) return null
  const label = sportLabels[ride.sport ?? 'RIDE'].replace(/^\S+\s/, '') // Emoji vorne weg
  return { title: label, date: overlayDate(ride.date), stats, footer }
}

const FONTS = ['700 64px "Saira Stencil One"', '500 40px "Space Mono"', '800 120px "Barlow Condensed"']

async function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(FONTS.map((font) => document.fonts.load(font).catch(() => [])))
}

/** Abgeschrägte Ecke oben links und unten rechts wie in der App */
function cutCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cut: number) {
  ctx.beginPath()
  ctx.moveTo(x + cut, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - cut)
  ctx.lineTo(x + w - cut, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + cut)
  ctx.closePath()
}

/**
 * Zeichnet das Overlay (1080 × 1920, transparent) auf die Leinwand: halbtransparente Karte im unteren Drittel,
 * weiße Zahlen mit Schatten. Die Karte liegt tief, damit sie in der Instagram-Story nicht unter den Bedienelementen sitzt.
 */
export function drawOverlay(ctx: CanvasRenderingContext2D, data: OverlayData): void {
  const left = 90
  const width = OVERLAY_WIDTH - 2 * left
  const rowHeight = 170
  const header = 230
  const profile = data.steps && data.steps.length > 0 ? PROFILE_HEIGHT + 20 : 0
  const footer = data.footer ? 90 : 40
  const height = header + profile + data.stats.length * rowHeight + footer
  const top = OVERLAY_HEIGHT - 300 - height

  ctx.clearRect(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT)

  cutCard(ctx, left, top, width, height, 48)
  ctx.fillStyle = 'rgba(20, 22, 21, 0.68)'
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(220, 186, 247, 0.85)'
  ctx.stroke()

  // pinker Streifen links, wie ein Startnummer-Band
  ctx.fillStyle = '#ff5fb0'
  ctx.fillRect(left, top + 48, 14, height - 96)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 4
  ctx.textBaseline = 'alphabetic'

  const inner = left + 60
  ctx.fillStyle = '#dcbaf7'
  ctx.font = '500 34px "Space Mono", monospace'
  ctx.fillText(data.date, inner, top + 80)

  ctx.fillStyle = '#ffffff'
  ctx.font = '400 78px "Saira Stencil One", "Barlow Condensed", sans-serif'
  ctx.fillText(fit(ctx, data.title.toUpperCase(), width - 120), inner, top + 175)

  if (profile > 0 && data.steps) {
    drawProfile(ctx, data.steps, inner, top + header - 25, width - 120)
  }

  data.stats.forEach((stat, index) => {
    const y = top + header + profile + index * rowHeight
    ctx.fillStyle = '#dcbaf7'
    ctx.font = '500 32px "Space Mono", monospace'
    ctx.fillText(stat.label.toUpperCase(), inner, y + 30)
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 118px "Barlow Condensed", sans-serif'
    ctx.fillText(stat.value, inner, y + 135)
  })

  const base = top + height
  if (data.footer) {
    ctx.fillStyle = '#ff5fb0'
    ctx.font = '500 32px "Space Mono", monospace'
    ctx.fillText(fit(ctx, data.footer.toUpperCase(), width - 120), inner, base - 36)
  }
  // Wortmarke oben rechts auf der Höhe des Datums
  ctx.fillStyle = '#ffffff'
  ctx.font = '400 40px "Saira Stencil One", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('QUAELMICH', left + width - 50, top + 80)
  ctx.restore()
}

/** Höhe des Profils (Intervallblöcke) auf dem Overlay */
const PROFILE_HEIGHT = 190
/** 170 % FTP füllen die volle Höhe, wie im Plan */
const MAX_PERCENT = 170

/** Zeichnet die Abschnitte als farbige Balken in den Farben der Zonen, Rampen als Trapez */
function drawProfile(ctx: CanvasRenderingContext2D, steps: WorkoutStep[], x: number, y: number, width: number) {
  const total = steps.reduce((sum, step) => sum + step.durationSeconds, 0)
  if (total <= 0) return
  const gap = 3
  const base = y + PROFILE_HEIGHT
  const level = (percent: number) => base - (Math.min(percent, MAX_PERCENT) / MAX_PERCENT) * PROFILE_HEIGHT
  let left = x
  steps.forEach((step, index) => {
    const right = index === steps.length - 1 ? x + width : left + (step.durationSeconds / total) * width
    const barRight = Math.max(left + 2, right - gap)
    ctx.beginPath()
    ctx.moveTo(left, base)
    ctx.lineTo(left, level(step.powerStartPercent))
    ctx.lineTo(barRight, level(step.powerEndPercent))
    ctx.lineTo(barRight, base)
    ctx.closePath()
    ctx.fillStyle = powerZoneFor((step.powerStartPercent + step.powerEndPercent) / 2).color
    ctx.fill()
    left = right
  })
  // Grundlinie
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.fillRect(x, base + 3, width, 3)
}

/** Kürzt den Text mit "…", bis er in die Breite passt */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let shorter = text
  while (shorter.length > 1 && ctx.measureText(`${shorter}…`).width > maxWidth) {
    shorter = shorter.slice(0, -1)
  }
  return `${shorter.trimEnd()}…`
}

/** Rendert das Overlay als PNG mit durchsichtigem Hintergrund */
export async function renderOverlayBlob(data: OverlayData): Promise<Blob> {
  await loadFonts()
  const canvas = document.createElement('canvas')
  canvas.width = OVERLAY_WIDTH
  canvas.height = OVERLAY_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Leinwand nicht verfügbar')
  drawOverlay(ctx, data)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG konnte nicht erzeugt werden'))), 'image/png'),
  )
}

/** Teilen-Dialog (Handy: direkt in Instagram), sonst Download; gibt zurück, was passiert ist */
export async function shareOverlay(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'shared' // abgebrochen: nichts herunterladen
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

export function overlayFilename(data: OverlayData): string {
  const slug = data.title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '')
  return `quaelmich-${slug || 'fahrt'}.png`
}

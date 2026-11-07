<script setup lang="ts">
import { computed } from 'vue'

import { smoothTrace, targetSegments, TRACE_SECONDS } from '../plan/rideTargets'
import type { IntervalAccuracy } from '../types/plan'
import type { WorkoutStep } from '../types/workout'

/**
 * Deine Kurve über den Zielbereichen der ganzen Einheit – wie die Trainingsanalyse bei Strava, aber die Ziele
 * stehen dort, wo quaelmich die Intervalle in der Fahrt gefunden hat, nicht nach Plan-Zeit. Einrollen, Pausen und
 * Ausrollen hängen davor, dazwischen und dahinter. So passt es auch mit Anfahrt, übersprungenem Einrollen oder
 * Ampelstopps. Ohne Abschnitte (oder nach Puls) nur die Intervalle.
 */
const props = defineProps<{ accuracy: IntervalAccuracy; steps?: WorkoutStep[] }>()

const WIDTH = 600
const HEIGHT = 220
const PAD = { left: 40, right: 8, top: 18, bottom: 24 }

const unit = computed(() => (props.accuracy.basis === 'HEART_RATE' ? 'bpm' : 'W'))
const trace = computed(() => props.accuracy.trace ?? [])

/** die ganze Fahrt */
const range = computed(() => ({ from: 0, to: trace.value.length * TRACE_SECONDS }))

/** Ziele der Abschnitte ohne Intervalle (die Intervalle zeichnen die Bänder unten, mit Urteil) */
const stepSegments = computed(() =>
  props.steps
    ? targetSegments(props.steps, props.accuracy, range.value.to).filter((seg) => seg.kind !== 'INTERVAL')
    : [],
)

const visible = computed(() => {
  const { from, to } = range.value
  return smoothed.value
    .map((value, index) => ({ second: index * TRACE_SECONDS, value }))
    .filter((point) => point.second >= from && point.second < to)
})

/** Für die Anzeige auf 30 s geglättet (Nachbarpunkte), Stillstand bleibt eine Lücke */
const smoothed = computed(() => smoothTrace(trace.value))

/** Oben genug Platz für Ziele und Spitzen, aber einzelne Sprints sollen die Skala nicht plattdrücken */
const yMax = computed(() => {
  const values = visible.value
    .map((p) => p.value)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  const p95 = values[Math.floor(values.length * 0.95)] ?? 0
  const targets = props.accuracy.blocks.map((b) => b.targetHigh ?? b.targetLow * 1.2)
  const steps = stepSegments.value.map((seg) => Math.max(seg.highStart ?? 0, seg.highEnd ?? 0))
  return Math.ceil((Math.max(p95, ...targets, ...steps) * 1.1) / 50) * 50
})
const yMin = computed(() => (props.accuracy.basis === 'HEART_RATE' ? 80 : 0))

function x(second: number) {
  const { from, to } = range.value
  return PAD.left + ((second - from) / Math.max(1, to - from)) * (WIDTH - PAD.left - PAD.right)
}

function y(value: number) {
  const clamped = Math.min(Math.max(value, yMin.value), yMax.value)
  return (
    PAD.top +
    (1 - (clamped - yMin.value) / (yMax.value - yMin.value)) * (HEIGHT - PAD.top - PAD.bottom)
  )
}

/** Linienstücke – bei Stillstand (null) wird die Linie unterbrochen */
const segments = computed(() => {
  const result: string[] = []
  let current: string[] = []
  for (const point of visible.value) {
    if (point.value === null) {
      if (current.length > 1) result.push(current.join(' '))
      current = []
      continue
    }
    current.push(`${x(point.second + TRACE_SECONDS / 2).toFixed(1)},${y(point.value).toFixed(1)}`)
  }
  if (current.length > 1) result.push(current.join(' '))
  return result
})

const bands = computed(() =>
  props.accuracy.blocks.map((block) => {
    const top = block.targetHigh ?? yMax.value
    return {
      ...block,
      x: x(block.startSecond),
      width: x(block.startSecond + block.durationSeconds) - x(block.startSecond),
      y: y(top),
      height: y(block.targetLow) - y(top),
    }
  }),
)

/** Rampen als Trapez: oben das Ende des Zielbereichs, unten der Anfang */
const stepBands = computed(() =>
  stepSegments.value.map((seg) => {
    const left = x(seg.start)
    const right = Math.max(left + 1, x(seg.end))
    const top = (value: number | null) => y(value ?? yMax.value)
    return {
      key: `${seg.start}-${seg.kind}`,
      kind: seg.kind,
      points: [
        `${left.toFixed(1)},${top(seg.highStart).toFixed(1)}`,
        `${right.toFixed(1)},${top(seg.highEnd).toFixed(1)}`,
        `${right.toFixed(1)},${y(seg.lowEnd).toFixed(1)}`,
        `${left.toFixed(1)},${y(seg.lowStart).toFixed(1)}`,
      ].join(' '),
      title: `${stepLabels[seg.kind]}: Ziel ${seg.lowStart}–${seg.highStart ?? ''} ${unit.value}`,
    }
  }),
)

const stepLabels: Record<string, string> = {
  WARMUP: 'Einrollen',
  STEADY: 'Grundlage',
  RECOVERY: 'Pause',
  COOLDOWN: 'Ausrollen',
}

const ticks = computed(() => {
  const step = yMax.value - yMin.value > 300 ? 100 : 50
  const result: number[] = []
  for (let value = Math.ceil(yMin.value / step) * step; value <= yMax.value; value += step)
    result.push(value)
  return result
})

const minute = (second: number) => `${Math.round(second / 60)}′`

const label = computed(
  () =>
    `Deine ${props.accuracy.basis === 'HEART_RATE' ? 'Pulskurve' : 'Wattkurve'} über den Zielbereichen: ` +
    props.accuracy.blocks
      .map(
        (b) =>
          `Intervall ${b.number} ab Minute ${Math.round(b.startSecond / 60)}, ${b.actual} ${unit.value}`,
      )
      .join('; '),
)
</script>

<template>
  <figure v-if="trace.length > 0" class="overlay">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="label">
      <g class="grid">
        <template v-for="tick in ticks" :key="tick">
          <line :x1="PAD.left" :x2="WIDTH - PAD.right" :y1="y(tick)" :y2="y(tick)" />
          <text :x="PAD.left - 6" :y="y(tick) + 4" text-anchor="end">{{ tick }}</text>
        </template>
        <text :x="PAD.left - 6" :y="PAD.top - 6" text-anchor="end">{{ unit }}</text>
      </g>

      <polygon v-for="band in stepBands" :key="band.key" :points="band.points" class="step-band">
        <title>{{ band.title }}</title>
      </polygon>

      <g v-for="band in bands" :key="band.number" class="band" :class="band.verdict.toLowerCase()">
        <rect :x="band.x" :y="band.y" :width="band.width" :height="band.height">
          <title>
            Intervall {{ band.number }}: Ziel {{ band.targetLow
            }}{{ band.targetHigh ? `–${band.targetHigh}` : '+' }} {{ unit }}, gefahren
            {{ band.actual }}
            {{ unit }}
          </title>
        </rect>
        <text :x="band.x + band.width / 2" :y="PAD.top - 5" text-anchor="middle" class="band-label">
          #{{ band.number }}
        </text>
        <text :x="band.x" :y="HEIGHT - 8" text-anchor="start" class="axis">
          {{ minute(band.startSecond) }}
        </text>
      </g>

      <polyline v-for="(points, index) in segments" :key="index" :points="points" class="trace" />
    </svg>
    <figcaption>
      <span class="key key-band"></span> Zielbereich der Intervalle, dort eingezeichnet, wo du sie
      gefahren bist<template v-if="stepBands.length">
        · <span class="key key-step"></span> Einrollen, Pausen, Ausrollen</template
      >
      · <span class="key key-trace"></span> deine {{ unit === 'W' ? 'Watt' : 'Puls' }} (30-s-Schnitt) ·
      Minuten seit Start
    </figcaption>
  </figure>
</template>

<style scoped>
.overlay {
  margin: 12px 0;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--color-ink);
}

.grid line {
  stroke: var(--color-panel-raised);
  stroke-width: 1;
}

.grid text,
.axis {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--color-text-muted);
}

.band rect {
  fill: var(--color-lilac);
  fill-opacity: 0.28;
  stroke: var(--color-lilac);
  stroke-width: 1;
}

.step-band {
  fill: var(--color-lilac);
  fill-opacity: 0.12;
  stroke: var(--color-lilac);
  stroke-opacity: 0.35;
  stroke-width: 1;
}

.band-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  fill: var(--color-lilac);
}

.band.on_target .step-band {
  fill: var(--color-lilac);
  fill-opacity: 0.12;
  stroke: var(--color-lilac);
  stroke-opacity: 0.35;
  stroke-width: 1;
}

.band-label {
  fill: #35b86b;
}

.band.hard .band-label,
.band.easy .step-band {
  fill: var(--color-lilac);
  fill-opacity: 0.12;
  stroke: var(--color-lilac);
  stroke-opacity: 0.35;
  stroke-width: 1;
}

.band-label {
  fill: var(--color-hot);
}

.band.slightly_hard .band-label,
.band.slightly_easy .step-band {
  fill: var(--color-lilac);
  fill-opacity: 0.12;
  stroke: var(--color-lilac);
  stroke-opacity: 0.35;
  stroke-width: 1;
}

.band-label {
  fill: #f4c430;
}

.trace {
  fill: none;
  stroke: var(--color-hot);
  stroke-width: 2;
  stroke-linejoin: round;
}

figcaption {
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.key {
  display: inline-block;
  width: 14px;
  height: 8px;
  margin-right: 2px;
  vertical-align: middle;
}

.key-band {
  background: var(--color-lilac);
  opacity: 0.6;
}

.key-step {
  background: var(--color-lilac);
  opacity: 0.25;
}

.key-trace {
  height: 2px;
  background: var(--color-hot);
}
</style>

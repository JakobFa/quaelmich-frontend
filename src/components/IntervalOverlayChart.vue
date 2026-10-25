<script setup lang="ts">
import { computed } from 'vue'

import type { IntervalAccuracy } from '../types/plan'

/**
 * Deine Kurve über den Zielbereichen der Intervalle – wie die Trainingsanalyse bei Strava, aber die Ziele
 * stehen dort, wo quaelmich die Intervalle in der Fahrt gefunden hat, nicht nach Plan-Zeit. So passt es auch
 * mit Anfahrt, übersprungenem Einrollen oder Ampelstopps.
 */
const props = defineProps<{ accuracy: IntervalAccuracy }>()

/** Sekunden je Punkt der Kurve (wie im Backend) */
const TRACE_SECONDS = 10
/** so viel vor dem ersten und nach dem letzten Intervall wird noch gezeigt */
const MARGIN_SECONDS = 8 * 60

const WIDTH = 600
const HEIGHT = 220
const PAD = { left: 40, right: 8, top: 18, bottom: 24 }

const unit = computed(() => (props.accuracy.basis === 'HEART_RATE' ? 'bpm' : 'W'))
const trace = computed(() => props.accuracy.trace ?? [])

const range = computed(() => {
  const blocks = props.accuracy.blocks
  const first = Math.min(...blocks.map((b) => b.startSecond))
  const last = Math.max(...blocks.map((b) => b.startSecond + b.durationSeconds))
  return {
    from: Math.max(0, first - MARGIN_SECONDS),
    to: Math.min(trace.value.length * TRACE_SECONDS, last + MARGIN_SECONDS),
  }
})

const visible = computed(() => {
  const { from, to } = range.value
  return smoothed.value
    .map((value, index) => ({ second: index * TRACE_SECONDS, value }))
    .filter((point) => point.second >= from && point.second < to)
})

/** Für die Anzeige auf 30 s geglättet (Nachbarpunkte), Stillstand bleibt eine Lücke */
const smoothed = computed(() =>
  trace.value.map((value, index) => {
    if (value === null) return null
    const around = [trace.value[index - 1], value, trace.value[index + 1]].filter(
      (v): v is number => v !== null && v !== undefined,
    )
    return Math.round(around.reduce((sum, v) => sum + v, 0) / around.length)
  }),
)

/** Oben genug Platz für Ziele und Spitzen, aber einzelne Sprints sollen die Skala nicht plattdrücken */
const yMax = computed(() => {
  const values = visible.value
    .map((p) => p.value)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  const p95 = values[Math.floor(values.length * 0.95)] ?? 0
  const targets = props.accuracy.blocks.map((b) => b.targetHigh ?? b.targetLow * 1.2)
  return Math.ceil((Math.max(p95, ...targets) * 1.1) / 50) * 50
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
      <span class="key key-band"></span> Zielbereich, dort eingezeichnet, wo du das Intervall
      gefahren bist · <span class="key key-trace"></span> deine {{ unit === 'W' ? 'Watt' : 'Puls' }}
      (30-s-Schnitt) · Minuten seit Start
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

.band-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  fill: var(--color-lilac);
}

.band.on_target .band-label {
  fill: #35b86b;
}

.band.hard .band-label,
.band.easy .band-label {
  fill: var(--color-hot);
}

.band.slightly_hard .band-label,
.band.slightly_easy .band-label {
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

.key-trace {
  height: 2px;
  background: var(--color-hot);
}
</style>

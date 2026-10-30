<script setup lang="ts">
import { computed } from 'vue'

import type { SteadyHold } from '../types/plan'

/**
 * Deine Kurve über dem Zielbereich einer lockeren Fahrt – wie bei den Intervallen, nur dass das Band über die
 * ganze Fahrt läuft: Alles im Band ist locker genug, alles darüber war zu hart.
 */
const props = defineProps<{ hold: SteadyHold }>()

/** Sekunden je Punkt der Kurve (wie im Backend) */
const TRACE_SECONDS = 10

const WIDTH = 600
const HEIGHT = 220
const PAD = { left: 40, right: 8, top: 18, bottom: 24 }

const unit = computed(() => (props.hold.basis === 'HEART_RATE' ? 'bpm' : 'W'))
const trace = computed(() => props.hold.trace ?? [])
const totalSeconds = computed(() => trace.value.length * TRACE_SECONDS)

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

/** Oben genug Platz fürs Band und für Spitzen, einzelne Ausreißer drücken die Skala nicht platt */
const yMax = computed(() => {
  const values = smoothed.value.filter((v): v is number => v !== null).sort((a, b) => a - b)
  const p98 = values[Math.floor(values.length * 0.98)] ?? 0
  return Math.ceil((Math.max(p98, props.hold.targetHigh) * 1.1) / 50) * 50
})
const yMin = computed(() => (props.hold.basis === 'HEART_RATE' ? 60 : 0))

function x(second: number) {
  return PAD.left + (second / Math.max(1, totalSeconds.value)) * (WIDTH - PAD.left - PAD.right)
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
  smoothed.value.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) result.push(current.join(' '))
      current = []
      return
    }
    const second = index * TRACE_SECONDS + TRACE_SECONDS / 2
    current.push(`${x(second).toFixed(1)},${y(value).toFixed(1)}`)
  })
  if (current.length > 1) result.push(current.join(' '))
  return result
})

const band = computed(() => ({
  x: x(0),
  width: x(totalSeconds.value) - x(0),
  y: y(props.hold.targetHigh),
  height: y(props.hold.targetLow) - y(props.hold.targetHigh),
}))

const ticks = computed(() => {
  const step = yMax.value - yMin.value > 300 ? 100 : 50
  const result: number[] = []
  for (let value = Math.ceil(yMin.value / step) * step; value <= yMax.value; value += step)
    result.push(value)
  return result
})

/** Minuten-Beschriftung unten: nicht mehr als etwa 8 */
const minuteTicks = computed(() => {
  const minutes = totalSeconds.value / 60
  const step = [5, 10, 15, 30, 60].find((candidate) => minutes / candidate <= 8) ?? 60
  const result: number[] = []
  for (let minute = 0; minute <= minutes; minute += step) result.push(minute)
  return result
})

const label = computed(
  () =>
    `Deine ${props.hold.basis === 'HEART_RATE' ? 'Pulskurve' : 'Wattkurve'} über dem Zielbereich ` +
    `${props.hold.targetLow} bis ${props.hold.targetHigh} ${unit.value}: ` +
    `${props.hold.percentInZone} % der Zeit im Bereich, ${props.hold.percentAbove} % darüber`,
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

      <g class="band" :class="hold.hold.toLowerCase()">
        <rect :x="band.x" :y="band.y" :width="band.width" :height="band.height">
          <title>
            Zielbereich {{ hold.targetLow }}–{{ hold.targetHigh }} {{ unit }}, Ø {{ hold.average }}
            {{ unit }}
          </title>
        </rect>
      </g>

      <text
        v-for="minute in minuteTicks"
        :key="minute"
        :x="x(minute * 60)"
        :y="HEIGHT - 8"
        text-anchor="middle"
        class="axis"
      >
        {{ minute }}′
      </text>

      <polyline v-for="(points, index) in segments" :key="index" :points="points" class="trace" />
    </svg>
    <figcaption>
      <span class="key key-band"></span> Zielbereich · <span class="key key-trace"></span> deine
      {{ unit === 'W' ? 'Watt' : 'Puls' }} (30-s-Schnitt) · Minuten seit Start
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

.band.steady rect {
  fill: #35b86b;
  fill-opacity: 0.22;
  stroke: #35b86b;
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

<script setup lang="ts">
import { computed } from 'vue'

import type { Tone, Trend } from '../plan/status'

/**
 * Mini-Verlauf in einer Statuskachel: Linie der letzten Tage, dahinter der eigene Normalbereich
 * (oder bei der Form die Nulllinie), der heutige Wert als Punkt in der Farbe der Bewertung.
 */
const props = defineProps<{ trend: Trend; tone: Tone }>()

const WIDTH = 120
const HEIGHT = 30
const PAD = 4

const scale = computed(() => {
  const values = props.trend.points.filter((point): point is number => point != null)
  if (props.trend.band) values.push(...props.trend.band)
  if (props.trend.zeroLine) values.push(0)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (max - min < 1e-6) {
    min -= 1
    max += 1
  }
  const last = props.trend.points.length - 1
  return {
    x: (index: number) => (last > 0 ? (index / last) * WIDTH : WIDTH),
    y: (value: number) => PAD + (1 - (value - min) / (max - min)) * (HEIGHT - 2 * PAD),
  }
})

/** Lücken (Tage ohne Wert) unterbrechen die Linie nicht, sie wird nur über die vorhandenen Tage gezogen */
const path = computed(() =>
  props.trend.points
    .map((point, index) => (point == null ? null : [scale.value.x(index), scale.value.y(point)]))
    .filter((point): point is number[] => point != null)
    .map(([x, y], index) => `${index ? 'L' : 'M'}${x!.toFixed(1)} ${y!.toFixed(1)}`)
    .join(' '),
)

const band = computed(() => {
  if (!props.trend.band) return null
  const top = scale.value.y(props.trend.band[1])
  return { y: top, height: scale.value.y(props.trend.band[0]) - top }
})

const zeroY = computed(() => (props.trend.zeroLine ? scale.value.y(0) : null))

const lastPoint = computed(() => {
  for (let index = props.trend.points.length - 1; index >= 0; index--) {
    const point = props.trend.points[index]
    if (point != null) return { x: scale.value.x(index), y: scale.value.y(point) }
  }
  return null
})
</script>

<template>
  <svg
    class="trend"
    :class="tone"
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    preserveAspectRatio="none"
    aria-hidden="true"
    data-test="trend"
  >
    <rect
      v-if="band"
      class="band"
      x="0"
      :y="band.y"
      :width="WIDTH"
      :height="band.height"
      data-test="trend-band"
    />
    <line
      v-if="zeroY != null"
      class="zero"
      x1="0"
      :y1="zeroY"
      :x2="WIDTH"
      :y2="zeroY"
      vector-effect="non-scaling-stroke"
    />
    <path class="line" :d="path" vector-effect="non-scaling-stroke" />
    <line
      v-if="lastPoint"
      class="dot"
      :x1="lastPoint.x"
      :y1="lastPoint.y"
      :x2="lastPoint.x"
      :y2="lastPoint.y"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.trend {
  display: block;
  width: 100%;
  height: 30px;
  margin: 4px 0 2px;
  overflow: visible;
}

.band {
  fill: #35b86b;
  opacity: 0.3;
}

.zero {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.line {
  fill: none;
  stroke: var(--color-lilac-dim);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.dot {
  stroke: var(--color-lilac);
  stroke-width: 7;
  stroke-linecap: round;
}

.good .dot {
  stroke: #35b86b;
}

.warn .dot {
  stroke: #f4c430;
}

.bad .dot {
  stroke: var(--color-hot);
}
</style>

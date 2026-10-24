<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { FormCurve, FormDay } from '../api'
import { formStateOf } from '../plan/form'

/**
 * Fitness & Ermüdung (oben, gleiche Skala) und Form (unten, eigene Skala um 0) – zwei Diagramme statt
 * zwei y-Achsen. Bis heute durchgezogen, danach gestrichelt (geplant). Fadenkreuz mit allen Werten.
 */
const props = defineProps<{ curve: FormCurve }>()

/** Breite in echten Pixeln (folgt dem Container) – so bleibt die Schrift auch auf dem Handy lesbar */
const W = ref(700)
const plot = ref<HTMLDivElement | null>(null)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!plot.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => (W.value = Math.max(280, entry!.contentRect.width)))
  observer.observe(plot.value)
})
onBeforeUnmount(() => observer?.disconnect())
const PAD = { left: 36, right: 12 }
const TOP_H = 170
const BOTTOM_H = 110
const GAP = 26

const days = computed(() => props.curve.days)
const todayIndex = computed(() => days.value.findIndex((d) => d.date === props.curve.today?.date))
const eventIndex = computed(() => days.value.findIndex((d) => d.date === props.curve.eventDate))

function x(index: number) {
  const n = Math.max(1, days.value.length - 1)
  return PAD.left + (index / n) * (W.value - PAD.left - PAD.right)
}

// ---------- oben: Fitness & Ermüdung ----------

const topMax = computed(() => {
  const max = Math.max(10, ...days.value.map((d) => Math.max(d.fitness, d.fatigue)))
  return Math.ceil(max / 20) * 20
})

function yTop(value: number) {
  return 10 + (1 - value / topMax.value) * (TOP_H - 20)
}

// ---------- unten: Form ----------

const formRange = computed(() => {
  const values = days.value.map((d) => d.form)
  const limit = Math.max(20, ...values.map((v) => Math.abs(v)))
  return Math.ceil(limit / 10) * 10
})

const bottomTop = TOP_H + GAP

function yForm(value: number) {
  return bottomTop + 8 + ((formRange.value - value) / (2 * formRange.value)) * (BOTTOM_H - 16)
}

/** Linie in zwei Teilen: gefahren (durchgezogen) und geplant (gestrichelt) */
function paths(value: (d: FormDay) => number, y: (v: number) => number) {
  const split = todayIndex.value < 0 ? days.value.length - 1 : todayIndex.value
  const point = (d: FormDay, i: number) => `${x(i).toFixed(1)},${y(value(d)).toFixed(1)}`
  const past = days.value.slice(0, split + 1).map((d, i) => point(d, i))
  const future = days.value.slice(split).map((d, i) => point(d, i + split))
  return {
    past: past.length > 1 ? `M${past.join('L')}` : '',
    future: future.length > 1 ? `M${future.join('L')}` : '',
  }
}

const fitnessPath = computed(() => paths((d) => d.fitness, yTop))
const fatiguePath = computed(() => paths((d) => d.fatigue, yTop))
const formPath = computed(() => paths((d) => d.form, yForm))

/** Monatsanfänge als x-Beschriftung */
const monthTicks = computed(() =>
  days.value
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.date.endsWith('-01'))
    .map(({ d, i }) => ({
      x: x(i),
      label: new Date(d.date).toLocaleDateString('de-DE', { month: 'short' }),
    })),
)

// ---------- Fadenkreuz ----------

const hover = ref<number | null>(null)
const svg = ref<SVGSVGElement | null>(null)

function onMove(event: PointerEvent) {
  const box = svg.value!.getBoundingClientRect()
  const px = ((event.clientX - box.left) / box.width) * W.value
  const n = days.value.length - 1
  const index = Math.round(((px - PAD.left) / (W.value - PAD.left - PAD.right)) * n)
  hover.value = Math.max(0, Math.min(n, index))
}

const hovered = computed(() => (hover.value === null ? null : days.value[hover.value]!))

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function sign(value: number) {
  const rounded = Math.round(value)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

/** Tabelle: eine Zeile pro Woche (Montag) */
const weeklyRows = computed(() =>
  days.value.filter((d) => new Date(d.date).getDay() === 1 || d.date === props.curve.today?.date),
)
</script>

<template>
  <figure class="form-chart">
    <ul class="legend">
      <li><span class="key fitness"></span>Fitness</li>
      <li><span class="key fatigue"></span>Ermüdung</li>
      <li><span class="key planned"></span>geplant</li>
    </ul>

    <div ref="plot" class="plot">
      <svg
        ref="svg"
        :viewBox="`0 0 ${W} ${TOP_H + GAP + BOTTOM_H + 18}`"
        role="img"
        aria-label="Fitness, Ermüdung und Form über die Zeit"
        @pointermove="onMove"
        @pointerleave="hover = null"
      >
        <!-- Raster oben -->
        <g class="grid">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="yTop(0)" :y2="yTop(0)" />
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="yTop(topMax / 2)" :y2="yTop(topMax / 2)" />
          <text :x="PAD.left - 6" :y="yTop(topMax / 2) + 4" text-anchor="end">
            {{ topMax / 2 }}
          </text>
          <text :x="PAD.left - 6" :y="yTop(topMax) + 4" text-anchor="end">{{ topMax }}</text>
        </g>

        <!-- heute & Event -->
        <g v-if="todayIndex >= 0" class="marker">
          <line :x1="x(todayIndex)" :x2="x(todayIndex)" y1="4" :y2="bottomTop + BOTTOM_H" />
          <text :x="x(todayIndex) + 4" y="12">heute</text>
        </g>
        <g v-if="eventIndex >= 0" class="marker event">
          <line :x1="x(eventIndex)" :x2="x(eventIndex)" y1="4" :y2="bottomTop + BOTTOM_H" />
          <text :x="x(eventIndex) - 4" y="12" text-anchor="end">Event</text>
        </g>

        <path class="line fitness" :d="fitnessPath.past" />
        <path class="line fitness dashed" :d="fitnessPath.future" />
        <path class="line fatigue" :d="fatiguePath.past" />
        <path class="line fatigue dashed" :d="fatiguePath.future" />

        <!-- unten: Form -->
        <text class="chart-title" :x="PAD.left" :y="bottomTop - 6">Form (Fitness − Ermüdung)</text>
        <rect
          class="fresh-band"
          :x="PAD.left"
          :width="W - PAD.left - PAD.right"
          :y="yForm(25)"
          :height="yForm(5) - yForm(25)"
        />
        <text class="band-label" :x="W - PAD.right - 4" :y="yForm(25) + 12" text-anchor="end">
          frisch
        </text>
        <g class="grid">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="yForm(0)" :y2="yForm(0)" class="zero" />
          <text :x="PAD.left - 6" :y="yForm(0) + 4" text-anchor="end">0</text>
          <text :x="PAD.left - 6" :y="yForm(formRange) + 4" text-anchor="end">
            +{{ formRange }}
          </text>
          <text :x="PAD.left - 6" :y="yForm(-formRange) + 4" text-anchor="end">
            −{{ formRange }}
          </text>
        </g>
        <path class="line form" :d="formPath.past" />
        <path class="line form dashed" :d="formPath.future" />

        <!-- Monate -->
        <g class="grid">
          <text
            v-for="tick in monthTicks"
            :key="tick.x"
            :x="tick.x"
            :y="bottomTop + BOTTOM_H + 14"
            text-anchor="middle"
          >
            {{ tick.label }}
          </text>
        </g>

        <!-- Fadenkreuz -->
        <g v-if="hover !== null" class="crosshair">
          <line :x1="x(hover)" :x2="x(hover)" y1="4" :y2="bottomTop + BOTTOM_H" />
          <circle class="dot fitness" :cx="x(hover)" :cy="yTop(hovered!.fitness)" r="4" />
          <circle class="dot fatigue" :cx="x(hover)" :cy="yTop(hovered!.fatigue)" r="4" />
          <circle class="dot form" :cx="x(hover)" :cy="yForm(hovered!.form)" r="4" />
        </g>
        <rect
          class="hit"
          :x="PAD.left"
          y="0"
          :width="W - PAD.left - PAD.right"
          :height="bottomTop + BOTTOM_H"
        />
      </svg>

      <div
        v-if="hovered"
        class="tooltip"
        :class="{ left: hover! > days.length / 2 }"
        :style="{ left: `${(x(hover!) / W) * 100}%` }"
      >
        <p class="tip-date">
          {{ formatDay(hovered.date) }}{{ hovered.planned ? ' · geplant' : '' }}
        </p>
        <p>
          <span class="key fitness"></span
          ><strong>{{ Math.round(hovered.fitness) }}</strong> Fitness
        </p>
        <p>
          <span class="key fatigue"></span
          ><strong>{{ Math.round(hovered.fatigue) }}</strong> Ermüdung
        </p>
        <p>
          <span class="key form"></span><strong>{{ sign(hovered.form) }}</strong> Form ·
          {{ formStateOf(hovered.form).label }}
        </p>
        <p class="tip-tss">{{ hovered.tss }} TSS an dem Tag</p>
      </div>
    </div>

    <details class="table-view">
      <summary>Als Tabelle</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Woche ab</th>
            <th scope="col">Fitness</th>
            <th scope="col">Ermüdung</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in weeklyRows" :key="day.date" :class="{ planned: day.planned }">
            <td>{{ formatDay(day.date) }}{{ day.planned ? ' (geplant)' : '' }}</td>
            <td>{{ Math.round(day.fitness) }}</td>
            <td>{{ Math.round(day.fatigue) }}</td>
            <td>{{ sign(day.form) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.form-chart {
  --fitness: #3987e5;
  --fatigue: #d95926;
  --form: #9085e9;
  margin: 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0 0 6px;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key {
  display: inline-block;
  width: 16px;
  height: 0;
  border-top: 2px solid var(--color-text-muted);
  vertical-align: middle;
}

.key.fitness {
  border-color: var(--fitness);
}

.key.fatigue {
  border-color: var(--fatigue);
}

.key.form {
  border-color: var(--form);
}

.key.planned {
  border-top-style: dashed;
}

.plot {
  position: relative;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
}

.grid line {
  stroke: var(--color-panel-raised);
  stroke-width: 1;
}

.grid line.zero {
  stroke: var(--color-text-muted);
  stroke-opacity: 0.5;
}

.grid text,
.chart-title,
.band-label,
.marker text {
  fill: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.chart-title {
  font-size: 11px;
}

.fresh-band {
  fill: var(--color-text-muted);
  fill-opacity: 0.08;
}

.marker line {
  stroke: var(--color-text-muted);
  stroke-dasharray: 2 3;
}

.marker.event line {
  stroke: var(--color-lilac);
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.line.dashed {
  stroke-dasharray: 5 4;
  stroke-opacity: 0.7;
}

.line.fitness,
.dot.fitness {
  stroke: var(--fitness);
}

.line.fatigue,
.dot.fatigue {
  stroke: var(--fatigue);
}

.line.form,
.dot.form {
  stroke: var(--form);
}

.dot {
  fill: var(--color-panel);
  stroke-width: 2;
}

.crosshair line {
  stroke: var(--color-text);
  stroke-opacity: 0.4;
}

.hit {
  fill: transparent;
  cursor: crosshair;
}

.tooltip {
  position: absolute;
  top: 8px;
  transform: translateX(12px);
  min-width: 150px;
  padding: 8px 10px;
  border: 1px solid var(--color-panel-raised);
  background: var(--color-ink);
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 2;
}

.tooltip.left {
  transform: translateX(calc(-100% - 12px));
}

.tooltip p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 2px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.tooltip strong {
  color: var(--color-text);
  font-family: var(--font-mono);
}

.tip-date {
  font-family: var(--font-mono);
  font-size: 0.7rem;
}

.tip-tss {
  font-size: 0.7rem;
}

.table-view {
  margin-top: 8px;
  font-size: 0.8rem;
}

.table-view summary {
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  cursor: pointer;
}

.table-view table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-family: var(--font-mono);
}

.table-view th,
.table-view td {
  padding: 4px 6px;
  text-align: right;
  border-bottom: 1px solid var(--color-panel-raised);
}

.table-view th:first-child,
.table-view td:first-child {
  text-align: left;
}

.table-view tr.planned {
  color: var(--color-text-muted);
}
</style>

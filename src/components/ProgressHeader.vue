<script setup lang="ts">
import { computed } from 'vue'

import type { Progress } from '../api'
import { mondayOf, type PlanWeek } from '../plan/weeks'
import { phaseLabels, type Phase } from '../types/plan'

const props = defineProps<{
  progress: Progress
  weeks: PlanWeek[]
  /** heute als "YYYY-MM-DD" */
  today: string
  /** aktuell angezeigte Woche (wird hervorgehoben) */
  selectedWeek: number
}>()

const emit = defineEmits<{ 'select-week': [index: number] }>()

const DAY_MS = 24 * 60 * 60 * 1000

/** Wochen ohne Workouts (z. B. ganz am Ende) bekommen die Phase der Woche davor */
const segments = computed(() => {
  let last: Phase = 'BASE'
  return props.weeks.map((week, index) => {
    last = week.phase ?? (index === props.weeks.length - 1 ? 'TAPER' : last)
    return { index, phase: last, monday: week.monday }
  })
})

/** Wie viel der Plan-Zeit schon vorbei ist, in Prozent */
const elapsedPercent = computed(() => {
  if (props.weeks.length === 0) return 0
  const start = new Date(props.weeks[0]!.monday).getTime()
  const total = props.weeks.length * 7 * DAY_MS
  const elapsed = new Date(props.today).getTime() - start + DAY_MS // heute zählt mit
  return Math.round(Math.min(1, Math.max(0, elapsed / total)) * 100)
})

const currentWeek = computed(() => {
  const index = props.weeks.findIndex((week) => week.monday === mondayOf(props.today))
  return index >= 0 ? index : null
})

/** Einschätzung der letzten 7 Tage: zu wenig, auf Kurs, zu viel */
const loadLabels = {
  TOO_LITTLE: {
    title: '▼ Etwas wenig',
    hint: 'Kein Drama – nicht nachholen, einfach normal weitermachen.',
  },
  ON_TRACK: { title: '✓ Auf Kurs', hint: 'Belastung passt zum Plan.' },
  A_BIT_MUCH: { title: '▲ Etwas viel', hint: 'Achte auf Schlaf und lockere Tage.' },
  TOO_MUCH: {
    title: '▲▲ Zu viel',
    hint: 'Gönn dir Erholung – quaelmich macht das nächste harte Training schon leichter.',
  },
  RESTING: { title: 'Ruhephase', hint: 'Gerade steht nichts an.' },
} as const
const load = computed(() => props.progress.load ?? null)

/** Legende: die vorkommenden Phasen in Reihenfolge */
const legend = computed(() => [...new Set(segments.value.map((segment) => segment.phase))])
</script>

<template>
  <div class="panel progress-head">
    <p class="headline">
      <template v-if="currentWeek !== null">
        Woche <strong>{{ currentWeek + 1 }}</strong> von {{ weeks.length }}
      </template>
      <template v-else>{{ weeks.length }} Wochen</template>
      <span v-if="progress.plan" class="countdown">
        · noch <strong>{{ progress.plan.daysToEvent }}</strong> Tage bis
        {{ progress.plan.eventName }}
      </span>
    </p>

    <!-- Gesamtfortschritt vom Planstart bis zum Event, ein Abschnitt pro Woche -->
    <div
      class="track"
      role="progressbar"
      :aria-valuenow="elapsedPercent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Plan zu ${elapsedPercent} % geschafft`"
    >
      <button
        v-for="segment in segments"
        :key="segment.monday"
        type="button"
        class="segment"
        :class="[
          segment.phase.toLowerCase(),
          {
            selected: segment.index === selectedWeek,
            past: currentWeek !== null && segment.index <= currentWeek,
          },
        ]"
        :aria-label="`Woche ${segment.index + 1}: ${phaseLabels[segment.phase]}`"
        @click="emit('select-week', segment.index)"
      ></button>
      <span class="now" :style="{ left: `${elapsedPercent}%` }" aria-hidden="true"></span>
      <span class="today" :style="{ left: `${elapsedPercent}%` }" aria-hidden="true">heute</span>
    </div>

    <ul class="legend">
      <li v-for="phase in legend" :key="phase" :class="phase.toLowerCase()">
        {{ phaseLabels[phase] }}
      </li>
    </ul>

    <dl class="stats">
      <div v-if="load" class="load" :class="load.status.toLowerCase()">
        <dt>Letzte 7 Tage</dt>
        <dd>
          {{ loadLabels[load.status].title }}
          <small>{{ load.actualTss }} / {{ load.plannedTss }} TSS</small>
        </dd>
      </div>
      <div v-if="progress.streakWeeks > 0" class="streak">
        <dt>Serie</dt>
        <dd>🔥 {{ progress.streakWeeks }}<small> Wo.</small></dd>
      </div>
    </dl>
    <p v-if="load" class="load-hint">{{ loadLabels[load.status].hint }}</p>
  </div>
</template>

<style scoped>
.progress-head {
  margin: 12px 0 28px;
}

.headline {
  font-family: var(--font-heading);
  font-weight: 400; /* Saira Stencil gibt es nur in einer Stärke */
  margin: 0 0 14px;
  font-size: clamp(1.05rem, 4vw, 1.35rem);
  text-transform: uppercase;
  line-height: 1.15;
}

.headline strong {
  color: var(--color-hot);
}

.countdown {
  color: var(--color-text-muted);
}

/* ---------- Balken ---------- */

.track {
  position: relative;
  display: flex;
  gap: 2px;
  height: 22px;
  margin-bottom: 26px;
}

.segment {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  opacity: 0.5;
  cursor: pointer;
}

.segment.selected {
  outline: 2px solid var(--color-text);
  outline-offset: 1px;
}

.segment:focus-visible {
  outline: 2px solid var(--color-lilac);
  outline-offset: 2px;
}

/* Phasen-Farben */
.base {
  background: var(--color-lilac);
}

.build {
  background: #e88ad0;
}

.peak {
  background: var(--color-hot);
}

.taper {
  background: #f6c1df;
}

.recovery {
  background: var(--color-text-muted);
}

/* vergangene Wochen voll farbig, kommende blass */
.segment.past {
  opacity: 1;
}

/* Linie bei "heute" */
.now {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 3px;
  transform: translateX(-50%);
  background: var(--color-text);
  pointer-events: none;
}

.today {
  position: absolute;
  top: 100%;
  margin-top: 4px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
  pointer-events: none;
  white-space: nowrap;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.legend li {
  background: none;
}

.legend li::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  vertical-align: -1px;
}

.legend .base::before {
  background: var(--color-lilac);
}
.legend .build::before {
  background: #e88ad0;
}
.legend .peak::before {
  background: var(--color-hot);
}
.legend .taper::before {
  background: #f6c1df;
}
.legend .recovery::before {
  background: var(--color-text-muted);
}

/* ---------- Zahlen ---------- */

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  margin: 18px 0 0;
}

.stats dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.stats dd {
  margin: 2px 0 0;
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 900;
}

.stats small {
  font-size: 0.8rem;
  font-style: normal;
  font-weight: 600;
  color: var(--color-text-muted);
}

.streak dd {
  color: var(--color-hot);
}

.load dd small {
  margin-left: 4px;
}

.load.on_track dd {
  color: #35b86b;
}

.load.too_little dd,
.load.a_bit_much dd {
  color: #f4c430;
}

.load.too_much dd {
  color: var(--color-hot);
}

.load-hint {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>

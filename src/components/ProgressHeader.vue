<script setup lang="ts">
import { computed } from 'vue'

import type { AiAssessment, Progress } from '../api'
import { streakTile, type StatusTile } from '../plan/status'
import { mondayOf, type PlanWeek } from '../plan/weeks'
import { phaseLabels, type Phase } from '../types/plan'
import TrendLine from './TrendLine.vue'

const props = defineProps<{
  progress: Progress
  weeks: PlanWeek[]
  /** heute als "YYYY-MM-DD" */
  today: string
  /** aktuell angezeigte Woche (wird hervorgehoben) */
  selectedWeek: number
  /** KI-Modus an: quaelmich passt den Plan nicht selbst an */
  aiMode?: boolean
  /** Einschätzung der KI (nur im KI-Modus); ist sie frisch, ersetzt sie die eigene Rechnung */
  aiAssessment?: AiAssessment | null
  /** Kacheln der Statuskarte (Form, FTP, Schlaf, Erholung), von quaelmich gerechnet */
  tiles?: StatusTile[]
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
  ON_TRACK: { title: '✓ Auf Kurs', hint: 'Belastung passt gut.' },
  A_BIT_MUCH: {
    title: '▲ Etwas viel',
    hint: 'Mehr als zuletzt gewohnt – achte auf Schlaf und lockere Tage.',
  },
  TOO_MUCH: {
    title: '▲▲ Zu viel',
    hint: 'Deutlich mehr als sonst – gönn dir Erholung. quaelmich macht das nächste harte Training schon leichter.',
  },
  RESTING: { title: 'Ruhephase', hint: 'Gerade steht nichts an.' },
} as const
const load = computed(() => props.progress.load ?? null)

/** Kurze Einschätzung der KI zur Form – nur im KI-Modus, nur frisch, unter der Statuskarte */
const ai = computed(() =>
  props.aiMode && props.aiAssessment?.fresh && props.aiAssessment.note ? props.aiAssessment : null,
)

const streak = computed(() => streakTile(props.progress))

/** Im KI-Modus passt quaelmich nichts selbst an – der Satz dazu darf dann nicht dastehen */
const loadHint = computed(() => {
  const current = load.value
  if (!current) return null
  if (props.aiMode && current.status === 'TOO_MUCH') {
    return 'Deutlich mehr als sonst – gönn dir Erholung. Im KI-Modus passt deine KI den Plan an.'
  }
  return loadLabels[current.status].hint
})

/** Im KI-Modus, wenn die KI lange nichts gesagt hat */
const aiStaleNote = computed(() => {
  if (!props.aiMode || ai.value || !props.aiAssessment) return null
  return `Deine KI hat sich seit ${formatWhen(props.aiAssessment.updatedAt)} nicht zu deiner Form gemeldet.`
})

function formatWhen(instant: string) {
  return new Date(instant).toLocaleString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "Zu wenig" vergleicht mit dem Plan, "zu viel" mit dem Schnitt der letzten Wochen */
const loadReference = computed(() => {
  const current = load.value
  if (!current) return null
  const vsChronic = current.status === 'A_BIT_MUCH' || current.status === 'TOO_MUCH'
  return vsChronic
    ? { value: current.chronicTss, label: 'Schnitt' }
    : { value: current.plannedTss, label: 'geplant' }
})

/** Legende: die vorkommenden Phasen in Reihenfolge */
const legend = computed(() => [...new Set(segments.value.map((segment) => segment.phase))])
</script>

<template>
  <div class="panel progress-head">
    <p class="headline">
      <!-- Ziel ohne Event: Zyklus und Woche darin, Countdown bis zum FTP-Test -->
      <template v-if="progress.plan?.cycle">
        Zyklus <strong>{{ progress.plan.cycle }}</strong> · Woche {{ progress.plan.week }} von
        {{ progress.plan.totalWeeks }}
      </template>
      <template v-else-if="currentWeek !== null">
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

    <div class="status" data-test="status-card">
      <div
        v-for="tile in tiles ?? []"
        :key="tile.key"
        class="tile"
        :class="tile.tone"
        :data-test="`tile-${tile.key}`"
      >
        <span class="tile-label">{{ tile.label }}</span>
        <strong class="tile-value">{{ tile.value }}</strong>
        <TrendLine v-if="tile.trend" :trend="tile.trend" :tone="tile.tone" />
        <small v-if="tile.sub">{{ tile.sub }}</small>
      </div>
      <div v-if="load" class="tile load" :class="load.status.toLowerCase()" data-test="tile-load">
        <span class="tile-label">Letzte 7 Tage</span>
        <strong class="tile-value">{{ loadLabels[load.status].title }}</strong>
        <small v-if="loadReference"
          >{{ load.actualTss }} / {{ loadReference.value }} TSS {{ loadReference.label }}</small
        >
      </div>
      <div v-if="streak" class="tile streak" :class="streak.tone" data-test="tile-streak">
        <span class="tile-label">{{ streak.label }}</span>
        <strong class="tile-value">{{ streak.value }}</strong>
        <small v-if="streak.sub">{{ streak.sub }}</small>
      </div>
    </div>
    <p v-if="loadHint" class="load-hint">{{ loadHint }}</p>
    <div v-if="ai" class="ai-note" role="note" data-test="ai-assessment">
      <span class="ai-label">✦ Deine KI · {{ formatWhen(ai.updatedAt) }}</span>
      <p>{{ ai.note }}</p>
    </div>
    <p v-else-if="aiStaleNote" class="load-hint" data-test="ai-stale">{{ aiStaleNote }}</p>
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
  background: #f3d3ee;
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
  background: var(--color-signal);
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
  color: var(--color-signal);
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
  background: #f3d3ee;
}
.legend .recovery::before {
  background: var(--color-text-muted);
}

/* ---------- Statuskarte ---------- */

.status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
  margin: 18px 0 0;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  background: var(--color-panel-raised);
}

.tile-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.tile-value {
  font-size: 1.05rem;
  font-style: italic;
  font-weight: 900;
  line-height: 1.2;
}

.tile small {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.tile.good .tile-value,
.load.on_track .tile-value,
.streak.good .tile-value {
  color: var(--color-good);
}

.tile.warn .tile-value,
.load.too_little .tile-value,
.load.a_bit_much .tile-value {
  color: var(--color-warn);
}

.tile.bad .tile-value,
.load.too_much .tile-value {
  color: var(--color-bad);
}

.ai-note {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-left: 3px solid var(--color-lilac);
  background: var(--color-panel-raised);
}

.ai-note p {
  margin: 2px 0 0;
  font-size: 0.9rem;
}

.ai-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-lilac);
}

.load-hint {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>

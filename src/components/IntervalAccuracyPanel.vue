<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getIntervalAccuracy } from '../api'
import IntervalOverlayChart from './IntervalOverlayChart.vue'
import { targetSegments, targetSummary, TRACE_SECONDS } from '../plan/rideTargets'
import { accuracyVerdictLabels, type IntervalAccuracy } from '../types/plan'
import type { WorkoutStep } from '../types/workout'

/** "Wie genau getroffen?" – lädt die Auswertung zur zugeordneten Fahrt; ohne Daten bleibt es unsichtbar */
const props = defineProps<{ plannedId: number; steps?: WorkoutStep[] }>()
/** die geladene Auswertung, z. B. für das Story-Overlay */
const emit = defineEmits<{ loaded: [accuracy: IntervalAccuracy] }>()

const accuracy = ref<IntervalAccuracy | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    accuracy.value = await getIntervalAccuracy(props.plannedId)
    if (accuracy.value) emit('loaded', accuracy.value)
  } catch {
    accuracy.value = null // nicht schlimm – dann eben ohne Auswertung
  } finally {
    loading.value = false
  }
})

/** Die ganze Einheit: wie viel der Zeit mit Ziel (auch Einrollen, Pausen, Ausrollen) im Zielbereich lag */
const whole = computed(() => {
  const value = accuracy.value
  if (!value?.trace?.length || !props.steps) return null
  const segments = targetSegments(props.steps, value, value.trace.length * TRACE_SECONDS)
  return segments.length ? targetSummary(segments, value.trace) : null
})

const unit = computed(() => (accuracy.value?.basis === 'HEART_RATE' ? 'bpm' : 'W'))

const scoreClass = computed(() => {
  const score = accuracy.value?.score ?? 0
  return score >= 85 ? 'good' : score >= 65 ? 'ok' : 'off'
})

function formatDuration(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`
}

function formatTarget(low: number, high: number | null) {
  return high === null ? `≥ ${low}` : `${low}–${high}`
}
</script>

<template>
  <p v-if="loading" class="loading">Wertet die Intervalle aus …</p>
  <div v-else-if="accuracy" class="accuracy">
    <div class="head">
      <p class="score" :class="scoreClass">{{ accuracy.score }}<span class="percent">%</span></p>
      <div>
        <p class="title">Intervall-Genauigkeit</p>
        <p class="summary">
          {{ accuracy.onTarget }} von {{ accuracy.blocks.length }}
          {{ accuracy.blocks.length === 1 ? 'Intervall' : 'Intervallen' }} im Ziel
          <template v-if="accuracy.basis === 'HEART_RATE'"> · nach Puls</template>
        </p>
      </div>
    </div>
    <p v-if="accuracy.tip" class="tip">{{ accuracy.tip }}</p>
    <p v-if="accuracy.uncertain" class="uncertain">
      Die Intervalle waren in der Fahrt nicht klar zu erkennen – nimm den Wert mit Vorsicht.
    </p>
    <p v-if="whole" class="whole">
      Ganze Einheit: <strong>{{ whole.percentInZone }} %</strong> der Zeit im Zielbereich
      <template v-if="whole.percentAbove"> · {{ whole.percentAbove }} % darüber</template>
      <template v-if="whole.percentBelow"> · {{ whole.percentBelow }} % darunter</template>
    </p>
    <IntervalOverlayChart :accuracy="accuracy" :steps="steps" />
    <ol class="blocks">
      <li v-for="block in accuracy.blocks" :key="block.number" :class="block.verdict.toLowerCase()">
        <span class="nr">#{{ block.number }}</span>
        <span class="dur">{{ formatDuration(block.durationSeconds) }}</span>
        <span class="target">Ziel {{ formatTarget(block.targetLow, block.targetHigh) }}</span>
        <span class="actual">{{ block.actual }} {{ unit }}</span>
        <span class="verdict">{{ accuracyVerdictLabels[block.verdict] }}</span>
      </li>
    </ol>
    <p class="note">
      Richtwert: quaelmich sucht die Intervalle selbst in deiner Fahrt und vergleicht den Schnitt
      mit dem Ziel (±5 % gilt als getroffen).
      <template v-if="whole">
        Bei der ganzen Einheit zählen Einrollen und Grundlage mit ±12 %, in Pausen und beim Ausrollen
        ist lockerer immer richtig.
      </template>
    </p>
  </div>
</template>

<style scoped>
.loading {
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.accuracy {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 2.6rem;
  line-height: 1;
}

.score.good {
  color: #35b86b;
}

.score.ok {
  color: #f4c430;
}

.score.off {
  color: var(--color-hot);
}

.percent {
  font-family: var(--font-mono);
  font-size: 0.4em;
}

.title {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.summary {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.tip {
  margin: 10px 0 0;
}

.uncertain {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #f4c430;
}

.whole {
  margin: 10px 0 0;
  font-size: 0.9rem;
}

.blocks {
  display: grid;
  gap: 4px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.blocks li {
  display: grid;
  grid-template-columns: 2.5em 4em 1fr auto;
  gap: 2px 10px;
  align-items: baseline;
  padding: 4px 8px;
  border-left: 4px solid var(--color-panel-raised);
  background: var(--color-ink);
}

.blocks li.on_target {
  border-left-color: #35b86b;
}

.blocks li.slightly_hard,
.blocks li.slightly_easy {
  border-left-color: #f4c430;
}

.blocks li.hard,
.blocks li.easy {
  border-left-color: var(--color-hot);
}

.nr,
.dur,
.target {
  color: var(--color-text-muted);
}

.actual {
  font-weight: 700;
  text-align: right;
}

.verdict {
  grid-column: 2 / -1;
  font-size: 0.75rem;
}

.note {
  margin: 10px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

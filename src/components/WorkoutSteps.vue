<script setup lang="ts">
import type { StepKind, WorkoutStep } from '../types/workout'

const props = defineProps<{ steps: WorkoutStep[]; ftp?: number | null }>()

const kindLabels: Record<StepKind, string> = {
  WARMUP: 'Aufwärmen',
  STEADY: 'Gleichmäßig',
  INTERVAL: 'Intervall',
  RECOVERY: 'Pause',
  COOLDOWN: 'Ausfahren',
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes}:${String(rest).padStart(2, '0')} min`
}

function formatPercent(step: WorkoutStep) {
  return step.powerStartPercent === step.powerEndPercent
    ? `${step.powerStartPercent} %`
    : `${step.powerStartPercent} → ${step.powerEndPercent} %`
}

function watts(percent: number) {
  return Math.round(((props.ftp ?? 0) * percent) / 100)
}

function formatWatts(step: WorkoutStep) {
  return step.powerStartPercent === step.powerEndPercent
    ? `${watts(step.powerStartPercent)} W`
    : `${watts(step.powerStartPercent)} → ${watts(step.powerEndPercent)} W`
}
</script>

<template>
  <table class="steps">
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Abschnitt</th>
        <th scope="col">Dauer</th>
        <th scope="col">% FTP</th>
        <th v-if="ftp" scope="col">Watt</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(step, index) in steps"
        :key="index"
        :class="{ hard: Math.max(step.powerStartPercent, step.powerEndPercent) > 105 }"
      >
        <td class="index">{{ index + 1 }}</td>
        <td>{{ kindLabels[step.kind] }}</td>
        <td>{{ formatDuration(step.durationSeconds) }}</td>
        <td>{{ formatPercent(step) }}</td>
        <td v-if="ftp" class="watts">{{ formatWatts(step) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.steps {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

th {
  padding: 0 8px 8px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-panel-raised);
}

td {
  padding: 7px 8px;
  border-bottom: 1px solid var(--color-panel-raised);
}

.index {
  color: var(--color-text-muted);
}

.watts {
  font-weight: 600;
  color: var(--color-lilac);
}

.hard .watts,
.hard td:nth-child(4) {
  color: var(--color-hot);
}

@media (max-width: 480px) {
  th,
  td {
    padding-inline: 4px;
  }
}
</style>

<script setup lang="ts">
import { formatRange, targetForStep, type HeartRateZones } from '../plan/heartRate'
import { powerZoneFor } from '../plan/zones'
import type { StepKind, WorkoutStep } from '../types/workout'

/** heartRate gesetzt → Training nach Puls: Zone und bpm statt % FTP und Watt */
const props = defineProps<{
  steps: WorkoutStep[]
  ftp?: number | null
  heartRate?: HeartRateZones | null
}>()

function heartRateCells(step: WorkoutStep) {
  const range = targetForStep(props.heartRate!, step)
  return range
    ? { zone: `Z${range.zone}`, bpm: formatRange(range) }
    : { zone: 'Z5', bpm: 'Vollgas' }
}

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
        <template v-if="heartRate">
          <th scope="col">Zone</th>
          <th scope="col">Puls</th>
        </template>
        <template v-else>
          <th scope="col">% FTP</th>
          <th v-if="ftp" scope="col">Watt</th>
        </template>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(step, index) in steps"
        :key="index"
        :class="{ hard: Math.max(step.powerStartPercent, step.powerEndPercent) > 105 }"
      >
        <td
          class="index"
          :style="{
            borderLeftColor: powerZoneFor(Math.max(step.powerStartPercent, step.powerEndPercent))
              .color,
          }"
        >
          {{ index + 1 }}
        </td>
        <td>{{ kindLabels[step.kind] }}</td>
        <td>{{ formatDuration(step.durationSeconds) }}</td>
        <template v-if="heartRate">
          <td>{{ heartRateCells(step).zone }}</td>
          <td class="watts">{{ heartRateCells(step).bpm }}</td>
        </template>
        <template v-else>
          <td>{{ formatPercent(step) }}</td>
          <td v-if="ftp" class="watts">{{ formatWatts(step) }}</td>
        </template>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.steps {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.8rem;
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
  border-left: 5px solid transparent;
  color: var(--color-text-muted);
}

td:nth-child(3),
td:nth-child(4),
.watts {
  white-space: nowrap;
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

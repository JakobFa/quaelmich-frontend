<script setup lang="ts">
import { computed } from 'vue'

import { powerZoneFor } from '../plan/zones'
import type { WorkoutStep } from '../types/workout'

const props = defineProps<{ steps: WorkoutStep[] }>()

// 170 % FTP füllen die volle Höhe (Sprints)
const MAX_PERCENT = 170

const totalSeconds = computed(() => props.steps.reduce((sum, s) => sum + s.durationSeconds, 0))

function barStyle(step: WorkoutStep) {
  const top = (percent: number) => 100 - (Math.min(percent, MAX_PERCENT) / MAX_PERCENT) * 100
  const from = powerZoneFor(step.powerStartPercent).color
  const to = powerZoneFor(step.powerEndPercent).color
  return {
    flexGrow: step.durationSeconds,
    // Rampen laufen farblich von der Start- in die Zielzone
    background: from === to ? from : `linear-gradient(to right, ${from}, ${to})`,
    // Trapez-Form, damit Rampen (Aufwärmen, Ausfahren) schräg aussehen
    clipPath: `polygon(0 100%, 0 ${top(step.powerStartPercent)}%, 100% ${top(step.powerEndPercent)}%, 100% 100%)`,
  }
}
</script>

<template>
  <div class="profile" role="img" :aria-label="`Leistungsprofil, ${steps.length} Abschnitte`">
    <span
      v-for="(step, index) in steps"
      :key="index"
      class="bar"
      :style="barStyle(step)"
      :title="`${Math.round(step.durationSeconds / 60)} min · ${step.powerStartPercent}–${step.powerEndPercent} % FTP · Z${powerZoneFor(step.powerEndPercent).zone}`"
    ></span>
    <span v-if="totalSeconds === 0" class="empty">Keine Abschnitte</span>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: stretch;
  gap: 1px;
  height: 56px;
  padding: 0 0 2px;
  background: linear-gradient(var(--color-ink), var(--color-ink)) bottom / 100% 2px no-repeat;
}

.bar {
  flex-basis: 0;
  min-width: 2px;
}

.empty {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

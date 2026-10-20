<script setup lang="ts">
import { computed } from 'vue'

import type { WorkoutStep } from '../types/workout'

const props = defineProps<{ steps: WorkoutStep[] }>()

// 170 % FTP füllen die volle Höhe (Sprints)
const MAX_PERCENT = 170

const totalSeconds = computed(() => props.steps.reduce((sum, s) => sum + s.durationSeconds, 0))

function zoneClass(step: WorkoutStep) {
  const percent = Math.max(step.powerStartPercent, step.powerEndPercent)
  if (percent > 105) return 'zone-hard'
  if (percent >= 88) return 'zone-threshold'
  if (percent > 75) return 'zone-tempo'
  return 'zone-easy'
}

function barStyle(step: WorkoutStep) {
  const top = (percent: number) => 100 - (Math.min(percent, MAX_PERCENT) / MAX_PERCENT) * 100
  return {
    flexGrow: step.durationSeconds,
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
      :class="zoneClass(step)"
      :style="barStyle(step)"
      :title="`${Math.round(step.durationSeconds / 60)} min · ${step.powerStartPercent}–${step.powerEndPercent} % FTP`"
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

.zone-easy {
  background: var(--color-lilac-dim);
}

.zone-tempo {
  background: color-mix(in srgb, var(--color-lilac) 80%, var(--color-lilac-dim));
}

.zone-threshold {
  background: var(--color-lilac);
}

.zone-hard {
  background: var(--color-hot);
}

.empty {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

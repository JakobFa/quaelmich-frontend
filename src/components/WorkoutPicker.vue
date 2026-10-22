<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { getWorkouts } from '../api'
import { formatDuration } from '../plan/weeks'
import { workoutTypeLabels, type Workout, type WorkoutType } from '../types/workout'

const props = defineProps<{ currentWorkoutId: number; disabled?: boolean }>()
const emit = defineEmits<{ pick: [workoutId: number, durationMinutes: number | undefined] }>()

/** Workouts, die es in jeder Länge gibt – mit kürzester erlaubter Dauer (wie im Backend) */
const variableNames: Record<number, { name: string; minMinutes: number }> = {
  1: { name: 'Lockeres Ausrollen', minMinutes: 30 },
  2: { name: 'Grundlage', minMinutes: 60 },
  3: { name: 'Lange Ausfahrt', minMinutes: 90 },
  27: { name: 'Lange Ausfahrt mit Tempo', minMinutes: 90 },
}
const MAX_MINUTES = 360

const workouts = ref<Workout[]>([])
const failed = ref(false)
/** gewählte Dauer je variablem Workout */
const minutes = reactive<Record<number, number>>({})

onMounted(async () => {
  try {
    workouts.value = await getWorkouts()
    for (const workout of workouts.value) {
      if (variableNames[workout.id]) minutes[workout.id] = workout.durationInMinutes
    }
  } catch {
    failed.value = true
  }
})

const groups = computed(() =>
  (Object.keys(workoutTypeLabels) as WorkoutType[])
    .map((type) => ({
      type,
      label: workoutTypeLabels[type],
      workouts: workouts.value.filter((workout) => workout.type === type),
    }))
    .filter((group) => group.workouts.length > 0),
)

function durationOptions(id: number) {
  const options = []
  for (let m = variableNames[id]!.minMinutes; m <= MAX_MINUTES; m += 15) options.push(m)
  return options
}

function nameOf(workout: Workout) {
  return variableNames[workout.id]?.name ?? workout.title
}

/** Bei variabler Dauer wächst der TSS ungefähr mit der Zeit */
function factsOf(workout: Workout) {
  const chosen = minutes[workout.id]
  if (!chosen) return `${formatDuration(workout.durationInMinutes)} · ${workout.tss} TSS`
  return `≈ ${Math.round((workout.tss * chosen) / workout.durationInMinutes)} TSS`
}

function pick(workout: Workout) {
  emit('pick', workout.id, minutes[workout.id])
}
</script>

<template>
  <div class="picker">
    <p v-if="failed" class="error" role="alert">Die Workouts konnten nicht geladen werden.</p>
    <details v-for="group in groups" :key="group.type" class="group">
      <summary>{{ group.label }}</summary>
      <ul>
        <li v-for="workout in group.workouts" :key="workout.id">
          <div class="info">
            <span class="name">{{ nameOf(workout) }}</span>
            <span class="facts">{{ factsOf(workout) }}</span>
          </div>
          <select
            v-if="minutes[workout.id]"
            v-model.number="minutes[workout.id]"
            :aria-label="`Dauer für ${nameOf(workout)}`"
          >
            <option v-for="m in durationOptions(workout.id)" :key="m" :value="m">
              {{ formatDuration(m) }}
            </option>
          </select>
          <button
            type="button"
            class="button button-ghost"
            :disabled="disabled || (workout.id === props.currentWorkoutId && !minutes[workout.id])"
            @click="pick(workout)"
          >
            Nehmen
          </button>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.group {
  border: 2px solid var(--color-panel-raised);
}

.group[open] {
  border-color: var(--color-lilac);
}

summary {
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
}

ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0 10px 10px;
  list-style: none;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-top: 6px;
  border-top: 1px dashed var(--color-panel-raised);
}

.info {
  display: grid;
  flex: 1;
  min-width: 160px;
}

.name {
  font-weight: 600;
}

.facts {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

li .button {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.error {
  margin: 0;
  color: var(--color-hot);
}
</style>

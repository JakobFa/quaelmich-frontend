<script setup lang="ts">
import { computed, ref } from 'vue'

import ExerciseAnimation from './ExerciseAnimation.vue'
import { exercisesOf, strengthPhaseNotes } from '../strength/exercises'
import type { Phase } from '../types/plan'

/** Die Übungen einer Krafteinheit, jede mit animierter Figur und Hinweisen zur Ausführung */
const props = defineProps<{ workoutId: number; phase: Phase }>()

const items = computed(() => exercisesOf(props.workoutId))
const smooth = ref(true)
const cues = ref<Record<string, string>>({})
</script>

<template>
  <div class="strength">
    <div class="strength-head">
      <p v-if="strengthPhaseNotes[phase]" class="phase-note">{{ strengthPhaseNotes[phase] }}</p>
      <button type="button" class="link" @click="smooth = !smooth">
        Animation: {{ smooth ? 'flüssig' : '2 Posen' }}
      </button>
    </div>

    <ol class="exercises">
      <li v-for="(item, index) in items" :key="item.exercise.id" class="panel exercise">
        <div class="exercise-title">
          <span class="number">{{ index + 1 }}</span>
          <h3>{{ item.exercise.name }}</h3>
          <span class="dose">{{ item.sets }} × {{ item.reps }}</span>
        </div>
        <ExerciseAnimation
          :exercise="item.exercise"
          :smooth="smooth"
          @cue="(text) => (cues[item.exercise.id] = text)"
        />
        <p class="live-cue" aria-live="off">
          {{ cues[item.exercise.id] ?? item.exercise.cueTowardsEnd }}
        </p>
        <p class="why">{{ item.exercise.why }}</p>
        <ul class="cues">
          <li v-for="cue in item.exercise.cues" :key="cue">{{ cue }}</li>
        </ul>
        <p class="note"><strong>Typischer Fehler:</strong> {{ item.exercise.mistake }}</p>
        <p class="note"><strong>Leichter:</strong> {{ item.exercise.easier }}</p>
      </li>
    </ol>

    <p class="safety">
      Ohne Schmerzen trainieren. Bist du dir bei einer Übung unsicher, lass sie dir einmal von einer
      Trainerin oder einem Trainer zeigen.
    </p>
  </div>
</template>

<style scoped>
.strength-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  margin: 0 0 12px;
}

.phase-note {
  flex: 1 1 260px;
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.exercises {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 16px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.exercise {
  margin: 0;
}

.exercise-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 8px;
}

.number {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-hot);
}

.exercise-title h3 {
  flex: 1;
  margin: 0;
  font-size: 1rem;
}

.dose {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-lilac);
  white-space: nowrap;
}

.live-cue {
  min-height: 1.4em;
  margin: 4px 0 10px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-align: center;
  color: var(--color-text);
}

.why {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.cues {
  margin: 0 0 8px;
  padding-left: 1.2em;
  font-size: 0.9rem;
}

.note {
  margin: 0 0 4px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.safety {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>

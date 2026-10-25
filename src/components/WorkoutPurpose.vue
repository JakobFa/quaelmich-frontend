<script setup lang="ts">
import { phasePurpose, type Phase } from '../types/plan'
import { workoutPurpose, type WorkoutType } from '../types/workout'

/** "Warum diese Einheit?" – kurz und unaufdringlich */
defineProps<{ type: WorkoutType; phase?: Phase }>()
</script>

<template>
  <aside class="purpose" aria-label="Warum diese Einheit?">
    <p><strong>Warum?</strong> {{ workoutPurpose[type].why }}</p>
    <p>
      <strong>{{ type === 'STRENGTH' ? "So geht's:" : "So fährst du's:" }}</strong>
      {{ workoutPurpose[type].how }}
    </p>
    <!-- bei Kraft steht der Hinweis zur Phase bei den Übungen -->
    <p v-if="phase && type !== 'STRENGTH'" class="phase">{{ phasePurpose[phase] }}</p>
  </aside>
</template>

<style scoped>
.purpose {
  display: grid;
  gap: 6px;
  max-width: 60ch;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-left: 3px solid var(--color-lilac-dim);
  background: color-mix(in srgb, var(--color-panel) 60%, transparent);
  font-size: 0.9rem;
}

.purpose p {
  margin: 0;
  color: var(--color-text-muted);
}

.purpose strong {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-lilac);
}

.phase {
  font-size: 0.8rem;
  font-style: italic;
}
</style>

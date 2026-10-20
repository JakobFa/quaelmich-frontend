<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getWorkouts } from '../api'
import LoadingNotice from './LoadingNotice.vue'
import WorkoutProfile from './WorkoutProfile.vue'
import { formatDuration } from '../plan/weeks'
import { workoutTypeLabels, type Workout } from '../types/workout'

const workouts = ref<Workout[]>([])
const loading = ref(true)
const failed = ref(false)

function loadWorkouts() {
  loading.value = true
  failed.value = false
  getWorkouts()
    .then((result) => (workouts.value = result))
    .catch((error) => {
      console.log('error', error)
      failed.value = true
    })
    .finally(() => (loading.value = false))
}

function twoDigits(n: number) {
  return String(n).padStart(2, '0')
}

onMounted(loadWorkouts)
</script>

<template>
  <section>
    <h2 class="section-label">
      Workouts <span class="count">// {{ twoDigits(workouts.length) }}</span>
    </h2>

    <LoadingNotice v-if="loading" label="Lädt Workouts …" />

    <div v-else-if="failed" class="failed" role="alert">
      <p>Die Workouts konnten nicht geladen werden.</p>
      <button type="button" class="button button-ghost" @click="loadWorkouts">
        Nochmal versuchen
      </button>
    </div>

    <ul v-else class="workouts">
      <li v-for="(workout, index) in workouts" :key="workout.id">
        <RouterLink :to="`/workouts/${workout.id}`" class="card">
          <span class="number">{{ twoDigits(index + 1) }}</span>

          <div class="body">
            <p class="type">{{ workoutTypeLabels[workout.type] }}</p>
            <h3 class="title">{{ workout.title }}</h3>

            <dl class="stats">
              <div class="stat">
                <dt>Dauer</dt>
                <dd>{{ formatDuration(workout.durationInMinutes) }}</dd>
              </div>
              <div class="stat">
                <dt>TSS</dt>
                <dd>{{ workout.tss }}</dd>
              </div>
            </dl>

            <WorkoutProfile :steps="workout.steps" class="profile" />
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.section-label {
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.count {
  color: var(--color-text-muted);
}

.failed p {
  margin: 0 0 12px;
  color: var(--color-hot);
}

.workouts {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Karte mit abgeschnittener Ecke statt runder Kanten */
.card {
  color: inherit;
  text-decoration: none;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 18px 20px;
  background: var(--color-panel);
  border-left: 5px solid var(--color-lilac);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
  transition: background-color 0.15s;
}

.card:hover {
  background: var(--color-panel-raised);
}

/* große Nummer nur als Umriss */
.number {
  font-size: 2.6rem;
  font-weight: 900;
  font-style: italic;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--color-lilac-dim);
}

.body {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0 0 10px;
  font-size: 1.45rem;
  font-weight: 900;
  font-style: italic;
  font-stretch: 80%;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  line-height: 1.05;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 0;
}

.stat dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.stat dd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
}

.type {
  margin: 0 0 2px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.profile {
  margin-top: 14px;
}
</style>

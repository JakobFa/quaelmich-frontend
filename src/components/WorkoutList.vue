<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Workout = {
  title: string
  durationInMinutes: number
  intensity: number
}

const workouts = ref<Workout[]>([])

function loadWorkouts() {
  const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL
  const endpoint = baseUrl + '/workouts'
  fetch(endpoint)
    .then((response) => response.json())
    .then((result: Workout[]) => (workouts.value = result))
    .catch((error) => console.log('error', error))
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

    <ul class="workouts">
      <li v-for="(workout, index) in workouts" :key="workout.title" class="card">
        <span class="number">{{ twoDigits(index + 1) }}</span>

        <div class="body">
          <h3 class="title">{{ workout.title }}</h3>

          <dl class="stats">
            <div class="stat">
              <dt>Dauer</dt>
              <dd>{{ workout.durationInMinutes }} min</dd>
            </div>
            <div class="stat stat-intensity">
              <dt>Intensität</dt>
              <dd>
                <span class="bar" :class="{ 'bar-hot': workout.intensity > 75 }">
                  <span class="bar-fill" :style="{ width: workout.intensity + '%' }"></span>
                </span>
                <span class="value">{{ workout.intensity }}</span>
              </dd>
            </div>
          </dl>
        </div>
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

.workouts {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Karte mit abgeschnittener Ecke statt runder Kanten */
.card {
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

.stat-intensity {
  flex: 1;
  min-width: 180px;
}

/* Balken mit Schraffur, wird ab 75 pink-heiß */
.bar {
  flex: 1;
  height: 10px;
  background: var(--color-ink);
  --bar-color: var(--color-lilac);
}

.bar-hot {
  --bar-color: var(--color-hot);
}

.bar-fill {
  display: block;
  height: 100%;
  background: repeating-linear-gradient(
    -45deg,
    var(--bar-color) 0 4px,
    color-mix(in srgb, var(--bar-color) 55%, transparent) 4px 7px
  );
}

.value {
  min-width: 2ch;
  text-align: right;
}
</style>

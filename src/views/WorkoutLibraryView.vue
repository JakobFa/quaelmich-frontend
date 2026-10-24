<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getMyWorkouts } from '../api'
import { auth } from '../auth'
import WorkoutList from '../components/WorkoutList.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { formatDuration } from '../plan/weeks'
import { workoutTypeLabels, type Workout } from '../types/workout'

/** eigene Workouts – nur mit Login */
const own = ref<Workout[]>([])

onMounted(async () => {
  if (!auth.isLoggedIn.value) return
  try {
    own.value = await getMyWorkouts()
  } catch {
    own.value = [] // dann eben nur die Bibliothek
  }
})
</script>

<template>
  <section>
    <p class="kicker">// Bibliothek</p>
    <p class="intro">
      Alle Workouts, aus denen quaelmich deinen Plan zusammenstellt. Leistung in Prozent deiner FTP.
    </p>

    <div v-if="auth.isLoggedIn.value" class="own">
      <div class="own-head">
        <h2 class="section-label">Eigene Workouts</h2>
        <RouterLink to="/workouts/neu" class="button">＋ Eigenes Workout bauen</RouterLink>
      </div>
      <p v-if="own.length === 0" class="hint">
        Bau dir deine eigenen Einheiten – fahrbar im Player, als .fit und für jeden Tag im Plan
        eintauschbar.
      </p>
      <ul v-else class="own-list">
        <li v-for="workout in own" :key="workout.id">
          <RouterLink :to="`/workouts/${workout.id}`" class="own-card">
            <span class="type">{{ workoutTypeLabels[workout.type] }}</span>
            <strong>{{ workout.title }}</strong>
            <span class="facts"
              >{{ formatDuration(workout.durationInMinutes) }} · TSS {{ workout.tss }}</span
            >
            <WorkoutProfile :steps="workout.steps" class="profile" />
          </RouterLink>
        </li>
      </ul>
    </div>

    <WorkoutList />
  </section>
</template>

<style scoped>
.intro {
  margin: 8px 0 24px;
  color: var(--color-text-muted);
}

.own {
  margin-bottom: 32px;
}

.own-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.own-head .section-label {
  margin: 0;
}

.hint {
  margin: 0;
  color: var(--color-text-muted);
}

.own-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.own-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-left: 5px solid var(--color-hot);
  background: var(--color-panel);
  color: inherit;
  text-decoration: none;
}

.own-card:hover {
  border-left-color: var(--color-lilac);
}

.type,
.facts {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.profile {
  height: 40px;
  margin-top: 4px;
}
</style>

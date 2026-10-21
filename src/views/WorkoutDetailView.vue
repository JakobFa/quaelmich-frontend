<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getMyAthlete, getWorkout, workoutFitUrl } from '../api'
import { auth } from '../auth'
import LoadingNotice from '../components/LoadingNotice.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import WorkoutSteps from '../components/WorkoutSteps.vue'
import { formatDuration } from '../plan/weeks'
import { heartRateZonesOf } from '../plan/heartRate'
import { isHeartRateMode, type Athlete } from '../types/athlete'
import { workoutTypeLabels, type Workout } from '../types/workout'

const route = useRoute()
const workout = ref<Workout | null>(null)
const athlete = ref<Athlete | null>(null)
const ftp = computed(() => athlete.value?.ftp ?? null)
const heartRate = computed(() =>
  isHeartRateMode(athlete.value) ? heartRateZonesOf(athlete.value) : null,
)
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    workout.value = await getWorkout(Number(route.params.id))
    // Wattzahlen nur mit Login (dann ist die eigene FTP bekannt)
    if (auth.isLoggedIn.value) {
      athlete.value = await getMyAthlete()
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <RouterLink to="/workouts" class="back">← Zurück zur Bibliothek</RouterLink>

    <LoadingNotice v-if="loading" label="Lädt das Workout …" />

    <div v-else-if="failed || !workout" class="panel" role="alert">
      <p class="error">Dieses Workout gibt es nicht.</p>
    </div>

    <template v-else>
      <p class="type">{{ workoutTypeLabels[workout.type] }}</p>
      <h2 class="headline">{{ workout.title }}</h2>
      <p class="description">{{ workout.description }}</p>

      <dl class="facts">
        <div>
          <dt>Dauer</dt>
          <dd>{{ formatDuration(workout.durationInMinutes) }}</dd>
        </div>
        <div>
          <dt>TSS</dt>
          <dd>{{ workout.tss }}</dd>
        </div>
      </dl>

      <WorkoutProfile :steps="workout.steps" class="profile" />

      <div class="download">
        <a :href="workoutFitUrl(workout.id)" class="button" download>.fit herunterladen</a>
        <p>
          Für Garmin, Wahoo &amp; Co. – die Leistung ist in % FTP angegeben, dein Radcomputer
          rechnet mit deiner dort eingestellten FTP in Watt um.
          <template v-if="heartRate">
            Mit Pulszielen bekommst du die Workouts aus deinem Plan.
          </template>
        </p>
      </div>

      <div class="panel">
        <h3 class="panel-title">Abschnitte</h3>
        <WorkoutSteps :steps="workout.steps" :ftp="ftp" :heart-rate="heartRate" />
        <p v-if="!ftp && !heartRate" class="hint">
          Mit einem Profil siehst du hier zusätzlich deine Zielwattzahlen.
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
}

.back:hover {
  color: var(--color-lilac);
}

.type {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.headline {
  font-family: var(--font-heading);
  font-weight: 400; /* Saira Stencil gibt es nur in einer Stärke */
  margin: 2px 0 8px;
  font-size: clamp(1.8rem, 6vw, 2.6rem);
  text-transform: uppercase;
  line-height: 1;
}

.description {
  max-width: 60ch;
  margin: 0 0 16px;
  color: var(--color-text-muted);
}

.facts {
  display: flex;
  gap: 32px;
  margin: 0 0 16px;
}

.facts dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.facts dd {
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-weight: 600;
}

.profile {
  height: 96px;
  margin-bottom: 24px;
}

.error {
  margin: 0;
  color: var(--color-hot);
}

.hint {
  margin: 12px 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.download {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-bottom: 16px;
}

.download p {
  flex: 1;
  min-width: 220px;
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>

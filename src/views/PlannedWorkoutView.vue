<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  getAthlete,
  getPlannedWorkout,
  getStoredAthleteId,
  updateProgress,
  plannedWorkoutFitUrl,
} from '../api'
import LoadingNotice from '../components/LoadingNotice.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import WorkoutSteps from '../components/WorkoutSteps.vue'
import { formatDuration } from '../plan/weeks'
import { phaseLabels, type PlannedWorkout } from '../types/plan'
import { workoutTypeLabels } from '../types/workout'

const route = useRoute()
const planned = ref<PlannedWorkout | null>(null)
const ftp = ref<number | null>(null)
const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const saveError = ref(false)

const ratingLabels: Record<number, string> = {
  1: 'ganz locker',
  3: 'locker',
  5: 'fordernd',
  7: 'hart',
  9: 'sehr hart',
  10: 'am Limit',
}

const ratingHint = computed(() => {
  const rating = planned.value?.rating
  if (!rating) return 'Wie anstrengend war es?'
  const key = [10, 9, 7, 5, 3, 1].find((k) => rating >= k)!
  return `${rating} / 10 – ${ratingLabels[key]}`
})

onMounted(async () => {
  try {
    planned.value = await getPlannedWorkout(Number(route.params.id))
    const athleteId = getStoredAthleteId()
    if (athleteId) {
      ftp.value = (await getAthlete(athleteId)).ftp
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

async function save(completed: boolean, rating: number | null) {
  if (!planned.value) return
  saving.value = true
  saveError.value = false
  try {
    planned.value = await updateProgress(planned.value.id, completed, rating)
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}

function toggleCompleted() {
  if (!planned.value) return
  save(!planned.value.completed, planned.value.rating)
}

function rate(value: number) {
  save(true, value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <section>
    <RouterLink to="/plan" class="back">← Zurück zum Plan</RouterLink>

    <LoadingNotice v-if="loading" label="Lädt das Workout …" />

    <div v-else-if="failed || !planned" class="panel" role="alert">
      <p class="error">
        Dieses Workout gibt es nicht (mehr). Vielleicht wurde der Plan neu erstellt?
      </p>
    </div>

    <template v-else>
      <p class="kicker">// {{ formatDate(planned.date) }} · {{ phaseLabels[planned.phase] }}</p>
      <p class="type">{{ workoutTypeLabels[planned.workout.type] }}</p>
      <h2 class="headline">{{ planned.workout.title }}</h2>
      <p class="description">{{ planned.workout.description }}</p>

      <dl class="facts">
        <div>
          <dt>Dauer</dt>
          <dd>{{ formatDuration(planned.workout.durationInMinutes) }}</dd>
        </div>
        <div>
          <dt>TSS</dt>
          <dd>{{ planned.workout.tss }}</dd>
        </div>
        <div v-if="ftp">
          <dt>Deine FTP</dt>
          <dd>{{ ftp }} W</dd>
        </div>
      </dl>

      <WorkoutProfile :steps="planned.workout.steps" class="profile" />

      <!-- Abhaken & bewerten -->
      <div class="panel progress" :class="{ done: planned.completed }">
        <button
          type="button"
          class="check"
          :aria-pressed="planned.completed"
          :disabled="saving"
          @click="toggleCompleted"
        >
          <span class="box" aria-hidden="true">{{ planned.completed ? '✓' : '' }}</span>
          {{ planned.completed ? 'Erledigt' : 'Als erledigt abhaken' }}
        </button>

        <fieldset class="rating">
          <legend>{{ ratingHint }}</legend>
          <div class="scale">
            <button
              v-for="value in 10"
              :key="value"
              type="button"
              class="dot"
              :class="{ active: planned.rating !== null && value <= planned.rating }"
              :aria-label="`Anstrengung ${value} von 10`"
              :aria-pressed="planned.rating === value"
              :disabled="saving"
              @click="rate(value)"
            >
              {{ value }}
            </button>
          </div>
        </fieldset>

        <p v-if="saveError" class="error" role="alert">Speichern hat nicht geklappt.</p>
      </div>

      <div class="download">
        <a :href="plannedWorkoutFitUrl(planned.id)" class="button" download>.fit herunterladen</a>
        <p>
          Für Garmin, Wahoo &amp; Co. – die Leistung ist in % FTP angegeben, dein Radcomputer
          rechnet mit deiner dort eingestellten FTP in Watt um.
        </p>
      </div>

      <div class="panel">
        <h3 class="panel-title">Abschnitte</h3>
        <WorkoutSteps :steps="planned.workout.steps" :ftp="ftp" />
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
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.headline {
  margin: 2px 0 8px;
  font-size: clamp(1.8rem, 6vw, 2.6rem);
  font-weight: 900;
  font-style: italic;
  font-stretch: 85%;
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
  flex-wrap: wrap;
  gap: 8px 32px;
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

.panel {
  margin-bottom: 16px;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}

/* ---------- Abhaken ---------- */

.progress.done {
  border-left-color: var(--color-hot);
}

.check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  cursor: pointer;
}

.box {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-lilac);
  color: var(--color-ink);
  font-style: normal;
}

.done .box {
  background: var(--color-hot);
  border-color: var(--color-hot);
}

.rating {
  margin: 20px 0 0;
  padding: 0;
  border: 0;
}

.rating legend {
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.scale {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.dot {
  padding: 10px 0;
  border: 2px solid var(--color-panel-raised);
  background: var(--color-ink);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
}

.dot:hover:not(:disabled) {
  border-color: var(--color-lilac);
}

.dot.active {
  border-color: var(--color-lilac);
  background: var(--color-lilac);
  color: var(--color-plum);
}

.dot.active:nth-child(n + 8) {
  border-color: var(--color-hot);
  background: var(--color-hot);
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

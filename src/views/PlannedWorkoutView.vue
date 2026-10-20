<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  confirmActivity,
  downloadPlannedWorkoutFit,
  getMyAthlete,
  getPlannedWorkout,
  updateProgress,
} from '../api'
import AssessmentBadge from '../components/AssessmentBadge.vue'
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
const downloading = ref(false)
const downloadError = ref(false)

async function download() {
  if (!planned.value) return
  downloading.value = true
  downloadError.value = false
  try {
    await downloadPlannedWorkoutFit(planned.value.id)
  } catch {
    downloadError.value = true
  } finally {
    downloading.value = false
  }
}

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
    ftp.value = (await getMyAthlete())?.ftp ?? null
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

async function confirm(matchesPlan: boolean) {
  if (!planned.value) return
  saving.value = true
  saveError.value = false
  try {
    planned.value = await confirmActivity(planned.value.id, matchesPlan)
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

      <div v-if="planned.adjustment" class="panel adjustment" role="note">
        <p class="adjustment-title">↻ Statt {{ planned.adjustment.originalTitle }}</p>
        <p>{{ planned.adjustment.note }}</p>
      </div>

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

      <!-- Geplant vs. tatsächlich gefahren (aus intervals.icu) -->
      <div v-if="planned.actual" class="panel compare">
        <h3 class="panel-title">
          Geplant vs. gefahren
          <AssessmentBadge
            v-if="planned.actual.assessment"
            :assessment="planned.actual.assessment"
            class="assessment"
          />
        </h3>
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Geplant</th>
              <th scope="col">Gefahren</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Dauer</th>
              <td>{{ formatDuration(planned.workout.durationInMinutes) }}</td>
              <td>
                {{
                  planned.actual.durationMinutes
                    ? formatDuration(planned.actual.durationMinutes)
                    : '–'
                }}
              </td>
            </tr>
            <tr>
              <th scope="row">TSS</th>
              <td>{{ planned.workout.tss }}</td>
              <td>{{ planned.actual.tss ?? '–' }}</td>
            </tr>
            <tr v-if="planned.actual.distanceKm">
              <th scope="row">Distanz</th>
              <td>–</td>
              <td>{{ planned.actual.distanceKm.toLocaleString('de-DE') }} km</td>
            </tr>
          </tbody>
        </table>
        <p class="source">Automatisch übernommen aus intervals.icu.</p>

        <div v-if="planned.actual.confirmed == null" class="confirm">
          <p>War das dieses Training?</p>
          <button type="button" class="button" :disabled="saving" @click="confirm(true)">
            Ja, das war's
          </button>
          <button type="button" class="button ghost" :disabled="saving" @click="confirm(false)">
            Nein, anderes Training
          </button>
        </div>
        <p v-else-if="planned.actual.confirmed" class="confirmed">✓ Bestätigt</p>
        <p v-else class="confirmed">
          Anderes Training – zählt als Belastung, das Workout bleibt offen.
          <button type="button" class="link" :disabled="saving" @click="confirm(true)">
            Doch, war es
          </button>
        </p>
      </div>

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
        <button type="button" class="button" :disabled="downloading" @click="download">
          {{ downloading ? 'Lädt …' : '.fit herunterladen' }}
        </button>
        <p v-if="downloadError" class="error" role="alert">Download hat nicht geklappt.</p>
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

/* ---------- Geplant vs. gefahren ---------- */

.compare table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
}

.compare th,
.compare td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-panel-raised);
}

.compare thead th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.compare tbody th {
  font-weight: 400;
  color: var(--color-text-muted);
}

.compare td:last-child {
  font-weight: 600;
  color: var(--color-hot);
}

.compare .source {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.compare .panel-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.confirm p {
  flex-basis: 100%;
  margin: 0;
  font-weight: 600;
}

.button.ghost {
  background: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-lilac);
}

.confirmed {
  margin: 12px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

/* ---------- Angepasst ---------- */

.adjustment {
  border-left-color: var(--color-lilac);
}

.adjustment p {
  margin: 0;
  color: var(--color-text-muted);
}

.adjustment .adjustment-title {
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-lilac);
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

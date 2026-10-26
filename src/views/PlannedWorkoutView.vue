<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  ApiError,
  adjustPlannedWorkout,
  assignRide,
  confirmActivity,
  getCandidateRides,
  downloadPlannedWorkoutFit,
  getMyAthlete,
  getPlannedWorkout,
  replacePlannedWorkout,
  shufflePlannedWorkout,
  resetPlannedWorkout,
  skipPlannedWorkout,
  undoSkipPlannedWorkout,
  updateProgress,
} from '../api'
import AssessmentBadge from '../components/AssessmentBadge.vue'
import LoadingNotice from '../components/LoadingNotice.vue'
import StrengthSession from '../components/StrengthSession.vue'
import IntervalAccuracyPanel from '../components/IntervalAccuracyPanel.vue'
import WorkoutPicker from '../components/WorkoutPicker.vue'
import WorkoutPurpose from '../components/WorkoutPurpose.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import WorkoutSteps from '../components/WorkoutSteps.vue'
import { formatDuration } from '../plan/weeks'
import { exercisesOf } from '../strength/exercises'
import { heartRateZonesOf } from '../plan/heartRate'
import { isHeartRateMode, type Athlete } from '../types/athlete'
import {
  phaseLabels,
  skipReasonLabels,
  type AdjustDirection,
  type SkipReason,
  type AdjustOptions,
  type ExtraRide,
  type PlannedWorkout,
} from '../types/plan'
import { workoutTypeLabels } from '../types/workout'

const route = useRoute()
const planned = ref<PlannedWorkout | null>(null)
const athlete = ref<Athlete | null>(null)
const ftp = computed(() => athlete.value?.ftp ?? null)
/** Krafttraining: keine Radeinheit – kein Player, keine .fit-Datei, keine Fahrt zum Zuordnen */
const isStrength = computed(() => planned.value?.workout.type === 'STRENGTH')
/** Im Puls-Modus Pulsbereiche, sonst null (= nach Watt) */
const heartRate = computed(() =>
  isHeartRateMode(athlete.value) ? heartRateZonesOf(athlete.value) : null,
)
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
    athlete.value = await getMyAthlete()
    loadCandidates()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

// ---------- Fahrt selbst zuordnen ----------

/** Fahrten des Tages, die nicht automatisch zugeordnet wurden */
const candidates = ref<ExtraRide[]>([])

async function loadCandidates() {
  if (!planned.value || planned.value.actual) {
    candidates.value = []
    return
  }
  try {
    candidates.value = await getCandidateRides(planned.value.id)
  } catch {
    candidates.value = [] // ohne Vorschläge geht es auch
  }
}

async function assign(ride: ExtraRide) {
  if (!planned.value) return
  saving.value = true
  saveError.value = false
  try {
    planned.value = await assignRide(planned.value.id, ride.id)
    candidates.value = []
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}

function describeRide(ride: ExtraRide) {
  const parts = [ride.durationMinutes ? formatDuration(ride.durationMinutes) : null]
  if (ride.distanceKm) parts.push(`${ride.distanceKm.toLocaleString('de-DE')} km`)
  if (ride.tss)
    parts.push(`${ride.tssFromHeartRate || ride.tssFromDuration ? '≈' : ''}${ride.tss} TSS`)
  return parts.filter(Boolean).join(' · ')
}

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

// ---------- Workout für heute anpassen ----------

const adjustButtons: { direction: AdjustDirection; label: string; option: keyof AdjustOptions }[] =
  [
    { direction: 'EASIER', label: '▼ Leichter', option: 'easier' },
    { direction: 'HARDER', label: '▲ Härter', option: 'harder' },
    { direction: 'SHORTER', label: '− Kürzer', option: 'shorter' },
    { direction: 'LONGER', label: '+ Länger', option: 'longer' },
  ]
const adjusting = ref(false)
const adjustError = ref('')

async function adjust(direction: AdjustDirection | 'RESET') {
  if (!planned.value) return
  adjusting.value = true
  adjustError.value = ''
  try {
    planned.value =
      direction === 'RESET'
        ? await resetPlannedWorkout(planned.value.id)
        : await adjustPlannedWorkout(planned.value.id, direction)
  } catch (error) {
    adjustError.value =
      error instanceof ApiError && error.status === 409
        ? 'Das geht bei diesem Workout gerade nicht.'
        : 'Anpassen hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    adjusting.value = false
  }
}

/** "Heute etwas ganz anderes": Auswahl aus der Bibliothek */
const picking = ref(false)

async function replace(workoutId: number, durationMinutes: number | undefined) {
  if (!planned.value) return
  adjusting.value = true
  adjustError.value = ''
  try {
    planned.value = await replacePlannedWorkout(planned.value.id, workoutId, durationMinutes)
    picking.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    adjustError.value =
      error instanceof ApiError && error.status === 409
        ? 'Das geht bei diesem Workout gerade nicht.'
        : 'Tauschen hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    adjusting.value = false
  }
}

/** "Überrasch mich": ein zufälliges anderes Workout, das in die Zeit des Tages passt */
async function shuffle() {
  if (!planned.value) return
  adjusting.value = true
  adjustError.value = ''
  try {
    planned.value = await shufflePlannedWorkout(planned.value.id)
    picking.value = false
  } catch (error) {
    adjustError.value =
      error instanceof ApiError && error.status === 409
        ? 'Für die Zeit an diesem Tag gibt es gerade nichts anderes.'
        : 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    adjusting.value = false
  }
}

async function confirm(matchesPlan: boolean) {
  if (!planned.value) return
  saving.value = true
  saveError.value = false
  try {
    planned.value = await confirmActivity(planned.value.id, matchesPlan)
    // "Nein": die Fahrt ist jetzt eine Zusatzfahrt – und lässt sich unten bei Bedarf doch zuordnen
    if (!matchesPlan) loadCandidates()
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}

// ---------- Nicht gemacht ----------

const skipReasons: SkipReason[] = ['NO_TIME', 'SICK', 'TIRED', 'INJURED', 'OTHER']
const skipOpen = ref(false)

async function skip(reason: SkipReason | null) {
  if (!planned.value) return
  saving.value = true
  saveError.value = false
  try {
    planned.value =
      reason === null
        ? await undoSkipPlannedWorkout(planned.value.id)
        : await skipPlannedWorkout(planned.value.id, reason)
    skipOpen.value = false
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
      <WorkoutPurpose :type="planned.workout.type" :phase="planned.phase" />

      <!-- Für heute anpassen -->
      <!-- Nicht gemacht -->
      <div v-if="planned.skipReason" class="panel skipped" role="status">
        <p class="skipped-title">
          {{
            planned.skipReason === 'PAUSE'
              ? '⏸ Pausiert'
              : `✗ Nicht gemacht – ${skipReasonLabels[planned.skipReason]}`
          }}
        </p>
        <p v-if="planned.skipReason === 'SICK' || planned.skipReason === 'INJURED'" class="hint">
          Gute Besserung! Das nächste harte Training in den Tagen danach wird sanfter.
        </p>
        <button type="button" class="link" :disabled="saving" @click="skip(null)">
          ↺ Doch nicht – Rückmeldung zurücknehmen
        </button>
      </div>

      <div
        v-if="planned.options && !planned.completed && !planned.skipReason && !isStrength"
        class="panel customize"
      >
        <p class="customize-title">Heute lieber anders?</p>
        <div class="customize-buttons">
          <button
            v-for="button in adjustButtons"
            :key="button.direction"
            type="button"
            class="button button-ghost"
            :disabled="adjusting || !planned.options[button.option]"
            @click="adjust(button.direction)"
          >
            {{ button.label }}
          </button>
        </div>
        <div class="pick-buttons">
          <button
            type="button"
            class="button button-ghost pick-toggle"
            :aria-expanded="picking"
            @click="picking = !picking"
          >
            {{ picking ? '× Auswahl schließen' : '⇄ Ganz anderes Training wählen' }}
          </button>
          <button
            type="button"
            class="button button-ghost pick-toggle"
            :disabled="adjusting"
            title="Zufällig ein anderes Workout, das in deine Zeit an diesem Tag passt"
            @click="shuffle"
          >
            🎲 Überrasch mich
          </button>
        </div>
        <p class="hint shuffle-hint">
          Der Zufall nimmt deine verfügbare Zeit an diesem Tag und bleibt ungefähr so hart wie
          geplant.
        </p>
        <WorkoutPicker
          v-if="picking"
          :current-workout-id="planned.workout.id"
          :disabled="adjusting"
          @pick="replace"
        />
        <button
          v-if="planned.options.reset"
          type="button"
          class="link"
          :disabled="adjusting"
          @click="adjust('RESET')"
        >
          ↺ Original wiederherstellen
        </button>
        <p v-if="adjustError" class="error" role="alert">{{ adjustError }}</p>
      </div>

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
          <dt>{{ isStrength ? 'TSS (geschätzt)' : 'TSS' }}</dt>
          <dd>{{ planned.workout.tss }}</dd>
        </div>
        <div v-if="isStrength">
          <dt>Übungen</dt>
          <dd>{{ exercisesOf(planned.workout.id).length }}</dd>
        </div>
        <div v-else-if="heartRate">
          <dt>Max-Puls</dt>
          <dd>{{ heartRate.maxHeartRate }} bpm</dd>
        </div>
        <div v-else-if="ftp">
          <dt>Deine FTP</dt>
          <dd>{{ ftp }} W</dd>
        </div>
      </dl>

      <StrengthSession v-if="isStrength" :workout-id="planned.workout.id" :phase="planned.phase" />
      <WorkoutProfile v-else :steps="planned.workout.steps" class="profile" />

      <RouterLink
        v-if="!planned.completed && !planned.skipReason && !isStrength"
        :to="`/plan/${planned.id}/fahren`"
        class="button play-link"
      >
        ▶ Jetzt in der App fahren
      </RouterLink>

      <!-- Fahrt des Tages selbst zuordnen, wenn sie nicht automatisch erkannt wurde -->
      <div v-if="!planned.actual && candidates.length > 0 && !isStrength" class="panel assign">
        <p class="assign-title">Welche Fahrt war dieses Training?</p>
        <p class="hint">
          <template v-if="candidates.length === 1">An diesem Tag gibt es eine Fahrt.</template>
          <template v-else>An diesem Tag gibt es {{ candidates.length }} Fahrten.</template>
          Automatisch abgehakt werden nur Fahrten auf der Rolle, die genau zum Plan passen – draußen
          entscheidest du. War es dein Training, sucht quaelmich die Intervalle in der Fahrt, auch
          mit An- und Abfahrt.
        </p>
        <ul class="assign-list">
          <li v-for="ride in candidates" :key="ride.id">
            <span>{{ describeRide(ride) }}</span>
            <button
              type="button"
              class="button button-ghost"
              :disabled="saving"
              @click="assign(ride)"
            >
              Das war's
            </button>
          </li>
        </ul>
      </div>

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
              <td>
                <template v-if="planned.actual.tss">
                  {{ planned.actual.tssFromHeartRate ? '≈' : '' }}{{ planned.actual.tss }}
                  <small v-if="planned.actual.tssFromHeartRate" class="estimated">(Puls)</small>
                </template>
                <template v-else>–</template>
              </td>
            </tr>
            <tr v-if="planned.actual.distanceKm">
              <th scope="row">Distanz</th>
              <td>–</td>
              <td>{{ planned.actual.distanceKm.toLocaleString('de-DE') }} km</td>
            </tr>
          </tbody>
        </table>
        <p class="source">
          <template v-if="planned.actual.stravaUrl">
            Übernommen aus Strava ·
            <a :href="planned.actual.stravaUrl" target="_blank" rel="noopener" class="strava-link">
              View on Strava
            </a>
          </template>
          <template v-else>Übernommen aus intervals.icu.</template>
        </p>

        <IntervalAccuracyPanel
          v-if="planned.workout.steps.some((step) => step.kind === 'INTERVAL')"
          :key="planned.actual.durationMinutes ?? 0"
          :planned-id="planned.id"
        />

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

        <!-- Nicht gefahren, auch nichts anderes -->
        <div v-if="!planned.completed && !planned.actual && !planned.skipReason" class="skip">
          <button
            type="button"
            class="link"
            :aria-expanded="skipOpen"
            @click="skipOpen = !skipOpen"
          >
            ✗ Nicht gemacht?
          </button>
          <div v-if="skipOpen" class="skip-reasons">
            <button
              v-for="reason in skipReasons"
              :key="reason"
              type="button"
              class="button button-ghost"
              :disabled="saving"
              @click="skip(reason)"
            >
              {{ skipReasonLabels[reason] }}
            </button>
          </div>
        </div>

        <p v-if="saveError" class="error" role="alert">Speichern hat nicht geklappt.</p>
      </div>

      <div v-if="!isStrength" class="download">
        <button type="button" class="button" :disabled="downloading" @click="download">
          {{ downloading ? 'Lädt …' : '.fit herunterladen' }}
        </button>
        <p v-if="downloadError" class="error" role="alert">Download hat nicht geklappt.</p>
        <p v-if="heartRate">
          Für Garmin, Wahoo &amp; Co. – mit Pulsbereichen in bpm. Kurze, harte Abschnitte haben kein
          Pulsziel: Dafür reagiert der Puls zu langsam, fahr sie nach Gefühl.
        </p>
        <p v-else>
          Für Garmin, Wahoo &amp; Co. – die Leistung ist in % FTP angegeben, dein Radcomputer
          rechnet mit deiner dort eingestellten FTP in Watt um.
        </p>
      </div>

      <div v-if="!isStrength" class="panel">
        <h3 class="panel-title">Abschnitte</h3>
        <WorkoutSteps :steps="planned.workout.steps" :ftp="ftp" :heart-rate="heartRate" />
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

.play-link {
  display: block;
  margin-bottom: 24px;
  padding: 14px;
  text-align: center;
  font-size: 1.1rem;
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

.estimated {
  font-weight: 400;
  color: var(--color-text-muted);
}

.strava-link {
  font-weight: 700;
  color: #fc5200;
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

/* ---------- Fahrt zuordnen ---------- */

.assign-title {
  margin: 0 0 6px;
  font-weight: 700;
}

.assign .hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.assign-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.assign-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 10px;
  border: 2px dashed var(--color-hot);
  font-family: var(--font-mono);
  font-weight: 600;
}

/* ---------- Für heute anpassen ---------- */

.customize-title {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.customize-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (min-width: 640px) {
  .customize-buttons {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.customize-buttons .button {
  padding: 10px 6px;
  font-size: 0.9rem;
}

.customize .link {
  display: block;
  margin-top: 12px;
}

.pick-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.pick-toggle {
  width: 100%;
  padding: 10px 6px;
  font-size: 0.9rem;
}

.shuffle-hint {
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
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

/* ---------- Nicht gemacht ---------- */

.skipped {
  border-left-color: var(--color-panel-raised);
}

.skipped-title {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
}

.skipped .hint {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.skip {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.skip-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.skip-reasons .button {
  padding: 8px 12px;
  font-size: 0.85rem;
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

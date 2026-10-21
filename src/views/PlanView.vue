<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  generatePlan,
  getMyAthlete,
  getPlan,
  importActivities,
  getProgress,
  type Progress,
} from '../api'
import ProgressHeader from '../components/ProgressHeader.vue'
import LoadingNotice from '../components/LoadingNotice.vue'
import AssessmentBadge from '../components/AssessmentBadge.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { buildWeeks, formatDuration, formatHours, toIsoDate, weekIndexFor } from '../plan/weeks'
import { eventFocusLabels, phaseLabels, type TrainingPlan } from '../types/plan'
import { workoutTypeLabels } from '../types/workout'

const plan = ref<TrainingPlan | null>(null)
const hasProfile = ref(false)
const progress = ref<Progress | null>(null)

/** Level & Co. – ohne geht es auch, dann zeigt der Plan den einfachen Überblick */
async function loadProgress() {
  try {
    progress.value = await getProgress()
  } catch {
    progress.value = null
  }
}
const loading = ref(true)
const failed = ref(false)
const generating = ref(false)

const today = toIsoDate(new Date())

function roundToQuarterHour(minutes: number) {
  return Math.round(minutes / 15) * 15
}
const weeks = computed(() => (plan.value ? buildWeeks(plan.value) : []))
const weekIndex = ref(0)
const week = computed(() => weeks.value[weekIndex.value])

const weeksUntilEvent = computed(() => {
  if (!plan.value) return 0
  const ms = new Date(plan.value.eventDate).getTime() - new Date(today).getTime()
  return Math.max(0, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)))
})

async function load() {
  loading.value = true
  failed.value = false
  try {
    plan.value = await getPlan()
    // Ohne Plan: Gibt es wenigstens schon ein Profil? Dann reicht ein Klick auf "Plan erstellen"
    hasProfile.value = plan.value !== null || (await getMyAthlete()) !== null
    weekIndex.value = weekIndexFor(weeks.value, today)
    if (plan.value) loadProgress()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  generating.value = true
  try {
    plan.value = await generatePlan()
    weekIndex.value = weekIndexFor(weeks.value, today)
    loadProgress()
  } catch {
    failed.value = true
  } finally {
    generating.value = false
  }
}

function formatDay(iso: string) {
  const date = new Date(iso)
  return {
    weekday: date.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''),
    date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Im Hintergrund gefahrene Einheiten abholen; wurde etwas zugeordnet, den Plan neu laden */
async function importRides() {
  try {
    const result = await importActivities()
    if (result.matched > 0 || result.extra > 0 || result.adjusted > 0) {
      const index = weekIndex.value
      plan.value = await getPlan()
      weekIndex.value = index
      loadProgress()
    }
  } catch {
    // nicht schlimm – dann bleibt der Plan, wie er ist
  }
}

onMounted(async () => {
  await load()
  if (plan.value) {
    // Fahrten aus intervals.icu und/oder Strava – ohne Verbindung antwortet das Backend mit 409
    importRides()
  }
})
</script>

<template>
  <section>
    <p class="kicker">// Dein Plan</p>

    <LoadingNotice v-if="loading" label="Lädt deinen Plan …" />

    <div v-else-if="failed" class="panel empty" role="alert">
      <p class="error">Der Plan konnte nicht geladen werden.</p>
      <button type="button" class="button button-ghost" @click="load">Nochmal versuchen</button>
    </div>

    <div v-else-if="!plan && !hasProfile" class="panel empty">
      <h2 class="panel-title">Noch kein Plan</h2>
      <p class="hint">
        Leg zuerst dein Profil an – daraus erstellt quaelmich deinen Trainingsplan.
      </p>
      <RouterLink to="/onboarding" class="button">Plan erstellen</RouterLink>
    </div>

    <div v-else-if="!plan" class="panel empty">
      <h2 class="panel-title">Noch kein Plan erstellt</h2>
      <p class="hint">Dein Profil ist gespeichert. Jetzt fehlt nur noch der Plan.</p>
      <button type="button" class="button" :disabled="generating" @click="createPlan">
        {{ generating ? 'Plan wird erstellt …' : 'Plan erstellen' }}
      </button>
    </div>

    <template v-else-if="week">
      <!-- Überblick: Level, Fortschritt, Tage bis zum Event -->
      <ProgressHeader v-if="progress" :progress="progress" />
      <p v-if="plan.eventProfile" class="focus-note">
        <strong>Schwerpunkt: {{ eventFocusLabels[plan.eventProfile.focus].title }}</strong>
        · geschätzte Dauer ca.
        {{ formatHours(roundToQuarterHour(plan.eventProfile.estimatedMinutes)) }}
        <span>{{ eventFocusLabels[plan.eventProfile.focus].hint }}</span>
      </p>
      <div v-else class="panel summary">
        <div>
          <span class="label">Event</span>
          <strong>{{ plan.eventName }}</strong>
          <small>{{ formatDate(plan.eventDate) }}</small>
        </div>
        <div>
          <span class="label">Noch</span>
          <strong>{{ weeksUntilEvent }} Wochen</strong>
        </div>
        <div>
          <span class="label">Plan</span>
          <strong>{{ weeks.length }} Wochen</strong>
          <small>{{ plan.workouts.length }} Workouts</small>
        </div>
      </div>

      <!-- Wochen-Navigation -->
      <div class="week-nav">
        <button
          type="button"
          class="nav-button"
          :disabled="weekIndex === 0"
          aria-label="Vorherige Woche"
          @click="weekIndex--"
        >
          ‹
        </button>
        <div class="week-title">
          <h2>
            Woche {{ weekIndex + 1 }} <span class="of">/ {{ weeks.length }}</span>
          </h2>
          <p>
            {{ formatDay(week.days[0]!.date).date }} – {{ formatDay(week.days[6]!.date).date }}
            <span v-if="week.phase" class="phase" :class="`phase-${week.phase.toLowerCase()}`">
              {{ phaseLabels[week.phase] }}
            </span>
          </p>
        </div>
        <button
          type="button"
          class="nav-button"
          :disabled="weekIndex === weeks.length - 1"
          aria-label="Nächste Woche"
          @click="weekIndex++"
        >
          ›
        </button>
      </div>

      <dl class="week-stats">
        <div>
          <dt>Umfang</dt>
          <dd>{{ formatHours(week.totalMinutes) }}</dd>
        </div>
        <div>
          <dt>TSS</dt>
          <dd>{{ week.totalTss }}</dd>
        </div>
        <div>
          <dt>Erledigt</dt>
          <dd>
            {{ week.completedCount }} /
            {{ week.days.reduce((n, d) => n + d.workouts.length, 0) }}
          </dd>
        </div>
      </dl>

      <!-- Tage der Woche -->
      <ol class="days">
        <li
          v-for="day in week.days"
          :key="day.date"
          class="day"
          :class="{ today: day.date === today }"
        >
          <div class="day-label">
            <span class="weekday">{{ formatDay(day.date).weekday }}</span>
            <span class="date">{{ formatDay(day.date).date }}</span>
          </div>

          <div v-if="day.isEvent" class="event">🏁 {{ plan.eventName }}</div>

          <RouterLink
            v-for="planned in day.workouts"
            :key="planned.id"
            :to="`/plan/${planned.id}`"
            class="session"
            :class="{ completed: planned.completed }"
          >
            <div class="session-main">
              <span class="type">
                <span v-if="planned.completed" class="done-badge">
                  ✓ erledigt<template v-if="planned.rating"> · {{ planned.rating }}/10</template>
                </span>
                {{ workoutTypeLabels[planned.workout.type] }}
              </span>
              <h3 class="session-title">{{ planned.workout.title }}</h3>
              <p v-if="planned.adjustment" class="adjusted">
                ↻ angepasst – statt {{ planned.adjustment.originalTitle }}
              </p>
            </div>
            <div class="session-duration">
              <strong>{{ formatDuration(planned.workout.durationInMinutes) }}</strong>
              <span>TSS {{ planned.workout.tss }}</span>
              <span v-if="planned.actual?.durationMinutes" class="actual">
                gefahren {{ formatDuration(planned.actual.durationMinutes)
                }}<template v-if="planned.actual.tss">
                  · {{ planned.actual.tssFromHeartRate ? '≈' : ''
                  }}{{ planned.actual.tss }}</template
                >
              </span>
              <AssessmentBadge
                v-if="planned.actual?.assessment"
                :assessment="planned.actual.assessment"
                class="assessment"
              />
            </div>
            <WorkoutProfile :steps="planned.workout.steps" class="profile" />
          </RouterLink>

          <div v-for="ride in day.extraRides" :key="`extra-${ride.id}`" class="extra">
            <div>
              <span class="type">+ Zusatzfahrt</span>
              <p class="extra-values">
                <template v-if="ride.durationMinutes">{{
                  formatDuration(ride.durationMinutes)
                }}</template>
                <template v-if="ride.distanceKm">
                  · {{ ride.distanceKm.toLocaleString('de-DE') }} km</template
                >
                <template v-if="ride.tss">
                  · {{ ride.tssFromHeartRate ? '≈' : '' }}{{ ride.tss }} TSS</template
                >
              </p>
            </div>
            <AssessmentBadge v-if="ride.assessment" :assessment="ride.assessment" />
            <a
              v-if="ride.stravaUrl"
              :href="ride.stravaUrl"
              target="_blank"
              rel="noopener"
              class="strava-link"
            >
              View on Strava
            </a>
          </div>

          <p
            v-if="!day.isEvent && day.workouts.length === 0 && day.extraRides.length === 0"
            class="rest"
          >
            Ruhetag
          </p>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.empty .hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
}

.error {
  margin: 0 0 12px;
  color: var(--color-hot);
}

.focus-note {
  margin: -16px 0 24px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.focus-note strong {
  color: var(--color-lilac);
}

.focus-note span {
  display: block;
  margin-top: 2px;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 40px;
  margin: 12px 0 28px;
}

.summary strong {
  display: block;
  font-size: 1.2rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
}

.summary small {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ---------- Wochen-Navigation ---------- */

.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.week-title {
  text-align: center;
}

.week-title h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  font-style: italic;
  font-stretch: 85%;
  text-transform: uppercase;
  line-height: 1;
}

.of {
  color: var(--color-text-muted);
}

.week-title p {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.phase {
  margin-left: 8px;
  padding: 2px 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: var(--color-ink);
  background: var(--color-lilac);
}

.phase-recovery,
.phase-taper {
  background: var(--color-lilac-dim);
}

.phase-peak {
  background: var(--color-hot);
}

.nav-button {
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-panel-raised);
  background: var(--color-panel);
  color: var(--color-lilac);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.nav-button:hover:not(:disabled) {
  border-color: var(--color-lilac);
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.week-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 16px 0 20px;
}

.week-stats dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  text-align: center;
}

.week-stats dd {
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-weight: 600;
  text-align: center;
}

/* ---------- Tage ---------- */

.days {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.day {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 4px 16px;
  align-items: start;
  padding: 12px 16px;
  background: var(--color-panel);
  border-left: 5px solid var(--color-panel-raised);
}

.day.today {
  border-left-color: var(--color-hot);
}

.day-label {
  grid-row: span 3;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.weekday {
  display: block;
  font-weight: 600;
  color: var(--color-lilac);
}

.today .weekday {
  color: var(--color-hot);
}

.date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.rest {
  margin: 0;
  align-self: center;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.event {
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  color: var(--color-hot);
}

.session {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 16px;
  align-items: start;
  color: inherit;
  text-decoration: none;
}

.session .profile {
  grid-column: 1 / -1;
}

.session-duration {
  text-align: right;
  font-family: var(--font-mono);
}

.session-duration strong {
  display: block;
  font-size: 1.35rem;
  line-height: 1.1;
  color: var(--color-text);
}

.session-duration .actual {
  display: block;
  margin-top: 2px;
  color: var(--color-hot);
  font-weight: 600;
}

.session-duration span {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.session-duration .assessment {
  margin-top: 4px;
}

.extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 2px dashed var(--color-hot);
}

.extra .type {
  color: var(--color-hot);
}

.strava-link {
  flex-basis: 100%;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: #fc5200;
}

.extra-values {
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-weight: 600;
}

.adjusted {
  margin: -4px 0 8px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-lilac);
}

.session:hover .session-title {
  color: var(--color-lilac);
}

.session.completed .session-title,
.session.completed .profile {
  opacity: 0.45;
}

.done-badge {
  margin-right: 8px;
  padding: 1px 6px;
  color: var(--color-ink);
  background: var(--color-hot);
}

.type {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-lilac);
}

.session-title {
  margin: 2px 0 8px;
  font-size: 1.15rem;
  font-weight: 900;
  font-style: italic;
  font-stretch: 85%;
  text-transform: uppercase;
  line-height: 1.1;
}

.profile {
  height: 36px;
}

@media (max-width: 480px) {
  .day {
    grid-template-columns: 48px 1fr;
    padding: 10px 12px;
  }

  .week-title h2 {
    font-size: 1.4rem;
  }

  .week-stats {
    gap: 20px;
  }
}
</style>

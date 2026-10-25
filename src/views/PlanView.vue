<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  generatePlan,
  getMyAthlete,
  getPlan,
  importActivities,
  getProgress,
  pausePlan,
  resumePlan,
  type Progress,
} from '../api'
import FtpHint from '../components/FtpHint.vue'
import ProgressHeader from '../components/ProgressHeader.vue'
import LoadingNotice from '../components/LoadingNotice.vue'
import AssessmentBadge from '../components/AssessmentBadge.vue'
import WeekTimeEditor from '../components/WeekTimeEditor.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { missingFeedback, needsFeedback, pausedUntil } from '../plan/feedback'
import { buildWeeks, formatDuration, formatHours, toIsoDate, weekIndexFor } from '../plan/weeks'
import {
  eventFocusLabels,
  phaseLabels,
  skipReasonLabels,
  sportLabels,
  type TrainingPlan,
} from '../types/plan'
import { eventGoalLabels, trainingGoalLabels, type Athlete } from '../types/athlete'
import { workoutTypeLabels } from '../types/workout'
import { exercisesOf } from '../strength/exercises'

const plan = ref<TrainingPlan | null>(null)
const hasProfile = ref(false)
/** fürs FTP-Hinweisfeld; ohne geht es auch */
const athlete = ref<Athlete | null>(null)

async function loadAthlete() {
  try {
    athlete.value = await getMyAthlete()
  } catch {
    athlete.value = null
  }
}
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

const weeks = computed(() => (plan.value ? buildWeeks(plan.value) : []))
const weekIndex = ref(0)
const week = computed(() => weeks.value[weekIndex.value])

/** Ziel ohne Event (FTP, Ausdauer …), sonst null */
const openGoal = computed(() =>
  plan.value?.trainingGoal && plan.value.trainingGoal !== 'EVENT' ? plan.value.trainingGoal : null,
)

const weeksUntilEvent = computed(() => {
  if (!plan.value?.eventDate) return 0
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

// ---------- Rückmeldung fehlt ----------

const missing = computed(() => (plan.value ? missingFeedback(plan.value, today) : []))

function formatShortDay(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

// ---------- Pause ----------

const pauseUntil = computed(() => (plan.value ? pausedUntil(plan.value, today) : null))
const pauseFormOpen = ref(false)
const pauseFrom = ref(today)
const pauseTo = ref(toIsoDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)))
const pausing = ref(false)
const pauseError = ref('')

async function changePause(action: 'pause' | 'resume') {
  pausing.value = true
  pauseError.value = ''
  try {
    const index = weekIndex.value
    plan.value =
      action === 'pause' ? await pausePlan(pauseFrom.value, pauseTo.value) : await resumePlan()
    weekIndex.value = index
    pauseFormOpen.value = false
    loadProgress()
  } catch {
    pauseError.value =
      action === 'pause'
        ? 'Pausieren geht nur ab heute und für höchstens 8 Wochen.'
        : 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    pausing.value = false
  }
}

// ---------- Vergangene Tage der aktuellen Woche einklappen ----------

/** In der laufenden Woche steht heute oben; Vergangenes nur auf Wunsch (offene Rückmeldungen zeigt die Erinnerung) */
const showPast = ref(false)
watch(weekIndex, () => (showPast.value = false))
const pastDays = computed(() => week.value?.days.filter((day) => day.date < today) ?? [])
const hidePast = computed(
  () => !showPast.value && pastDays.value.length > 0 && week.value!.days[6]!.date >= today,
)
/** Ist Vergangenes eingeklappt, rücken die ersten Tage der nächsten Woche nach – so sieht man immer 7 Tage */
const nextWeekDays = computed(() =>
  hidePast.value
    ? (weeks.value[weekIndex.value + 1]?.days.slice(0, pastDays.value.length) ?? [])
    : [],
)
const visibleDays = computed(() =>
  hidePast.value ? week.value!.days.filter((day) => day.date >= today) : (week.value?.days ?? []),
)

// ---------- Zeit für eine Woche ----------

const weekTimeOpen = ref(false)
const weekTimeMessage = ref('')
const weekMonday = computed(() => week.value?.days[0]?.date ?? '')
/** vergangene Wochen lassen sich nicht mehr ändern */
const weekEditable = computed(() => !!week.value && week.value.days[6]!.date >= today)
const weekOverride = computed(() => plan.value?.weekAvailability?.[weekMonday.value] ?? null)
/** laufende Woche: die nächsten 7 Tage ab heute (so zeigt der Plan sie), spätere Wochen: Montag bis Sonntag */
const weekTimeStart = computed(() => (weekMonday.value < today ? today : weekMonday.value))
const weekTimeRolling = computed(() => weekTimeStart.value !== weekMonday.value)
/** schon angepasst? In der laufenden Woche zählt auch die nächste mit, weil die 7 Tage hineinreichen */
const weekTimeAdjusted = computed(() => {
  if (weekOverride.value) return true
  const nextMonday = weeks.value[weekIndex.value + 1]?.days[0]?.date
  return weekTimeRolling.value && !!nextMonday && !!plan.value?.weekAvailability?.[nextMonday]
})

function openWeekTime() {
  weekTimeOpen.value = true
  weekTimeMessage.value = ''
}

function onWeekTimeSaved(updated: TrainingPlan, message: string) {
  const index = weekIndex.value
  plan.value = updated
  weekIndex.value = index
  weekTimeOpen.value = false
  weekTimeMessage.value = message
  loadProgress()
}

/** Im Hintergrund gefahrene Einheiten abholen; wurde etwas zugeordnet, den Plan neu laden */
async function importRides() {
  try {
    const result = await importActivities()
    loadAthlete() // der Import kann einen FTP-Hinweis setzen
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
    loadAthlete()
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
      <ProgressHeader
        v-if="progress"
        :progress="progress"
        :weeks="weeks"
        :today="today"
        :selected-week="weekIndex"
        @select-week="weekIndex = $event"
      />

      <!-- Pause -->
      <div v-if="pauseUntil" class="panel paused" role="status">
        <p class="paused-title">⏸ Plan pausiert bis {{ formatShortDay(pauseUntil) }}</p>
        <button
          type="button"
          class="button button-ghost"
          :disabled="pausing"
          @click="changePause('resume')"
        >
          Pause beenden
        </button>
        <p v-if="pauseError" class="error" role="alert">{{ pauseError }}</p>
      </div>
      <div v-else-if="pauseFormOpen" class="panel pause-form">
        <p class="paused-title">Plan pausieren</p>
        <p class="hint">
          Urlaub, krank, keine Zeit? In der Pause stehen keine Workouts an, und sie verschwinden aus
          intervals.icu. Nach einer Pause ab 4 Tagen wird das erste harte Training sanfter.
        </p>
        <div class="pause-dates">
          <label>
            Von
            <input v-model="pauseFrom" type="date" :min="today" />
          </label>
          <label>
            Bis
            <input v-model="pauseTo" type="date" :min="pauseFrom" />
          </label>
        </div>
        <div class="pause-actions">
          <button
            type="button"
            class="button"
            :disabled="pausing || !pauseFrom || !pauseTo"
            @click="changePause('pause')"
          >
            Pausieren
          </button>
          <button type="button" class="button button-ghost" @click="pauseFormOpen = false">
            Abbrechen
          </button>
        </div>
        <p v-if="pauseError" class="error" role="alert">{{ pauseError }}</p>
      </div>

      <!-- Ziel ohne Event: das Ziel statt des Event-Schwerpunkts -->
      <p v-if="openGoal" class="focus-note">
        <strong>Ziel: {{ trainingGoalLabels[openGoal].title }}</strong>
        <span>{{ trainingGoalLabels[openGoal].hint }}</span>
      </p>
      <p v-else-if="plan.eventProfile" class="focus-note">
        <strong>Schwerpunkt: {{ eventFocusLabels[plan.eventProfile.focus].title }}</strong>
        <template v-if="plan.eventProfile.goal && plan.eventProfile.goal !== 'GOOD_TIME'">
          · Ziel: <strong>{{ eventGoalLabels[plan.eventProfile.goal].title }}</strong>
        </template>
        <span>{{ eventFocusLabels[plan.eventProfile.focus].hint }}</span>
      </p>
      <div v-else class="panel summary">
        <div>
          <span class="label">Event</span>
          <strong>{{ plan.eventName }}</strong>
          <small v-if="plan.eventDate">{{ formatDate(plan.eventDate) }}</small>
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

      <!-- Erinnerung: vergangene Tage ohne Rückmeldung -->
      <div v-if="missing.length" class="panel reminder" role="status">
        <p class="reminder-title">
          ⚠ Noch keine Rückmeldung für {{ missing.length }}
          {{ missing.length === 1 ? 'Tag' : 'Tage' }}
        </p>
        <p class="hint">Gefahren, etwas anderes gemacht oder ausgefallen? Tipp auf den Tag.</p>
        <ul class="reminder-list">
          <li v-for="planned in missing.slice(0, 5)" :key="planned.id">
            <RouterLink :to="`/plan/${planned.id}`">
              {{ formatShortDay(planned.date) }} · {{ planned.workout.title }} →
            </RouterLink>
          </li>
        </ul>
      </div>

      <FtpHint
        v-if="athlete"
        :athlete="athlete"
        :plan="plan"
        :today="today"
        @athlete="athlete = $event"
        @plan="plan = $event"
      />

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
            Woche {{ weekIndex + 1 }}
            <span v-if="!openGoal" class="of">/ {{ weeks.length }}</span>
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

      <WeekTimeEditor
        v-if="weekTimeOpen && weekEditable"
        :key="weekTimeStart"
        :start="weekTimeStart"
        :today="today"
        :week-availability="plan?.weekAvailability"
        @saved="onWeekTimeSaved"
        @close="weekTimeOpen = false"
      />
      <p v-else-if="weekTimeMessage" class="week-time-message" role="status">
        {{ weekTimeMessage }}
      </p>

      <div class="plan-links">
        <button
          v-if="weekEditable && !weekTimeOpen"
          type="button"
          class="pause-link"
          @click="openWeekTime"
        >
          🕒
          <template v-if="weekTimeRolling">
            {{
              weekTimeAdjusted ? 'Zeit angepasst – ändern' : 'Zeit für die nächsten 7 Tage ändern'
            }}
          </template>
          <template v-else>
            {{
              weekTimeAdjusted
                ? 'Zeit diese Woche angepasst – ändern'
                : 'Zeit für diese Woche ändern'
            }}
          </template>
        </button>
        <button
          v-if="!pauseUntil && !pauseFormOpen"
          type="button"
          class="pause-link"
          @click="pauseFormOpen = true"
        >
          ⏸ Plan pausieren
        </button>
      </div>

      <!-- Tage der Woche -->
      <button v-if="hidePast" type="button" class="show-past" @click="showPast = true">
        ▸
        {{ pastDays.length === 1 ? 'Vergangenen Tag' : `${pastDays.length} vergangene Tage` }}
        anzeigen ({{ formatDay(pastDays[0]!.date).weekday
        }}<template v-if="pastDays.length > 1"
          >–{{ formatDay(pastDays[pastDays.length - 1]!.date).weekday }}</template
        >)
      </button>
      <button
        v-else-if="showPast && pastDays.length"
        type="button"
        class="show-past"
        @click="showPast = false"
      >
        ▾ Vergangene Tage ausblenden
      </button>

      <ol class="days">
        <li
          v-for="day in [...visibleDays, ...nextWeekDays]"
          :key="day.date"
          class="day"
          :class="{ today: day.date === today, 'next-week': nextWeekDays.includes(day) }"
          :data-next-week-start="day === nextWeekDays[0] ? 'Nächste Woche' : undefined"
        >
          <div class="day-label">
            <span class="weekday">{{ formatDay(day.date).weekday }}</span>
            <span class="date">{{ formatDay(day.date).date }}</span>
          </div>

          <div v-if="day.isEvent" class="event">🏁 {{ day.eventName }}</div>

          <RouterLink
            v-for="planned in day.workouts"
            :key="planned.id"
            :to="`/plan/${planned.id}`"
            class="session"
            :class="{
              completed: planned.completed,
              skipped: !!planned.skipReason,
              open: needsFeedback(planned, today),
              strength: planned.workout.type === 'STRENGTH',
            }"
          >
            <div class="session-main">
              <span class="type">
                <span v-if="planned.completed" class="done-badge">
                  ✓ erledigt<template v-if="planned.rating"> · {{ planned.rating }}/10</template>
                </span>
                <span v-else-if="planned.skipReason === 'PAUSE'" class="skip-badge">⏸ Pause</span>
                <span v-else-if="planned.skipReason" class="skip-badge">
                  ✗ nicht {{ planned.workout.type === 'STRENGTH' ? 'gemacht' : 'gefahren' }} ·
                  {{ skipReasonLabels[planned.skipReason] }}
                </span>
                <span v-else-if="needsFeedback(planned, today)" class="open-badge">
                  ? Rückmeldung fehlt
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
            <p v-if="planned.workout.type === 'STRENGTH'" class="strength-hint">
              🏋 {{ exercisesOf(planned.workout.id).length }} Übungen mit Anleitung
            </p>
            <WorkoutProfile v-else :steps="planned.workout.steps" class="profile" />
          </RouterLink>

          <div v-for="ride in day.extraRides" :key="`extra-${ride.id}`" class="extra">
            <div>
              <span class="type">+ {{ sportLabels[ride.sport ?? 'RIDE'] }}</span>
              <p class="extra-values">
                <template v-if="ride.durationMinutes">{{
                  formatDuration(ride.durationMinutes)
                }}</template>
                <template v-if="ride.distanceKm">
                  · {{ ride.distanceKm.toLocaleString('de-DE') }} km</template
                >
                <template v-if="ride.tss">
                  · {{ ride.tssFromHeartRate || ride.tssFromDuration ? '≈' : ''
                  }}{{ ride.tss }} TSS</template
                >
              </p>
            </div>
            <AssessmentBadge v-if="ride.assessment" :assessment="ride.assessment" extra />
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
  font-family: var(--font-heading);
  font-weight: 400; /* Saira Stencil gibt es nur in einer Stärke */
  margin: 0;
  font-size: 1.8rem;
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

/* Vorschau auf die nächste Woche: gedämpft, mit Trenner vor dem Montag */
.day.next-week {
  opacity: 0.6;
}

.day.next-week:hover,
.day.next-week:focus-within {
  opacity: 1;
}

.day[data-next-week-start] {
  position: relative;
  margin-top: 28px;
}

.day[data-next-week-start]::before {
  content: '// ' attr(data-next-week-start);
  position: absolute;
  top: -22px;
  left: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
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

.reminder {
  border-left-color: var(--color-hot);
}

.reminder-title,
.paused-title {
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.reminder-title {
  color: var(--color-hot);
}

.reminder .hint,
.pause-form .hint {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.reminder-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.reminder-list a {
  color: var(--color-lilac);
}

.paused {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.paused .paused-title {
  margin: 0;
  color: var(--color-lilac);
}

.pause-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.pause-dates label {
  display: grid;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.pause-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.show-past {
  display: block;
  width: 100%;
  margin: 0 0 8px;
  padding: 8px 12px;
  border: 2px dashed var(--color-panel-raised);
  background: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
}

.show-past:hover {
  border-color: var(--color-lilac);
  color: var(--color-lilac);
}

.plan-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 20px;
  margin: 0 0 12px;
}

.week-time-message {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-lilac);
}

.pause-link {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.pause-link:hover {
  color: var(--color-lilac);
}

.session.skipped {
  opacity: 0.55;
}

.session.skipped .session-title {
  text-decoration: line-through;
}

.session.open {
  outline: 2px dashed var(--color-hot);
  outline-offset: 4px;
}

.session.strength {
  padding-left: 12px;
  box-shadow: inset 4px 0 0 var(--color-lilac);
}

.strength-hint {
  grid-column: 1 / -1;
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-lilac);
}

.skip-badge,
.open-badge {
  margin-right: 6px;
  padding: 1px 6px;
  font-weight: 700;
}

.skip-badge {
  background: var(--color-panel-raised);
  color: var(--color-text);
}

.open-badge {
  background: var(--color-hot);
  color: var(--color-ink);
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
  font-family: var(--font-heading);
  font-weight: 400; /* Saira Stencil gibt es nur in einer Stärke */
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
  font-family: var(--font-heading);
  font-weight: 400; /* Saira Stencil gibt es nur in einer Stärke */
  margin: 2px 0 8px;
  font-size: 1.15rem;
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

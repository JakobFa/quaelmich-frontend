<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { generatePlan, getMyAthlete, saveMyAthlete } from '../api'
import AccountPanel from '../components/AccountPanel.vue'
import HomeScreenHint from '../components/HomeScreenHint.vue'
import MoreEventsPanel from '../components/MoreEventsPanel.vue'
import IntervalsConnection from '../components/IntervalsConnection.vue'
import StravaConnection from '../components/StravaConnection.vue'
import LoadingNotice from '../components/LoadingNotice.vue'
import { powerZones, type PowerZone } from '../plan/zones'
import { formatRange, heartRateZonesOf, rangeFor } from '../plan/heartRate'
import {
  effectiveThresholdHeartRate,
  eventGoalLabels,
  eventTypeLabels,
  levelLabels,
  trainingModeLabels,
  weekdayLabels,
  type Athlete,
  type WeeklyAvailability,
} from '../types/athlete'

const athlete = ref<Athlete | null>(null)
const loading = ref(true)
/** Rückmeldung nach dem Speichern eines Bereichs (siehe OnboardingView) */
const savedSection = useRoute().query.gespeichert === '1'

onMounted(async () => {
  try {
    athlete.value = await getMyAthlete()
  } catch {
    athlete.value = null
  }
  loading.value = false
})

const heartRateZones = computed(() => heartRateZonesOf(athlete.value))

// Verfügbarkeit direkt hier ändern: Der Plan wird ab heute angepasst, Vergangenes bleibt
const availabilityDraft = ref<WeeklyAvailability | null>(null)
const availabilitySaving = ref(false)
const availabilityMessage = ref('')
const availabilityError = ref(false)

function editAvailability() {
  if (!athlete.value) return
  availabilityDraft.value = { ...athlete.value.availability }
  availabilityMessage.value = ''
}

/** Haken "Krafttraining einplanen": speichern und den Plan ab heute neu verteilen */
const strengthSaving = ref(false)
const strengthMessage = ref('')
async function toggleStrength(enabled: boolean) {
  if (!athlete.value) return
  strengthSaving.value = true
  strengthMessage.value = ''
  try {
    athlete.value = await saveMyAthlete({ ...athlete.value, strengthTraining: enabled })
    // ein Server ohne Krafttraining verwirft den Wert stillschweigend – dann nicht "gespeichert" melden
    if ((athlete.value.strengthTraining ?? false) !== enabled) {
      strengthMessage.value =
        'Das kann der Server gerade noch nicht speichern. Versuch es gleich nochmal.'
      return
    }
    await generatePlan()
    strengthMessage.value = enabled
      ? '✓ Krafttraining ist ab heute im Plan.'
      : '✓ Krafttraining ist ab heute aus dem Plan.'
  } catch {
    strengthMessage.value = 'Speichern hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    strengthSaving.value = false
  }
}

async function saveAvailability() {
  if (!athlete.value || !availabilityDraft.value) return
  availabilitySaving.value = true
  availabilityError.value = false
  try {
    athlete.value = await saveMyAthlete({ ...athlete.value, availability: availabilityDraft.value })
    await generatePlan()
    availabilityDraft.value = null
    availabilityMessage.value = '✓ Plan ab heute angepasst – Erledigtes bleibt erhalten.'
  } catch {
    availabilityError.value = true
  } finally {
    availabilitySaving.value = false
  }
}

const totalHours = computed(() =>
  athlete.value ? Object.values(athlete.value.availability).reduce((sum, h) => sum + h, 0) : 0,
)

const wattsPerKg = computed(() =>
  athlete.value?.ftp && athlete.value.weightKg
    ? (athlete.value.ftp / athlete.value.weightKg).toLocaleString('de-DE', {
        maximumFractionDigits: 1,
      })
    : '–',
)

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatNumber(hours: number) {
  return hours.toLocaleString('de-DE')
}

/** "≤ 140 W", "141–190 W", "≥ 378 W" */
function formatPowerZone(zone: PowerZone, ftp: number) {
  const watts = (percent: number) => Math.round((ftp * percent) / 100)
  if (zone.zone === 1) return `≤ ${watts(zone.upTo)} W`
  if (zone.upTo === Infinity) return `≥ ${watts(zone.from)} W`
  return `${watts(zone.from)}–${watts(zone.upTo)} W`
}
</script>

<template>
  <section>
    <p class="kicker">// Profil</p>
    <p v-if="savedSection" class="saved" role="status">
      ✓ Gespeichert – der Plan ist ab heute angepasst, Erledigtes bleibt erhalten.
    </p>

    <LoadingNotice v-if="loading" label="Lädt dein Profil …" />

    <div v-else-if="!athlete" class="panel">
      <h2 class="panel-title">Noch kein Profil</h2>
      <p class="hint">Leg dein Profil an, damit quaelmich deinen Plan erstellen kann.</p>
      <RouterLink to="/onboarding" class="button">Profil anlegen</RouterLink>
    </div>

    <template v-else>
      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Du</h2>
          <RouterLink :to="{ name: 'onboarding', query: { bereich: 'sport' } }" class="edit-link">
            Ändern
          </RouterLink>
        </div>
        <dl class="facts">
          <div>
            <dt>Training nach</dt>
            <dd>{{ trainingModeLabels[athlete.trainingMode ?? 'POWER'] }}</dd>
          </div>
          <div v-if="athlete.ftp">
            <dt>FTP</dt>
            <dd>{{ athlete.ftp }} W</dd>
          </div>
          <div v-if="athlete.maxHeartRate">
            <dt>Max-Puls</dt>
            <dd>{{ athlete.maxHeartRate }} bpm</dd>
          </div>
          <div v-if="effectiveThresholdHeartRate(athlete)">
            <dt>Schwellenpuls</dt>
            <dd>
              {{ athlete.thresholdHeartRate ? '' : '≈'
              }}{{ effectiveThresholdHeartRate(athlete) }} bpm
            </dd>
          </div>
          <div>
            <dt>Gewicht</dt>
            <dd>{{ formatNumber(athlete.weightKg ?? 0) }} kg</dd>
          </div>
          <div v-if="athlete.ftp">
            <dt>W/kg</dt>
            <dd>{{ wattsPerKg }}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{{ athlete.level ? levelLabels[athlete.level] : '–' }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="athlete.ftp" class="panel">
        <h2 class="panel-title">
          Leistungszonen
          <small class="zones-source">{{
            athlete.powerZoneStarts?.length === 6 ? 'eigene' : 'klassisch nach Coggan'
          }}</small>
        </h2>
        <ol class="zones power">
          <li
            v-for="zone in powerZones(athlete.powerZoneStarts ?? null)"
            :key="zone.zone"
            :style="{ borderTopColor: zone.color }"
          >
            <span class="zone-name">Z{{ zone.zone }} {{ zone.name }}</span>
            <span class="zone-range">{{ formatPowerZone(zone, athlete.ftp) }}</span>
          </li>
        </ol>
      </div>

      <div v-if="heartRateZones" class="panel">
        <h2 class="panel-title">
          Pulszonen
          <small class="zones-source">{{
            athlete.heartRateZoneStarts?.length ? 'eigene' : 'aus dem Maximalpuls'
          }}</small>
        </h2>
        <ol class="zones">
          <li v-for="zone in 5" :key="zone" :class="`z${zone}`">
            <span class="zone-name">Z{{ zone }}</span>
            <span class="zone-range">{{ formatRange(rangeFor(heartRateZones, zone)) }}</span>
          </li>
        </ol>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Event</h2>
          <RouterLink :to="{ name: 'onboarding', query: { bereich: 'event' } }" class="edit-link">
            Ändern
          </RouterLink>
        </div>
        <dl class="facts">
          <div>
            <dt>Name</dt>
            <dd>{{ athlete.event.name }}</dd>
          </div>
          <div>
            <dt>Datum</dt>
            <dd>{{ formatDate(athlete.event.date) }}</dd>
          </div>
          <div>
            <dt>Strecke</dt>
            <dd>{{ athlete.event.distanceKm }} km · {{ athlete.event.elevationMeters }} Hm</dd>
          </div>
          <div v-if="athlete.event.type">
            <dt>Art</dt>
            <dd>{{ eventTypeLabels[athlete.event.type] }}</dd>
          </div>
          <div>
            <dt>Ziel</dt>
            <dd>{{ eventGoalLabels[athlete.event.goal ?? 'GOOD_TIME'].title }}</dd>
          </div>
        </dl>
      </div>

      <MoreEventsPanel :first-event-date="athlete.event.date" />

      <div class="panel">
        <h2 class="panel-title">Verfügbarkeit · {{ formatNumber(totalHours) }} h / Woche</h2>

        <form v-if="availabilityDraft" @submit.prevent="saveAvailability">
          <ul class="week">
            <li v-for="(label, day) in weekdayLabels" :key="day">
              <label class="day" :for="`availability-${day}`">{{ label }}</label>
              <input
                :id="`availability-${day}`"
                v-model.number="availabilityDraft[day]"
                class="hours-input"
                type="number"
                min="0"
                max="12"
                step="0.5"
                required
              />
            </li>
          </ul>
          <p class="hint">
            Stunden pro Tag. Der Plan wird ab heute angepasst – erledigte Workouts, Bewertungen und
            gefahrene Einheiten bleiben.
          </p>
          <p v-if="availabilityError" class="error" role="alert">
            Speichern hat nicht geklappt. Bitte versuch es nochmal.
          </p>
          <div class="availability-actions">
            <button type="submit" class="button" :disabled="availabilitySaving">
              {{ availabilitySaving ? 'Passe Plan an …' : 'Speichern & Plan anpassen' }}
            </button>
            <button
              type="button"
              class="button button-ghost"
              :disabled="availabilitySaving"
              @click="availabilityDraft = null"
            >
              Abbrechen
            </button>
          </div>
        </form>

        <template v-else>
          <ul class="week">
            <li
              v-for="(label, day) in weekdayLabels"
              :key="day"
              :class="{ off: athlete.availability[day] === 0 }"
            >
              <span class="day">{{ label }}</span>
              <span class="hours">{{ formatNumber(athlete.availability[day]) }} h</span>
            </li>
          </ul>
          <p v-if="availabilityMessage" class="hint" role="status">{{ availabilityMessage }}</p>
          <button
            type="button"
            class="button button-ghost edit-availability"
            @click="editAvailability"
          >
            Verfügbarkeit ändern
          </button>
        </template>

        <div class="strength-option">
          <label class="strength-toggle">
            <input
              type="checkbox"
              :checked="athlete.strengthTraining"
              :disabled="strengthSaving"
              @change="toggleStrength(($event.target as HTMLInputElement).checked)"
            />
            Krafttraining einplanen
          </label>
          <p class="hint">
            Kurze Routinen für zu Hause, ohne Geräte: Kraft mit etwas Mobility. In der
            Grundlagenphase zweimal pro Woche, danach einmal zum Erhalten, vor dem Event gar nicht.
            Nie vor harten Radeinheiten – mit Animationen, wie die Übungen gehen.
          </p>
          <p v-if="strengthMessage" class="hint" role="status">{{ strengthMessage }}</p>
        </div>
      </div>
    </template>

    <h2 class="section-label">// Verbindungen</h2>
    <div class="connections-intro">
      <p>Beide sind freiwillig – mit ihnen wird quaelmich aber erst richtig gut:</p>
      <ul>
        <li>
          <strong>Strava – fürs Feedback:</strong> holt deine gefahrenen Einheiten (auch von Apple
          Watch &amp; Co.), hakt passende Workouts ab, rechnet die Belastung und passt den Plan an.
        </li>
        <li>
          <strong>intervals.icu – für den Radcomputer:</strong> schickt deine geplanten Workouts
          dorthin und weiter zu Wahoo oder Garmin. Ohne Strava holt quaelmich die gefahrenen
          Einheiten auch von hier.
        </li>
      </ul>
    </div>
    <StravaConnection :athlete="athlete" @athlete-updated="athlete = $event" />
    <IntervalsConnection />

    <HomeScreenHint />

    <h2 class="section-label">// Konto</h2>
    <AccountPanel />
  </section>
</template>

<style scoped>
.section-label {
  margin: 40px 0 12px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.panel {
  margin-bottom: 16px;
}

.hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 0;
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

.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.week li {
  padding: 10px 4px;
  text-align: center;
  background: var(--color-ink);
  border-bottom: 3px solid var(--color-lilac);
}

.week li.off {
  border-bottom-color: var(--color-panel-raised);
  color: var(--color-text-muted);
}

.day {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.hours {
  font-family: var(--font-mono);
  font-weight: 600;
}
.zones-source {
  margin-left: 8px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-style: normal;
  font-weight: 400;
  text-transform: none;
  color: var(--color-text-muted);
}

.zones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
}

.zones li {
  display: grid;
  gap: 2px;
  padding: 8px 6px;
  border-top: 4px solid var(--color-lilac);
  background: var(--color-ink);
}

.zones.power li {
  border-top-width: 5px;
}

.zones .z4,
.zones .z5 {
  border-top-color: var(--color-hot);
}

.zone-name {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.zone-range {
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
}
.hours-input {
  width: 100%;
  min-width: 0;
  margin-top: 4px;
  padding: 6px 0;
  border-width: 2px;
  font-size: 0.8rem;
  letter-spacing: 0;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

/* Pfeil-Knöpfe ausblenden – in den schmalen Tagesfeldern verdecken sie sonst die Zahl */
.hours-input::-webkit-inner-spin-button,
.hours-input::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

form .week {
  gap: 3px;
}

form .week li {
  padding-inline: 1px;
}

.week label.day {
  display: block;
}

.availability-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-availability {
  margin-top: 12px;
}

.error {
  color: var(--color-hot);
}
.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.panel-head .panel-title {
  margin-bottom: 16px;
}

.edit-link {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-lilac);
}

.edit-link:hover {
  color: var(--color-hot);
}

.saved {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-lilac);
}

.connections-intro {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.connections-intro p {
  margin: 0 0 6px;
}

.connections-intro ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
}

.connections-intro strong {
  color: var(--color-text);
}

.strength-option {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.strength-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  cursor: pointer;
}

.strength-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-hot);
}
</style>

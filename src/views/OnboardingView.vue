<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { generatePlan, getMyAthlete, saveMyAthlete } from '../api'
import { DEFAULT_POWER_ZONE_STARTS } from '../plan/zones'
import { heartRateZonesOf } from '../plan/heartRate'
import {
  emptyAthlete,
  emptyEvent,
  eventGoalLabels,
  eventTypeLabels,
  levelLabels,
  needsEvent,
  trainingGoalLabels,
  trainingModeLabels,
  weekdayLabels,
  type Athlete,
  type TargetEvent,
} from '../types/athlete'

const router = useRouter()
const route = useRoute()

const steps = ['Profil', 'Ziel', 'Verfügbarkeit']
const currentStep = ref(0)

/** Einzelner Bereich aus dem Profil, z. B. /onboarding?bereich=event – nur dieser Schritt, direkt speichern */
const SECTIONS: Record<string, { step: number; title: string }> = {
  sport: { step: 0, title: 'Sportliche Daten ändern' },
  event: { step: 1, title: 'Event ändern' },
  verfuegbarkeit: { step: 2, title: 'Verfügbarkeit ändern' },
}
const sectionKey = computed(() =>
  typeof route.query.bereich === 'string' && route.query.bereich in SECTIONS
    ? route.query.bereich
    : null,
)

const athlete = ref<Athlete>(emptyAthlete())
/** Entwurf des Events – bleibt beim Wechsel zu einem Ziel ohne Event erhalten, falls man zurückwechselt */
const event = ref<TargetEvent>(emptyEvent())
const goal = computed(() => athlete.value.trainingGoal ?? 'EVENT')
const saving = ref(false)
const errorMessage = ref('')

const today = new Date().toISOString().slice(0, 10)

/** Eigene Pulszonen: Beginn von Zone 2–5, alle vier oder keine */
/** Gibt es schon ein Profil? Dann wird der vorhandene Plan angepasst statt neu erstellt */
const hadProfile = ref(false)
/** Nur einen Bereich bearbeiten – geht nur mit vorhandenem Profil */
const singleSection = computed(() => hadProfile.value && sectionKey.value !== null)
const zoneInputs = ref<(number | '' | null)[]>([null, null, null, null])
/** Eigene Leistungszonen: Beginn von Zone 2–7 in % FTP, alle sechs oder keine */
const powerZoneInputs = ref<(number | '' | null)[]>([null, null, null, null, null, null])
const filledPowerZones = computed(() => powerZoneInputs.value.filter((v) => typeof v === 'number'))
const heartRateMode = computed(() => athlete.value.trainingMode === 'HEART_RATE')
const filledZones = computed(() => zoneInputs.value.filter((v) => typeof v === 'number'))
/** Pulsdaten sind Gesundheitsdaten → nur mit Einwilligung (bei bestehenden Angaben schon erteilt) */
const hasHeartRateData = computed(
  () =>
    Boolean(athlete.value.maxHeartRate) ||
    Boolean(athlete.value.thresholdHeartRate) ||
    filledZones.value.length > 0,
)
const heartRateConsent = ref(false)
/** Platzhalter: aus dem Maximalpuls berechnete Zonen */
const zonePlaceholders = computed(
  () =>
    heartRateZonesOf({ ...athlete.value, heartRateZoneStarts: null })?.zoneStarts ?? [
      123, 153, 168, 183,
    ],
)

// Wer schon ein Profil hat, sieht seine bisherigen Angaben und kann sie ändern
onMounted(async () => {
  try {
    const existing = await getMyAthlete()
    hadProfile.value = existing !== null
    athlete.value = existing ?? emptyAthlete()
    athlete.value.trainingMode ??= 'POWER'
    athlete.value.trainingGoal ??= 'EVENT'
    event.value = athlete.value.event ?? emptyEvent()
    event.value.type ??= null
    const own = athlete.value.heartRateZoneStarts
    if (own?.length === 4) zoneInputs.value = [...own]
    const ownPower = athlete.value.powerZoneStarts
    if (ownPower?.length === 6) powerZoneInputs.value = [...ownPower]
    heartRateConsent.value = Boolean(
      existing?.maxHeartRate || existing?.thresholdHeartRate || own?.length,
    )
    if (singleSection.value) currentStep.value = SECTIONS[sectionKey.value!]!.step
  } catch {
    // Backend nicht erreichbar – dann mit leerem Formular starten
  }
})

async function next() {
  if (currentStep.value === 0) {
    if (filledZones.value.length !== 0 && filledZones.value.length !== 4) {
      errorMessage.value = 'Pulszonen: bitte alle vier Werte eintragen oder alle leer lassen.'
      return
    }
    const power = filledPowerZones.value as number[]
    if (power.length !== 0 && power.length !== 6) {
      errorMessage.value = 'Leistungszonen: bitte alle sechs Werte eintragen oder alle leer lassen.'
      return
    }
    if (power.some((value, i) => i > 0 && value <= power[i - 1]!)) {
      errorMessage.value = 'Leistungszonen: jede Zone muss höher beginnen als die davor.'
      return
    }
    athlete.value.powerZoneStarts = power.length === 6 ? power : null
    errorMessage.value = ''
    athlete.value.heartRateZoneStarts =
      filledZones.value.length === 4 ? (filledZones.value as number[]) : null
  }
  if (!singleSection.value && currentStep.value < steps.length - 1) {
    currentStep.value++
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    // ohne Event-Ziel kein Event mitschicken
    await saveMyAthlete({ ...athlete.value, event: needsEvent(goal.value) ? event.value : null })
    await generatePlan()
    // einzelner Bereich → zurück ins Profil, sonst in den Plan
    router.push(singleSection.value ? { name: 'profile', query: { gespeichert: '1' } } : '/plan')
  } catch {
    errorMessage.value =
      'Speichern hat nicht geklappt. Bitte prüfe deine Angaben und versuch es nochmal.'
  } finally {
    saving.value = false
  }
}

function back() {
  currentStep.value--
}
</script>

<template>
  <section>
    <p class="kicker">
      //
      {{
        singleSection
          ? SECTIONS[sectionKey!]!.title
          : hadProfile
            ? 'Angaben ändern'
            : 'Plan erstellen'
      }}
    </p>

    <ol v-if="!singleSection" class="stepper">
      <li
        v-for="(step, index) in steps"
        :key="step"
        :class="{ active: index === currentStep, done: index < currentStep }"
      >
        <span class="step-number">{{ index + 1 }}</span> {{ step }}
      </li>
    </ol>

    <form class="panel" @submit.prevent="next">
      <!-- Schritt 1: Profil -->
      <template v-if="currentStep === 0">
        <h2 class="panel-title">Wer bist du?</h2>
        <fieldset class="field">
          <legend>Training nach</legend>
          <div class="choices">
            <label v-for="(label, mode) in trainingModeLabels" :key="mode" class="choice">
              <input
                v-model="athlete.trainingMode"
                type="radio"
                name="trainingMode"
                :value="mode"
              />
              <span>
                {{ label }}
                <small>{{ mode === 'POWER' ? 'mit Wattmesser' : 'ohne Wattmesser' }}</small>
              </span>
            </label>
          </div>
        </fieldset>
        <label class="field">
          <span>FTP (Watt){{ heartRateMode ? ' – optional' : '' }}</span>
          <input
            v-model.number="athlete.ftp"
            type="number"
            min="50"
            max="600"
            placeholder="z. B. 230"
            :required="!heartRateMode"
          />
        </label>
        <details v-if="!heartRateMode" class="field own-zones" :open="filledPowerZones.length > 0">
          <summary>Eigene Leistungszonen (optional, für Ambitionierte)</summary>
          <div class="zone-inputs power">
            <label v-for="(_, index) in powerZoneInputs" :key="index">
              <small>Z{{ index + 2 }} ab %</small>
              <input
                v-model.number="powerZoneInputs[index]"
                type="number"
                min="30"
                max="250"
                :placeholder="String(DEFAULT_POWER_ZONE_STARTS[index])"
                :aria-label="`Beginn Leistungszone ${index + 2} in Prozent der FTP`"
              />
            </label>
          </div>
          <small class="field-hint">
            Beginn von Zone 2 bis 7 in % deiner FTP, z. B. aus einer Leistungsdiagnostik. Leer =
            klassische Zonen nach Coggan (56/76/91/106/121/151 %). Bestimmt Farben und Zonen in der
            App – die Workouts selbst bleiben in % FTP.
          </small>
        </details>
        <label class="field">
          <span>Maximalpuls{{ heartRateMode ? '' : ' (optional)' }}</span>
          <input
            v-model.number="athlete.maxHeartRate"
            type="number"
            min="120"
            max="230"
            placeholder="z. B. 189"
            :required="heartRateMode && filledZones.length !== 4"
          />
          <small class="field-hint">
            Damit schätzt quaelmich den TSS für Fahrten ohne Wattmesser (z. B. mit der Apple Watch).
            Steht auch bei Strava unter „Meine Leistungen“.
          </small>
        </label>
        <label class="field">
          <span>Schwellenpuls (optional)</span>
          <input
            v-model.number="athlete.thresholdHeartRate"
            type="number"
            min="100"
            max="220"
            :placeholder="
              athlete.maxHeartRate
                ? `sonst ≈ ${Math.round(athlete.maxHeartRate * 0.9)}`
                : 'z. B. 170'
            "
          />
          <small class="field-hint">
            Nur eintragen, wenn du ihn aus einem Test kennst – sonst nimmt quaelmich 90 % vom
            Maximalpuls.
          </small>
        </label>
        <fieldset class="field">
          <legend>Eigene Pulszonen (optional)</legend>
          <div class="zone-inputs">
            <label v-for="(_, index) in zoneInputs" :key="index">
              <small>Z{{ index + 2 }} ab</small>
              <input
                v-model.number="zoneInputs[index]"
                type="number"
                min="60"
                max="230"
                :placeholder="String(zonePlaceholders[index])"
                :aria-label="`Beginn Zone ${index + 2}`"
              />
            </label>
          </div>
          <small class="field-hint">
            Beginn von Zone 2 bis 5 in bpm, z. B. aus Strava oder Garmin. Leer = aus dem Maximalpuls
            berechnet (wie Strava: 65/81/89/97 %).
          </small>
        </fieldset>
        <label v-if="hasHeartRateData" class="choice consent">
          <input v-model="heartRateConsent" type="checkbox" required />
          <span>
            Ich willige ein, dass quaelmich meine Pulsangaben (Gesundheitsdaten) speichert, um
            Trainingsbereiche und Belastung zu berechnen. Widerruf jederzeit durch Löschen der
            Angaben – mehr in der
            <RouterLink to="/datenschutz" target="_blank">Datenschutzerklärung</RouterLink>.
          </span>
        </label>
        <label class="field">
          <span>Gewicht (kg)</span>
          <input
            v-model.number="athlete.weightKg"
            type="number"
            min="30"
            max="200"
            step="0.1"
            placeholder="z. B. 72"
            required
          />
        </label>
        <fieldset class="field">
          <legend>Level</legend>
          <div class="choices">
            <label v-for="(label, level) in levelLabels" :key="level" class="choice">
              <input v-model="athlete.level" type="radio" name="level" :value="level" required />
              <span>{{ label }}</span>
            </label>
          </div>
        </fieldset>
      </template>

      <!-- Schritt 2: Event -->
      <template v-else-if="currentStep === 1">
        <h2 class="panel-title">Worauf trainierst du hin?</h2>
        <fieldset class="field">
          <legend>Dein Ziel</legend>
          <div class="goals">
            <label
              v-for="(option, key) in trainingGoalLabels"
              :key="key"
              class="goal"
              :class="{ selected: goal === key }"
            >
              <input
                v-model="athlete.trainingGoal"
                type="radio"
                name="training-goal"
                :value="key"
              />
              <strong>{{ option.title }}</strong>
              <small>{{ option.hint }}</small>
            </label>
          </div>
          <small v-if="!needsEvent(goal)" class="field-hint">
            Ohne festen Termin: Der Plan läuft in Zyklen von 8 Wochen immer weiter, mit einem
            FTP-Test nach jedem Zyklus. Ein Event kannst du später jederzeit eintragen.
          </small>
        </fieldset>
        <template v-if="needsEvent(goal)">
          <label class="field">
            <span>Event</span>
            <input
              v-model.trim="event.name"
              type="text"
              placeholder="z. B. Ötztaler Radmarathon"
              required
            />
          </label>
          <label class="field">
            <span>Datum</span>
            <input v-model="event.date" type="date" :min="today" required />
          </label>
          <label class="field">
            <span>Art des Events (optional)</span>
            <select v-model="event.type">
              <option :value="null">weiß nicht / egal</option>
              <option v-for="(label, type) in eventTypeLabels" :key="type" :value="type">
                {{ label }}
              </option>
            </select>
            <small class="field-hint">
              Bestimmt den Schwerpunkt: ein Kriterium braucht Antritte, ein Bergmarathon lange
              Schwellenintervalle. Ohne Angabe schätzt quaelmich das aus Distanz und Höhenmetern.
            </small>
          </label>
          <div class="field-row">
            <label class="field">
              <span>Distanz (km)</span>
              <input
                v-model.number="event.distanceKm"
                type="number"
                min="1"
                placeholder="227"
                required
              />
            </label>
            <label class="field">
              <span>Höhenmeter</span>
              <input
                v-model.number="event.elevationMeters"
                type="number"
                min="0"
                placeholder="5500"
                required
              />
            </label>
          </div>
          <fieldset class="field">
            <legend>Was willst du beim Event?</legend>
            <div class="goals">
              <label
                v-for="(eventGoal, key) in eventGoalLabels"
                :key="key"
                class="goal"
                :class="{ selected: (event.goal ?? 'GOOD_TIME') === key }"
              >
                <input
                  type="radio"
                  name="event-goal"
                  :value="key"
                  :checked="(event.goal ?? 'GOOD_TIME') === key"
                  @change="event.goal = key"
                />
                <strong>{{ eventGoal.title }}</strong>
                <small>{{ eventGoal.hint }}</small>
              </label>
            </div>
          </fieldset>
        </template>
      </template>

      <!-- Schritt 3: Verfügbarkeit -->
      <template v-else>
        <h2 class="panel-title">Wie viel Zeit hast du nächste Woche?</h2>
        <div class="weekdays">
          <label v-for="(label, day) in weekdayLabels" :key="day" class="field weekday">
            <span>{{ label }}</span>
            <input
              v-model.number="athlete.availability[day]"
              type="number"
              min="0"
              max="12"
              step="0.5"
              required
            />
            <small>Std.</small>
          </label>
        </div>
      </template>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <div v-if="singleSection" class="form-actions">
        <RouterLink to="/profil" class="button button-ghost">Abbrechen</RouterLink>
        <button type="submit" class="button" :disabled="saving">
          {{ saving ? 'Moment …' : 'Speichern' }}
        </button>
      </div>
      <div v-else class="form-actions">
        <button v-if="currentStep > 0" type="button" class="button button-ghost" @click="back">
          Zurück
        </button>
        <button type="submit" class="button" :disabled="saving">
          {{
            currentStep < steps.length - 1
              ? 'Weiter'
              : saving
                ? 'Moment …'
                : hadProfile
                  ? 'Speichern & Plan anpassen'
                  : 'Plan erstellen'
          }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.stepper {
  display: flex;
  gap: 8px;
  margin: 12px 0 20px;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stepper li {
  flex: 1;
  padding: 10px 12px;
  background: var(--color-panel);
  color: var(--color-text-muted);
  border-bottom: 3px solid var(--color-panel-raised);
}

.stepper li.active {
  color: var(--color-text);
  border-bottom-color: var(--color-lilac);
}

.stepper li.done {
  border-bottom-color: var(--color-lilac-dim);
}

.step-number {
  font-weight: 600;
  color: var(--color-lilac);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 8px;
}

.weekday {
  text-align: center;
}

.weekday small {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.error {
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-hot);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 480px) {
  .stepper li {
    font-size: 0.7rem;
    padding: 8px;
  }
}
.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.zone-inputs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.zone-inputs.power {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 8px;
}

@media (min-width: 640px) {
  .zone-inputs.power {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.own-zones summary {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-lilac);
  cursor: pointer;
}

.zone-inputs label {
  display: grid;
  gap: 2px;
}

.zone-inputs small {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.zone-inputs input {
  width: 100%;
  min-width: 0;
  padding-inline: 4px;
  text-align: center;
}

.choice small {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.consent {
  margin-top: 8px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.consent a {
  color: var(--color-lilac);
}

.goals {
  display: grid;
  gap: 8px;
}

@media (min-width: 640px) {
  .goals {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.goal {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 2px solid var(--color-panel-raised);
  cursor: pointer;
}

.goal.selected {
  border-color: var(--color-lilac);
  background: color-mix(in srgb, var(--color-lilac) 10%, transparent);
}

.goal input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.goal:focus-within {
  outline: 2px solid var(--color-hot);
  outline-offset: 2px;
}

.goal small {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { generatePlan, getMyAthlete, saveMyAthlete } from '../api'
import { heartRateZonesOf } from '../plan/heartRate'
import {
  emptyAthlete,
  eventTypeLabels,
  levelLabels,
  trainingModeLabels,
  weekdayLabels,
  type Athlete,
} from '../types/athlete'

const router = useRouter()

const steps = ['Profil', 'Event', 'Verfügbarkeit']
const currentStep = ref(0)

const athlete = ref<Athlete>(emptyAthlete())
const saving = ref(false)
const errorMessage = ref('')

const today = new Date().toISOString().slice(0, 10)

/** Eigene Pulszonen: Beginn von Zone 2–5, alle vier oder keine */
/** Gibt es schon ein Profil? Dann wird der vorhandene Plan angepasst statt neu erstellt */
const hadProfile = ref(false)
const zoneInputs = ref<(number | '' | null)[]>([null, null, null, null])
const heartRateMode = computed(() => athlete.value.trainingMode === 'HEART_RATE')
const filledZones = computed(() => zoneInputs.value.filter((v) => typeof v === 'number'))
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
    athlete.value.event.type ??= null
    const own = athlete.value.heartRateZoneStarts
    if (own?.length === 4) zoneInputs.value = [...own]
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
    errorMessage.value = ''
    athlete.value.heartRateZoneStarts =
      filledZones.value.length === 4 ? (filledZones.value as number[]) : null
  }
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    await saveMyAthlete(athlete.value)
    await generatePlan()
    router.push('/plan')
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
    <p class="kicker">// {{ hadProfile ? 'Angaben ändern' : 'Plan erstellen' }}</p>

    <ol class="stepper">
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
        <label class="field">
          <span>Event</span>
          <input
            v-model.trim="athlete.event.name"
            type="text"
            placeholder="z. B. Ötztaler Radmarathon"
            required
          />
        </label>
        <label class="field">
          <span>Datum</span>
          <input v-model="athlete.event.date" type="date" :min="today" required />
        </label>
        <label class="field">
          <span>Art des Events (optional)</span>
          <select v-model="athlete.event.type">
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
              v-model.number="athlete.event.distanceKm"
              type="number"
              min="1"
              placeholder="227"
              required
            />
          </label>
          <label class="field">
            <span>Höhenmeter</span>
            <input
              v-model.number="athlete.event.elevationMeters"
              type="number"
              min="0"
              placeholder="5500"
              required
            />
          </label>
        </div>
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

      <div class="form-actions">
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
</style>

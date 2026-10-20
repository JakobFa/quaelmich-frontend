<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createAthlete,
  getAthlete,
  getStoredAthleteId,
  storeAthleteId,
  updateAthlete,
} from '../api'
import { emptyAthlete, levelLabels, weekdayLabels, type Athlete } from '../types/athlete'

const router = useRouter()

const steps = ['Profil', 'Event', 'Verfügbarkeit']
const currentStep = ref(0)

const athlete = ref<Athlete>(emptyAthlete())
const existingId = getStoredAthleteId()
const saving = ref(false)
const errorMessage = ref('')

const today = new Date().toISOString().slice(0, 10)

// Wer schon ein Profil hat, sieht seine bisherigen Angaben und kann sie ändern
onMounted(async () => {
  if (existingId) {
    try {
      athlete.value = await getAthlete(existingId)
    } catch {
      // Profil existiert nicht mehr (z. B. Datenbank geleert) → neu anlegen
    }
  }
})

async function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const saved =
      existingId && athlete.value.id
        ? await updateAthlete(existingId, athlete.value)
        : await createAthlete(athlete.value)
    storeAthleteId(saved.id!)
    router.push('/profil')
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
    <p class="kicker">// Plan erstellen</p>

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
        <label class="field">
          <span>FTP (Watt)</span>
          <input
            v-model.number="athlete.ftp"
            type="number"
            min="50"
            max="600"
            placeholder="z. B. 230"
            required
          />
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
          {{ currentStep < steps.length - 1 ? 'Weiter' : saving ? 'Speichert …' : 'Speichern' }}
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
</style>

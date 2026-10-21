<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  disconnectStrava,
  getStravaProfile,
  getStravaStatus,
  saveMyAthlete,
  type StravaProfileSuggestion,
  type StravaStatus,
} from '../api'
import { startStravaLogin } from '../strava/oauth'
import type { Athlete } from '../types/athlete'

const props = defineProps<{ athlete?: Athlete | null }>()
const emit = defineEmits<{ 'athlete-updated': [athlete: Athlete] }>()

const status = ref<StravaStatus | null>(null)
const suggestion = ref<StravaProfileSuggestion | null>(null)
const busy = ref(false)
const errorMessage = ref('')
const applied = ref(false)
const suggestionFailed = ref(false)

onMounted(async () => {
  try {
    status.value = await getStravaStatus()
  } catch {
    errorMessage.value = 'Status konnte nicht geladen werden.'
    return
  }
  if (status.value.connected) {
    try {
      suggestion.value = await getStravaProfile()
    } catch {
      suggestionFailed.value = true
    }
  }
})

type Field = 'ftp' | 'weightKg' | 'thresholdHeartRate'

const fieldLabels: Record<Field, { label: string; unit: string }> = {
  ftp: { label: 'FTP', unit: 'W' },
  weightKg: { label: 'Gewicht', unit: 'kg' },
  thresholdHeartRate: { label: 'Schwellenpuls (ca.)', unit: 'bpm' },
}

/** Nur Werte, die es bei Strava gibt und die sich vom eigenen Profil unterscheiden */
const differences = computed(() => {
  const athlete = props.athlete
  const values = suggestion.value
  if (!athlete || !values?.profileAccess) return []
  return (Object.keys(fieldLabels) as Field[])
    .filter((field) => values[field] != null && values[field] !== athlete[field])
    .map((field) => ({
      field,
      ...fieldLabels[field],
      current: athlete[field] ?? null,
      strava: values[field]!,
    }))
})

function formatValue(value: number | null, unit: string) {
  return value == null ? '–' : `${value.toLocaleString('de-DE')} ${unit}`
}

function connect() {
  if (status.value?.clientId) startStravaLogin(status.value.clientId)
}

async function applySuggestion() {
  if (!props.athlete) return
  busy.value = true
  errorMessage.value = ''
  try {
    const changes = Object.fromEntries(differences.value.map((d) => [d.field, d.strava]))
    emit('athlete-updated', await saveMyAthlete({ ...props.athlete, ...changes }))
    applied.value = true
  } catch {
    errorMessage.value = 'Übernehmen hat nicht geklappt.'
  } finally {
    busy.value = false
  }
}

async function disconnect() {
  busy.value = true
  errorMessage.value = ''
  try {
    await disconnectStrava()
    status.value = { ...status.value!, connected: false, athleteName: null, connectedAt: null }
    suggestion.value = null
  } catch {
    errorMessage.value = 'Trennen hat nicht geklappt.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- Ohne Strava-App auf dem Server wird der Bereich gar nicht angezeigt -->
  <div v-if="status?.available || errorMessage" class="panel">
    <h2 class="panel-title">Strava <span class="beta">Beta</span></h2>

    <template v-if="status?.connected">
      <p class="connected">
        ✓ Verbunden<template v-if="status.athleteName">
          als <strong>{{ status.athleteName }}</strong></template
        >
      </p>

      <!-- Profilwerte aus Strava übernehmen -->
      <div v-if="suggestion && !suggestion.profileAccess" class="suggestion">
        <p>
          quaelmich kann FTP, Gewicht und Pulszonen aus Strava übernehmen – dafür einmal neu
          verbinden und „Profil ansehen“ erlauben.
        </p>
        <button type="button" class="button button-ghost" :disabled="busy" @click="connect">
          Neu verbinden
        </button>
      </div>
      <div v-else-if="differences.length > 0" class="suggestion">
        <p class="suggestion-title">Von Strava übernehmen?</p>
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">quaelmich</th>
              <th scope="col">Strava</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in differences" :key="d.field">
              <th scope="row">{{ d.label }}</th>
              <td>{{ formatValue(d.current, d.unit) }}</td>
              <td class="strava-value">{{ formatValue(d.strava, d.unit) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="differences.some((d) => d.field === 'thresholdHeartRate')" class="hint small">
          <template v-if="suggestion?.thresholdSource === 'ACTIVITIES'">
            Geschätzt aus deinem höchsten Puls der letzten 90 Tage ({{
              suggestion.maxHeartRateObserved
            }}
            bpm) – davon ca. 90 %.
          </template>
          <template v-else>
            Geschätzt aus deinen Strava-Pulszonen (Beginn von Zone 4 „Schwelle“).
          </template>
          Genauer ist ein eigener Test.
        </p>
        <button type="button" class="button" :disabled="busy" @click="applySuggestion">
          Übernehmen
        </button>
      </div>
      <p v-else-if="applied" class="hint">✓ Übernommen.</p>
      <p v-else-if="suggestionFailed" class="hint">
        Dein Strava-Profil (FTP, Gewicht, Puls) konnte gerade nicht gelesen werden.
      </p>
      <p v-else-if="suggestion?.profileAccess && athlete" class="hint">
        ✓ Dein Profil passt zu Strava.
        <template v-if="suggestion.thresholdHeartRate == null">
          Einen Schwellenpuls kennt Strava nicht – trag ihn unter „Angaben ändern“ selbst ein.
        </template>
      </p>

      <p class="hint">
        Deine Radfahrten der letzten 14 Tage werden beim Öffnen des Plans und jede Nacht übernommen
        – auch Pendelfahrten von der Apple Watch. Gibt es eine Fahrt auch in intervals.icu, zählt
        sie nur einmal. Beim Trennen werden alle von Strava übernommenen Fahrten gelöscht.
      </p>
      <button type="button" class="button button-ghost" :disabled="busy" @click="disconnect">
        Trennen
      </button>
    </template>

    <template v-else-if="status">
      <p class="hint">
        Übernimmt gefahrene Einheiten direkt von Strava, z. B. von der Apple Watch oder der
        Strava-App – und auf Wunsch FTP, Gewicht und Schwellenpuls. Noch im Test: höchstens 10
        Personen können sich verbinden.
      </p>
      <button type="button" class="strava-button" @click="connect">Connect with Strava</button>
    </template>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p class="powered">Powered by Strava</p>
  </div>
</template>

<style scoped>
.beta {
  margin-left: 6px;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-style: normal;
  vertical-align: middle;
  color: var(--color-ink);
  background: var(--color-lilac);
}

.connected {
  margin: 0 0 8px;
}

.hint {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.hint.small {
  margin: 8px 0 12px;
  font-size: 0.8rem;
}

.suggestion {
  margin: 12px 0 16px;
  padding: 12px;
  border: 2px dashed #fc5200;
}

.suggestion p {
  margin: 0 0 12px;
}

.suggestion-title {
  font-weight: 700;
}

.suggestion table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
}

.suggestion th,
.suggestion td {
  padding: 4px 8px 4px 0;
  text-align: left;
}

.suggestion thead th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.suggestion tbody th {
  font-weight: 400;
  color: var(--color-text-muted);
}

.strava-value {
  font-weight: 700;
  color: #fc5200;
}

/* Farbe und Höhe nach den Strava-Markenrichtlinien */
.strava-button {
  height: 48px;
  padding: 0 20px;
  border: 0;
  background: #fc5200;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.strava-button:hover {
  filter: brightness(1.1);
}

.powered {
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #fc5200;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  ApiError,
  connectIntervals,
  disconnectIntervals,
  getIntervalsStatus,
  setIntervalsAutoSync,
  type IntervalsStatus,
} from '../api'

const status = ref<IntervalsStatus | null>(null)
const apiKey = ref('')
const athleteId = ref('')
const busy = ref(false)
const errorMessage = ref('')
const editing = ref(false)

onMounted(async () => {
  try {
    status.value = await getIntervalsStatus()
  } catch {
    errorMessage.value = 'Status konnte nicht geladen werden.'
  }
})

async function connect() {
  busy.value = true
  errorMessage.value = ''
  try {
    status.value = await connectIntervals(apiKey.value, athleteId.value)
    // Schlüssel sofort aus dem Formular entfernen – er wird nur verschlüsselt im Backend gespeichert
    apiKey.value = ''
    editing.value = false
  } catch (error) {
    errorMessage.value = connectErrorMessage(error)
  } finally {
    busy.value = false
  }
}

function connectErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Unerwarteter Fehler. Bitte versuch es nochmal.'
  switch (error.status) {
    case 422:
      return 'intervals.icu hat den Schlüssel oder die Athleten-ID abgelehnt. Bitte prüfe beides.'
    case 400:
      return 'Die Athleten-ID sieht nicht richtig aus (Beispiel: i12345).'
    case 502:
      return 'intervals.icu ist gerade nicht erreichbar. Bitte versuch es später nochmal.'
    case 0:
      return 'Der quaelmich-Server antwortet gerade nicht. Bitte versuch es gleich nochmal.'
    default:
      return `Verbinden hat nicht geklappt (Fehler ${error.status}). Bitte versuch es später nochmal.`
  }
}

async function disconnect() {
  busy.value = true
  errorMessage.value = ''
  try {
    await disconnectIntervals()
    status.value = {
      connected: false,
      intervalsAthleteId: null,
      connectedAt: null,
      autoSync: false,
      lastSyncedAt: null,
    }
  } catch {
    errorMessage.value = 'Trennen hat nicht geklappt.'
  } finally {
    busy.value = false
  }
}

async function toggleAutoSync() {
  if (!status.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    status.value = await setIntervalsAutoSync(!status.value.autoSync)
  } catch {
    errorMessage.value = 'Einstellung konnte nicht gespeichert werden.'
  } finally {
    busy.value = false
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="panel">
    <h2 class="panel-title">intervals.icu</h2>

    <template v-if="status?.connected && !editing">
      <p class="connected">
        ✓ Verbunden mit
        <strong>{{
          status.intervalsAthleteId === '0' ? 'deinem Konto' : status.intervalsAthleteId
        }}</strong>
        <span v-if="status.connectedAt"> seit {{ formatDate(status.connectedAt) }}</span>
      </p>
      <label class="choice auto-sync">
        <input
          type="checkbox"
          :checked="status.autoSync"
          :disabled="busy"
          @change="toggleAutoSync"
        />
        <span>
          Automatisch synchronisieren
          <small>nach „Plan erstellen“ und jede Nacht für die nächsten 14 Tage</small>
        </span>
      </label>
      <p class="hint">
        <template v-if="status.lastSyncedAt">
          Zuletzt gesendet: {{ formatDateTime(status.lastSyncedAt) }} Uhr.
        </template>
        Von intervals.icu gelangen die Workouts – wenn du es dort eingerichtet hast – zu Wahoo oder
        Garmin.
      </p>
      <div class="actions">
        <button type="button" class="button button-ghost" :disabled="busy" @click="editing = true">
          Schlüssel ändern
        </button>
        <button type="button" class="button button-ghost" :disabled="busy" @click="disconnect">
          Trennen
        </button>
      </div>
    </template>

    <form v-else-if="status" @submit.prevent="connect">
      <p class="hint">
        Verbinde dein eigenes intervals.icu-Konto, um Workouts direkt in deinen Kalender zu
        schicken. Den API-Schlüssel und deine Athleten-ID findest du in intervals.icu unter
        <strong>Settings → Developer Settings</strong>.
      </p>
      <label class="field">
        <span>API-Schlüssel</span>
        <input v-model.trim="apiKey" type="password" autocomplete="off" required />
      </label>
      <label class="field">
        <span>Athleten-ID (optional, z. B. i12345)</span>
        <input
          v-model.trim="athleteId"
          type="text"
          autocomplete="off"
          placeholder="leer = dein Konto"
        />
      </label>
      <p class="hint small">
        Der Schlüssel wird vor dem Speichern bei intervals.icu geprüft und nur verschlüsselt
        gespeichert. Er wird dir danach nicht mehr angezeigt.
      </p>
      <div class="actions">
        <button type="submit" class="button" :disabled="busy">
          {{ busy ? 'Wird geprüft …' : 'Verbinden' }}
        </button>
        <button
          v-if="status.connected"
          type="button"
          class="button button-ghost"
          :disabled="busy"
          @click="editing = false"
        >
          Abbrechen
        </button>
      </div>
    </form>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.panel {
  margin-bottom: 16px;
}

.connected {
  margin: 0 0 8px;
  color: var(--color-lilac);
}

.hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
}

.auto-sync {
  margin: 8px 0 12px;
}

.auto-sync small {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.small {
  font-size: 0.8rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.error {
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-hot);
}
</style>

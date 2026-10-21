<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { disconnectStrava, getStravaStatus, type StravaStatus } from '../api'
import { startStravaLogin } from '../strava/oauth'

const status = ref<StravaStatus | null>(null)
const busy = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    status.value = await getStravaStatus()
  } catch {
    errorMessage.value = 'Status konnte nicht geladen werden.'
  }
})

function connect() {
  if (status.value?.clientId) startStravaLogin(status.value.clientId)
}

async function disconnect() {
  busy.value = true
  errorMessage.value = ''
  try {
    await disconnectStrava()
    status.value = { ...status.value!, connected: false, athleteName: null, connectedAt: null }
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
      <p class="hint">
        Deine Radfahrten der letzten 14 Tage werden beim Öffnen des Plans und jede Nacht übernommen –
        auch Pendelfahrten von der Apple Watch. Gibt es eine Fahrt auch in intervals.icu, zählt sie
        nur einmal. Beim Trennen werden alle von Strava übernommenen Fahrten gelöscht.
      </p>
      <button type="button" class="button button-ghost" :disabled="busy" @click="disconnect">
        Trennen
      </button>
    </template>

    <template v-else-if="status">
      <p class="hint">
        Übernimmt gefahrene Einheiten direkt von Strava, z. B. von der Apple Watch oder der
        Strava-App. Noch im Test: höchstens 10 Personen können sich verbinden.
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

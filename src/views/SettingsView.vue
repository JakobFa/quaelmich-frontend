<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getMyAthlete } from '../api'
import { auth } from '../auth'
import AccountPanel from '../components/AccountPanel.vue'
import AiConnections from '../components/AiConnections.vue'
import CalendarSubscription from '../components/CalendarSubscription.vue'
import HealthPanel from '../components/HealthPanel.vue'
import HomeScreenHint from '../components/HomeScreenHint.vue'
import IntervalsConnection from '../components/IntervalsConnection.vue'
import StravaConnection from '../components/StravaConnection.vue'
import type { Athlete } from '../types/athlete'

/** Strava schlägt Werte vor, die vom eigenen Profil abweichen – dafür das Profil laden */
const athlete = ref<Athlete | null>(null)

onMounted(async () => {
  try {
    athlete.value = await getMyAthlete()
  } catch {
    athlete.value = null
  }
})
</script>

<template>
  <section>
    <p class="kicker">// Einstellungen</p>

    <h2 class="section-label first">// Verbindungen</h2>
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
    <HealthPanel />
    <CalendarSubscription />

    <h2 class="section-label">// KI</h2>
    <AiConnections />

    <h2 class="section-label">// App</h2>
    <HomeScreenHint />

    <h2 class="section-label">// Konto</h2>
    <p v-if="auth.email.value" class="signed-in">
      Angemeldet als <strong>{{ auth.email.value }}</strong>
    </p>
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

.section-label.first {
  margin-top: 24px;
}

.signed-in {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.signed-in strong {
  color: var(--color-text);
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
</style>

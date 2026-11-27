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
import SettingsSection from '../components/SettingsSection.vue'
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
    <div class="sections">
      <SettingsSection
        id="strava"
        title="Strava"
        summary="Holt deine Fahrten, hakt Workouts ab und passt den Plan an"
      >
        <template #title>Strava <span class="beta">Beta</span></template>
        <StravaConnection :athlete="athlete" @athlete-updated="athlete = $event" />
      </SettingsSection>
      <SettingsSection
        id="intervals"
        title="intervals.icu"
        summary="Schickt deine Workouts auf Wahoo oder Garmin, holt Fahrten ohne Strava"
      >
        <IntervalsConnection />
      </SettingsSection>
      <SettingsSection
        id="schlaf"
        title="Schlaf & Erholung"
        summary="Schlaf, Ruhepuls und HRV aus intervals.icu"
      >
        <HealthPanel />
      </SettingsSection>
      <SettingsSection
        id="kalender"
        title="Kalender"
        summary="Dein Plan als Abo in Apple-, Google- oder Outlook-Kalender"
      >
        <CalendarSubscription />
      </SettingsSection>
    </div>

    <h2 class="section-label">// KI</h2>
    <div class="sections">
      <SettingsSection
        id="ki-modus"
        title="KI-Modus"
        summary="Deine eigene KI liest und plant deinen Trainingsplan"
      >
        <AiConnections />
      </SettingsSection>
    </div>

    <h2 class="section-label">// App &amp; Konto</h2>
    <div class="sections">
      <SettingsSection
        id="app"
        title="Als App aufs Handy"
        summary="quaelmich auf den Home-Bildschirm legen"
      >
        <HomeScreenHint />
      </SettingsSection>
      <SettingsSection
        id="konto"
        title="Konto & Daten"
        :summary="
          auth.email.value
            ? `Angemeldet als ${auth.email.value}`
            : 'Daten herunterladen, Konto löschen'
        "
      >
        <AccountPanel />
      </SettingsSection>
    </div>
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

.sections {
  display: grid;
  gap: 10px;
}

.beta {
  margin-left: 6px;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  vertical-align: middle;
  color: var(--color-ink);
  background: var(--color-lilac);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAthlete, getStoredAthleteId } from '../api'
import { levelLabels, weekdayLabels, type Athlete } from '../types/athlete'

const athlete = ref<Athlete | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = getStoredAthleteId()
  if (id) {
    try {
      athlete.value = await getAthlete(id)
    } catch {
      athlete.value = null
    }
  }
  loading.value = false
})

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
</script>

<template>
  <section>
    <p class="kicker">// Profil</p>

    <p v-if="loading" class="hint">Lädt …</p>

    <div v-else-if="!athlete" class="panel">
      <h2 class="panel-title">Noch kein Profil</h2>
      <p class="hint">Leg dein Profil an, damit quaelmich deinen Plan erstellen kann.</p>
      <RouterLink to="/onboarding" class="button">Profil anlegen</RouterLink>
    </div>

    <template v-else>
      <div class="panel">
        <h2 class="panel-title">Du</h2>
        <dl class="facts">
          <div>
            <dt>FTP</dt>
            <dd>{{ athlete.ftp }} W</dd>
          </div>
          <div>
            <dt>Gewicht</dt>
            <dd>{{ formatNumber(athlete.weightKg ?? 0) }} kg</dd>
          </div>
          <div>
            <dt>W/kg</dt>
            <dd>{{ wattsPerKg }}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{{ athlete.level ? levelLabels[athlete.level] : '–' }}</dd>
          </div>
        </dl>
      </div>

      <div class="panel">
        <h2 class="panel-title">Event</h2>
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
        </dl>
      </div>

      <div class="panel">
        <h2 class="panel-title">Verfügbarkeit · {{ formatNumber(totalHours) }} h / Woche</h2>
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
      </div>

      <RouterLink to="/onboarding" class="button">Angaben ändern</RouterLink>
    </template>
  </section>
</template>

<style scoped>
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
</style>

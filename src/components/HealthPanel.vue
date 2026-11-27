<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  disableHealthImport,
  enableHealthImport,
  getHealthStatus,
  importHealthNow,
  shareHealthWithAi,
  type HealthDay,
  type HealthStatus,
} from '../api'

/**
 * Schlaf und Erholung von intervals.icu: Dort landen die Werte aus allen Quellen – Garmin, Oura, Whoop, Apple
 * Health über eine Zusatz-App oder eigene Einträge. quaelmich übernimmt sie nur mit Einwilligung.
 */
const status = ref<HealthStatus | null>(null)
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const consent = ref(false)

async function load() {
  try {
    status.value = await getHealthStatus()
  } catch {
    error.value = 'Schlaf und Erholung konnten nicht geladen werden.'
  } finally {
    loaded.value = true
  }
}

onMounted(load)

async function run(action: () => Promise<HealthStatus | void>, failure: string) {
  busy.value = true
  error.value = ''
  try {
    const result = await action()
    if (result) status.value = result
    else await load()
  } catch {
    error.value = failure
  } finally {
    busy.value = false
  }
}

function enable() {
  if (!consent.value) return
  run(enableHealthImport, 'intervals.icu hat gerade nicht geantwortet. Versuch es gleich nochmal.')
}

function refresh() {
  run(importHealthNow, 'intervals.icu hat gerade nicht geantwortet. Versuch es gleich nochmal.')
}

const aiConsent = ref(false)

function shareWithAi(share: boolean) {
  if (share && !aiConsent.value) return
  run(() => shareHealthWithAi(share), 'Das hat nicht geklappt. Bitte versuch es nochmal.')
  if (!share) aiConsent.value = false
}

function disable() {
  if (
    !window.confirm('Übernahme beenden und alle Schlaf- und Erholungsdaten bei quaelmich löschen?')
  )
    return
  consent.value = false
  run(disableHealthImport, 'Das hat nicht geklappt. Bitte versuch es nochmal.')
}

function hours(minutes: number | null) {
  if (minutes == null) return '–'
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`
}

function value(number: number | null, unit = '') {
  return number == null ? '–' : `${number.toLocaleString('de-DE')}${unit}`
}

function hrv(entry: HealthDay) {
  if (entry.hrvMs != null) return `${entry.hrvMs} ms`
  if (entry.hrvSdnnMs != null) return `${entry.hrvSdnnMs} ms*`
  return '–'
}

function day(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
}

function when(instant: string) {
  return new Date(instant).toLocaleString('de-DE', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="panel health" aria-labelledby="health-title">
    <h2 id="health-title" class="panel-title">Schlaf &amp; Erholung</h2>
    <p class="hint">
      quaelmich übernimmt Schlaf, Ruhepuls, HRV und Schritte aus intervals.icu – egal, woher sie
      dort kommen: Garmin, Oura, Whoop, Apple Health über eine Zusatz-App oder deine eigenen
      Einträge.
    </p>

    <p
      v-if="loaded && status && !status.intervalsConnected"
      class="hint"
      data-test="health-needs-intervals"
    >
      Verbinde dafür zuerst intervals.icu (oben).
    </p>

    <template v-else-if="loaded && status && !status.importEnabled">
      <label class="consent">
        <input v-model="consent" type="checkbox" data-test="health-consent" />
        <span>
          Ich willige ein, dass quaelmich meine Gesundheitsdaten (Schlaf, Ruhepuls, HRV, Schritte)
          von intervals.icu übernimmt, speichert und für mein Training auswertet. Ich kann das
          jederzeit hier widerrufen; dann werden alle diese Daten gelöscht. Sie gehen nicht an
          Dritte und nur an deine KI, wenn du das unten extra freigibst.
        </span>
      </label>
      <button type="button" class="button" :disabled="busy || !consent" @click="enable">
        Schlaf &amp; Erholung übernehmen
      </button>
    </template>

    <template v-else-if="loaded && status?.importEnabled">
      <p class="hint" data-test="health-enabled">
        <template v-if="status.lastImportAt">
          Zuletzt abgerufen: {{ when(status.lastImportAt) }}.
        </template>
        <template v-if="!status.days.length">
          Bei intervals.icu liegen für die letzten Wochen noch keine Werte. Prüf dort unter
          „Wellness“, ob deine Uhr oder App etwas schickt.
        </template>
      </p>

      <table v-if="status.days.length" class="days" data-test="health-days">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Schlaf</th>
            <th>Score</th>
            <th>Ruhepuls</th>
            <th>HRV</th>
            <th>Schritte</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in status.days.slice(0, 7)" :key="entry.date">
            <td>{{ day(entry.date) }}</td>
            <td>{{ hours(entry.sleepMinutes) }}</td>
            <td>{{ value(entry.sleepScore) }}</td>
            <td>{{ value(entry.restingHeartRate) }}</td>
            <td>{{ hrv(entry) }}</td>
            <td>{{ value(entry.steps) }}</td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="status.days.some((entry) => entry.hrvMs == null && entry.hrvSdnnMs != null)"
        class="hint"
      >
        * HRV als SDNN (Apple Watch) – nicht direkt mit rMSSD-Werten anderer Uhren vergleichbar.
      </p>

      <div class="ai-share" data-test="health-ai">
        <template v-if="status.sharedWithAi">
          <p class="hint">
            <strong>Für deine KI freigegeben:</strong> Im KI-Modus kann deine KI diese Werte lesen
            und in ihre Einschätzung und Planung einbeziehen.
          </p>
          <button type="button" class="link" :disabled="busy" @click="shareWithAi(false)">
            Freigabe für die KI zurücknehmen
          </button>
        </template>
        <template v-else>
          <label class="consent">
            <input v-model="aiConsent" type="checkbox" data-test="health-ai-consent" />
            <span>
              Auch meiner KI zeigen: Ich willige ein, dass quaelmich diese Gesundheitsdaten im
              KI-Modus an meine verbundene KI-App (zum Beispiel Claude) gibt. Dort gelten die
              Bedingungen meines KI-Anbieters. Ich kann das jederzeit hier zurücknehmen.
            </span>
          </label>
          <button
            type="button"
            class="button button-ghost"
            :disabled="busy || !aiConsent"
            @click="shareWithAi(true)"
          >
            Für meine KI freigeben
          </button>
        </template>
      </div>

      <div class="actions">
        <button type="button" class="link" :disabled="busy" @click="refresh">Jetzt abrufen</button>
        <button type="button" class="link" :disabled="busy" @click="disable">
          Beenden und Daten löschen
        </button>
      </div>
    </template>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.consent {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
  font-size: 0.85rem;
}

.consent input {
  margin-top: 3px;
}

.ai-share {
  margin: 4px 0 14px;
  padding-top: 10px;
  border-top: 1px solid var(--color-panel-raised);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 10px;
}

.days {
  width: 100%;
  margin: 0 0 8px;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.days th,
.days td {
  padding: 4px 6px 4px 0;
  text-align: right;
  white-space: nowrap;
}

.days th:first-child,
.days td:first-child {
  text-align: left;
}

.days th {
  color: var(--color-text-muted);
  font-weight: 400;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.link:hover {
  color: var(--color-lilac);
}

.error {
  margin: 8px 0 0;
  color: var(--color-hot);
}

@media (max-width: 420px) {
  .days th:nth-child(6),
  .days td:nth-child(6) {
    display: none;
  }
}
</style>

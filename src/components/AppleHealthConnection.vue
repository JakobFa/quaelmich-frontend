<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  createHealthKey,
  endHealthConnection,
  getHealthStatus,
  healthUploadUrl,
  type HealthStatus,
} from '../api'

/**
 * Apple Health: Ein Kurzbefehl auf dem iPhone schickt einmal am Tag Schlaf und Bewegung an quaelmich. Apple Health
 * hat keine Schnittstelle für Webseiten – deshalb ein Upload-Schlüssel statt einer Anmeldung.
 * Der Schlüssel wird nur direkt nach dem Erzeugen angezeigt; gespeichert ist bei quaelmich nur sein Hash.
 */
const status = ref<HealthStatus | null>(null)
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const consent = ref(false)
const key = ref<string | null>(null)
const copied = ref<'' | 'url' | 'key'>('')
const showGuide = ref(false)

const connected = computed(() => status.value?.connected ?? false)

async function load() {
  try {
    status.value = await getHealthStatus()
  } catch {
    error.value = 'Apple Health konnte nicht geladen werden.'
  } finally {
    loaded.value = true
  }
}

onMounted(load)

async function create() {
  if (!consent.value && !connected.value) return
  busy.value = true
  error.value = ''
  try {
    key.value = (await createHealthKey()).key
    copied.value = ''
    showGuide.value = true
    await load()
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    busy.value = false
  }
}

async function end() {
  if (!window.confirm('Verbindung beenden und alle Gesundheitsdaten bei quaelmich löschen?')) return
  busy.value = true
  error.value = ''
  try {
    await endHealthConnection()
    key.value = null
    consent.value = false
    await load()
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    busy.value = false
  }
}

async function copy(what: 'url' | 'key') {
  const text = what === 'url' ? healthUploadUrl() : key.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = what
  } catch {
    error.value = 'Kopieren geht hier nicht – markiere den Text und kopiere ihn von Hand.'
  }
}

function hours(minutes: number | null) {
  if (minutes == null) return '–'
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`
}

function value(number: number | null, unit = '') {
  return number == null ? '–' : `${number.toLocaleString('de-DE')}${unit}`
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
    <h2 id="health-title" class="panel-title">Apple Health</h2>
    <p class="hint">
      Schick quaelmich jeden Abend deinen Schlaf und deine Bewegung aus Apple Health: Schlafdauer,
      Schritte, aktive Kalorien, Ruhepuls und HRV. Apple Health lässt sich nicht direkt mit einer
      Webseite verbinden – das übernimmt ein Kurzbefehl auf deinem iPhone. Freiwillig und jederzeit
      wieder abschaltbar.
    </p>

    <template v-if="loaded && !connected">
      <label class="consent">
        <input v-model="consent" type="checkbox" data-test="health-consent" />
        <span>
          Ich willige ein, dass quaelmich meine Gesundheitsdaten (Schlaf, Bewegung, Ruhepuls, HRV)
          speichert und für mein Training auswertet. Ich kann das jederzeit hier widerrufen; dann
          werden alle diese Daten gelöscht. Sie gehen nicht an Dritte und nicht an KI-Apps.
        </span>
      </label>
      <button type="button" class="button" :disabled="busy || !consent" @click="create">
        Upload-Schlüssel erstellen
      </button>
    </template>

    <template v-if="key">
      <p class="label">Adresse</p>
      <p class="code" data-test="health-url">{{ healthUploadUrl() }}</p>
      <p class="label">Dein Schlüssel – nur jetzt sichtbar</p>
      <p class="code" data-test="health-key">{{ key }}</p>
      <div class="actions">
        <button type="button" class="button button-ghost" @click="copy('url')">
          {{ copied === 'url' ? 'Kopiert ✓' : 'Adresse kopieren' }}
        </button>
        <button type="button" class="button button-ghost" @click="copy('key')">
          {{ copied === 'key' ? 'Kopiert ✓' : 'Schlüssel kopieren' }}
        </button>
      </div>
      <p class="hint">
        Der Schlüssel ist geheim: Wer ihn hat, kann Werte in dein Konto schreiben (aber nichts
        lesen). Trag ihn jetzt in den Kurzbefehl ein – später zeigt quaelmich ihn nicht mehr an.
      </p>
    </template>

    <template v-if="loaded && connected">
      <p v-if="!key" class="hint" data-test="health-connected">
        Verbunden (Schlüssel endet auf <span class="mono">…{{ status?.lastChars }}</span
        >).
        <template v-if="status?.lastUploadAt">
          Zuletzt empfangen: {{ when(status.lastUploadAt) }}.
        </template>
        <template v-else>Noch nichts empfangen – starte den Kurzbefehl einmal von Hand.</template>
      </p>

      <table v-if="status?.days.length" class="days" data-test="health-days">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Schlaf</th>
            <th>Schritte</th>
            <th>Aktiv</th>
            <th>Ruhepuls</th>
            <th>HRV</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in status.days.slice(0, 7)" :key="entry.date">
            <td>{{ day(entry.date) }}</td>
            <td>{{ hours(entry.sleepMinutes) }}</td>
            <td>{{ value(entry.steps) }}</td>
            <td>{{ value(entry.activeEnergyKcal, ' kcal') }}</td>
            <td>{{ value(entry.restingHeartRate) }}</td>
            <td>{{ value(entry.hrvMs, ' ms') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="actions">
        <button type="button" class="link" @click="showGuide = !showGuide">
          {{ showGuide ? 'Anleitung ausblenden' : 'Anleitung für den Kurzbefehl' }}
        </button>
        <button type="button" class="link" :disabled="busy" @click="create">
          Neuen Schlüssel erzeugen
        </button>
        <button type="button" class="link" :disabled="busy" @click="end">
          Beenden und Daten löschen
        </button>
      </div>
    </template>

    <div v-if="showGuide && connected" class="guide" data-test="health-guide">
      <p class="label">So richtest du den Kurzbefehl ein</p>
      <ol>
        <li>
          Öffne auf dem iPhone die App <strong>Kurzbefehle</strong> → <strong>Automation</strong> →
          <strong>+</strong> → <strong>Tageszeit</strong>: täglich um 21:30,
          <strong>Sofort ausführen</strong>. Dann <strong>Neuer leerer Kurzbefehl</strong>.
        </li>
        <li>
          Füge die Aktion <strong>Health-Beispiele suchen</strong> hinzu: Typ
          <strong>Schlafanalyse</strong>, Startdatum <strong>in den letzten 1 Tagen</strong>, Wert
          ist <strong>Schlafend</strong>. Danach <strong>Statistiken berechnen</strong> →
          <strong>Summe</strong>. Das ist dein Schlaf.
        </li>
        <li>
          Genauso für <strong>Schritte</strong> und <strong>Aktive Energie</strong> (Startdatum
          <strong>heute</strong>, <strong>Summe</strong>) sowie
          <strong>Ruheherzfrequenz</strong> und
          <strong>Herzfrequenzvariabilität</strong> (<strong>heute</strong>,
          <strong>Durchschnitt</strong>). Was deine Uhr nicht misst, lässt du einfach weg.
        </li>
        <li>
          Zum Schluss <strong>Inhalte von URL abrufen</strong>: die Adresse von oben, Methode
          <strong>POST</strong>, Header <span class="mono">X-Health-Key</span> mit deinem Schlüssel,
          Hauptteil <strong>JSON</strong> mit den Feldern <span class="mono">sleep</span>,
          <span class="mono">steps</span>, <span class="mono">activeEnergyKcal</span>,
          <span class="mono">restingHeartRate</span> und <span class="mono">hrv</span> – jeweils das
          passende Ergebnis von oben.
        </li>
        <li>
          Tipp einmal auf ▶ zum Testen. Hat es geklappt, steht der Tag hier in der Tabelle. Sonst
          zeigt der Kurzbefehl eine Meldung, welcher Wert nicht passt.
        </li>
      </ol>
      <p class="hint">
        Die Werte dürfen als Zahl oder Text kommen, mit Komma oder Punkt; Schlaf auch als Dauer wie
        „7 Std. 30 Min.“. Ein weiterer Upload am selben Tag ergänzt die Werte.
      </p>
    </div>

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

.label {
  margin: 10px 0 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lilac);
}

.code {
  margin: 0 0 8px;
  padding: 8px;
  overflow-wrap: anywhere;
  background: var(--color-panel-raised);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.mono {
  font-family: var(--font-mono);
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
  margin: 0 0 12px;
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

.guide ol {
  margin: 0 0 10px;
  padding-left: 20px;
  font-size: 0.9rem;
}

.guide li {
  margin-bottom: 8px;
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
  .days th:nth-child(4),
  .days td:nth-child(4) {
    display: none;
  }
}
</style>

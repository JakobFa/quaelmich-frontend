<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  getAiMode,
  listAiConnections,
  mcpUrl,
  revokeAiConnection,
  setAiMode,
  type AiConnection,
} from '../api'

/**
 * KI-Modus: Nur wenn er an ist, kann man eine eigene KI-App (z. B. Claude) verbinden. Dann gibt es die Adresse für den
 * Konnektor und die Liste der KI-Apps, die auf das Konto zugreifen dürfen. Ausschalten beendet alle Zugänge sofort.
 */
const enabled = ref(false)
const connections = ref<AiConnection[]>([])
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const copied = ref(false)

const scopeLabels: Record<string, string> = {
  'plan:read': 'liest Trainingsplan',
  'plan:write': 'darf Plan und Profil ändern',
}

function describeScope(scope: string) {
  return scope
    .split(' ')
    .map((part) => scopeLabels[part] ?? part)
    .join(', ')
}

function formatDay(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : 'noch nie'
}

async function load() {
  try {
    enabled.value = (await getAiMode()).enabled
    connections.value = enabled.value ? await listAiConnections() : []
  } catch {
    error.value = 'Die Liste konnte nicht geladen werden.'
  } finally {
    loaded.value = true
  }
}

onMounted(load)

async function toggle() {
  busy.value = true
  error.value = ''
  try {
    enabled.value = (await setAiMode(!enabled.value)).enabled
    connections.value = enabled.value ? await listAiConnections() : []
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    busy.value = false
  }
}

async function end(connection: AiConnection) {
  busy.value = true
  error.value = ''
  try {
    await revokeAiConnection(connection.id)
    connections.value = connections.value.filter((entry) => entry.id !== connection.id)
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    busy.value = false
  }
}

/** Ein allgemeiner Start-Auftrag für jede KI-App, auch wenn sie keine fertigen Prompts des Konnektors anzeigt */
const setupPrompt = `Ich habe dich mit quaelmich verbunden, meinem Trainingsplan für Radfahrer. Ruf zuerst get_overview auf und erkläre mir kurz, was du in quaelmich lesen und ändern kannst (Plan, Profil, sportliches Ziel, Krankheit, Pause, eigene Workouts). Dann frag mich, was ich als Erstes möchte.

So gehst du vor:
- Ruf vor jeder Änderung get_plan noch einmal auf, denn die planId einer Einheit wechselt, wenn der Plan neu gerechnet wird.
- Sag mir vorher, was du ändern willst, und ändere nur, was ich möchte.
- quaelmich zeigt dir keine gefahrenen Fahrten und keine Strava-Daten. Brauchst du sie, frag mich oder nutze meinen Strava-Konnektor.
- Solange der KI-Modus an ist, ändert quaelmich den Plan nicht mehr von selbst. Neue Wochen und Anpassungen planst du (zum Beispiel mit regenerate_plan).
- Erfinde nichts, was nicht in den Ergebnissen steht.`

const promptCopied = ref(false)

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(setupPrompt)
    promptCopied.value = true
  } catch {
    error.value = 'Kopieren geht hier nicht.'
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(mcpUrl())
    copied.value = true
  } catch {
    error.value = 'Kopieren geht hier nicht. Markiere die Adresse und kopiere sie von Hand.'
  }
}
</script>

<template>
  <section class="panel ai" aria-labelledby="ai-title">
    <h2 id="ai-title" class="panel-title">KI-Modus</h2>
    <p class="hint">
      Mit dem KI-Modus kannst du deine eigene KI, zum Beispiel Claude, mit quaelmich verbinden. Sie
      liest deinen Plan, erklärt dir, warum er so aussieht, und kann ihn auf Wunsch ändern, bis hin
      zu deinem sportlichen Ziel. Das läuft über dein eigenes Konto bei der KI, quaelmich hat keine
      eigene KI. Standardmäßig ist der KI-Modus aus.
    </p>
    <div class="actions">
      <button
        type="button"
        class="button"
        :class="{ 'button-ghost': enabled }"
        :disabled="busy || !loaded"
        data-test="ai-mode-toggle"
        @click="toggle"
      >
        {{ enabled ? 'KI-Modus ausschalten' : 'KI-Modus einschalten' }}
      </button>
    </div>
    <p v-if="enabled" class="hint" data-test="ai-mode-on">
      Der KI-Modus ist an. Ausschalten beendet alle verbundenen KI-Apps sofort.
    </p>
    <p v-if="enabled" class="hint" data-test="ai-mode-frozen">
      Solange er an ist, ändert quaelmich deinen Plan nicht mehr von selbst: Er passt sich nicht an
      deine Fahrten an, wird nicht jede Woche neu gerechnet und wächst bei einem Ziel ohne Event
      nicht mit. Was du selbst in der App änderst, und was deine KI ändert, gilt weiter.
    </p>

    <template v-if="enabled">
      <p class="hint">
        In Claude fügst du unter "Konnektoren" einen eigenen Konnektor hinzu und trägst diese
        Adresse ein:
      </p>
      <p class="url" data-test="mcp-url">{{ mcpUrl() }}</p>
      <div class="actions">
        <button type="button" class="button button-ghost" @click="copy">
          {{ copied ? 'Kopiert' : 'Adresse kopieren' }}
        </button>
      </div>
      <p class="hint">
        Beim Verbinden fragt quaelmich dich, ob du den Zugriff erlaubst. Die KI sieht nur deinen
        Plan, dein Profil und die Workout-Bibliothek, keine gefahrenen Fahrten, keine Strava-Daten
        und keine Freitexte. Änderungen bestätigst du in deiner KI-App, bevor sie gemacht werden.
      </p>
      <p class="hint" data-test="ai-rides-hint">
        Deine gefahrenen Fahrten sieht die KI hier nicht. Wenn sie sie braucht, gibst du sie ihr
        selbst, zum Beispiel über den Strava-Konnektor in Claude.
      </p>

      <p class="hint">
        Zum Start kannst du deiner KI diesen Auftrag geben. Er erklärt ihr, wie sie mit quaelmich
        arbeiten soll:
      </p>
      <div class="actions">
        <button
          type="button"
          class="button button-ghost"
          data-test="copy-setup-prompt"
          @click="copyPrompt"
        >
          {{ promptCopied ? 'Kopiert' : 'Start-Auftrag kopieren' }}
        </button>
      </div>

      <h3 v-if="connections.length" class="sub">Verbundene KI-Apps</h3>
      <ul v-if="connections.length" class="list" data-test="connections">
        <li v-for="connection in connections" :key="connection.id">
          <span class="name">{{ connection.clientName }}</span>
          <span class="meta">
            {{ describeScope(connection.scope) }} · verbunden am
            {{ formatDay(connection.createdAt) }} · zuletzt benutzt:
            {{ formatDay(connection.lastUsedAt) }}
          </span>
          <button type="button" class="link" :disabled="busy" @click="end(connection)">
            Beenden
          </button>
        </li>
      </ul>
      <p v-else-if="loaded" class="hint">Noch keine KI-App verbunden.</p>
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

.url {
  margin: 0 0 10px;
  padding: 8px;
  overflow-wrap: anywhere;
  background: var(--color-panel-raised);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.actions {
  margin-bottom: 10px;
}

.sub {
  margin: 14px 0 6px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lilac);
}

.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: grid;
  gap: 2px;
}

.name {
  font-weight: 700;
}

.meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.link {
  justify-self: start;
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
</style>

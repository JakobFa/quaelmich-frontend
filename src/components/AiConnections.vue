<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listAiConnections, mcpUrl, revokeAiConnection, type AiConnection } from '../api'

/**
 * KI-Zugang: Adresse für den Konnektor (z. B. in Claude) und die KI-Apps, die schon auf das Konto zugreifen dürfen.
 */
const connections = ref<AiConnection[]>([])
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const copied = ref(false)

const scopeLabels: Record<string, string> = {
  'plan:read': 'liest Plan, Fahrten und Diagnose',
  'plan:write': 'darf den Plan ändern',
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
    connections.value = await listAiConnections()
  } catch {
    error.value = 'Die Liste konnte nicht geladen werden.'
  } finally {
    loaded.value = true
  }
}

onMounted(load)

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
    <h2 id="ai-title" class="panel-title">KI-Zugang</h2>
    <p class="hint">
      Verbinde Claude mit quaelmich, dann kann es deinen Plan lesen und dir erklären, warum er so aussieht. Das läuft
      über dein eigenes Claude-Konto. In Claude fügst du unter "Konnektoren" einen eigenen Konnektor hinzu und trägst
      diese Adresse ein:
    </p>
    <p class="url" data-test="mcp-url">{{ mcpUrl() }}</p>
    <div class="actions">
      <button type="button" class="button button-ghost" @click="copy">
        {{ copied ? 'Kopiert' : 'Adresse kopieren' }}
      </button>
    </div>
    <p class="hint">
      Beim Verbinden fragt quaelmich dich, ob du den Zugriff erlaubst. Die KI sieht nur Zahlen, Daten und Titel, keine
      Freitexte und keine Strava-Links.
    </p>

    <h3 v-if="connections.length" class="sub">Verbundene KI-Apps</h3>
    <ul v-if="connections.length" class="list" data-test="connections">
      <li v-for="connection in connections" :key="connection.id">
        <span class="name">{{ connection.clientName }}</span>
        <span class="meta">
          {{ describeScope(connection.scope) }} · verbunden am {{ formatDay(connection.createdAt) }} · zuletzt
          benutzt: {{ formatDay(connection.lastUsedAt) }}
        </span>
        <button type="button" class="link" :disabled="busy" @click="end(connection)">Beenden</button>
      </li>
    </ul>
    <p v-else-if="loaded" class="hint">Noch keine KI-App verbunden.</p>

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

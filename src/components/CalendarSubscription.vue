<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  calendarFeedUrl,
  endCalendarSubscription,
  getCalendarSubscription,
  renewCalendarSubscription,
} from '../api'

/**
 * Kalender-Abo: Der geheime Link liefert den Plan als iCal. Kalender-Apps holen ihn regelmäßig neu, Änderungen am
 * Plan kommen so von selbst an (je nach App nach Minuten bis einem Tag).
 */
const token = ref<string | null>(null)
const loaded = ref(false)
const busy = ref(false)
const error = ref('')
const copied = ref(false)

onMounted(async () => {
  try {
    token.value = (await getCalendarSubscription()).token
  } catch {
    error.value = 'Der Kalender-Link konnte nicht geladen werden.'
  } finally {
    loaded.value = true
  }
})

async function renew() {
  busy.value = true
  error.value = ''
  try {
    token.value = (await renewCalendarSubscription()).token
    copied.value = false
  } catch {
    error.value = 'Das hat nicht geklappt. Hast du schon einen Plan?'
  } finally {
    busy.value = false
  }
}

async function end() {
  busy.value = true
  error.value = ''
  try {
    await endCalendarSubscription()
    token.value = null
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    busy.value = false
  }
}

async function copy() {
  if (!token.value) return
  try {
    await navigator.clipboard.writeText(calendarFeedUrl(token.value))
    copied.value = true
  } catch {
    error.value = 'Kopieren geht hier nicht – markiere den Link und kopiere ihn von Hand.'
  }
}
</script>

<template>
  <section class="panel calendar" aria-labelledby="calendar-title">
    <h2 id="calendar-title" class="panel-title">Kalender</h2>
    <p class="hint">
      Abonniere deinen Plan in Apple Kalender, Google Kalender oder Outlook. Änderungen kommen von
      selbst an – je nach App nach einigen Minuten bis zu einem Tag. Die Einheiten stehen als
      ganztägige Einträge im Kalender; Ausfälle (krank, Pause) verschwinden.
    </p>

    <template v-if="loaded && token">
      <p class="url" data-test="feed-url">{{ calendarFeedUrl(token) }}</p>
      <div class="actions">
        <a class="button" :href="calendarFeedUrl(token, 'webcal')">In Kalender-App öffnen</a>
        <button type="button" class="button button-ghost" @click="copy">
          {{ copied ? 'Kopiert ✓' : 'Link kopieren' }}
        </button>
      </div>
      <p class="hint">
        Der Link ist geheim: Wer ihn hat, sieht deinen Plan. Ist er in falsche Hände geraten, erzeuge
        einen neuen – der alte hört dann auf zu funktionieren.
      </p>
      <div class="actions">
        <button type="button" class="link" :disabled="busy" @click="renew">Neuen Link erzeugen</button>
        <button type="button" class="link" :disabled="busy" @click="end">Abo beenden</button>
      </div>
    </template>
    <button v-else-if="loaded" type="button" class="button" :disabled="busy" @click="renew">
      Kalender-Link erstellen
    </button>

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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 10px;
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
</style>

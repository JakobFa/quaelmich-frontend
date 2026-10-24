<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { ApiError, deleteMoreEvent, getMoreEvents, saveMoreEvent } from '../api'
import { eventTypeLabels } from '../types/athlete'
import type { MoreEvent } from '../types/plan'

/** Weitere, gleich wichtige Events – der Plan arbeitet der Reihe nach auf alle hin */
const props = defineProps<{ firstEventDate: string }>()

const events = ref<MoreEvent[]>([])
const formOpen = ref(false)
const draft = ref<MoreEvent>(emptyEvent())
const saving = ref(false)
const error = ref('')
const message = ref('')
const today = new Date().toISOString().slice(0, 10)

function emptyEvent(): MoreEvent {
  return { name: '', date: '', distanceKm: null, elevationMeters: null, type: null }
}

onMounted(async () => {
  try {
    events.value = await getMoreEvents()
  } catch {
    events.value = []
  }
})

async function add() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const saved = await saveMoreEvent(null, draft.value)
    events.value = [...events.value, saved].sort((a, b) => a.date.localeCompare(b.date))
    draft.value = emptyEvent()
    formOpen.value = false
    message.value = '✓ Event eingetragen – der Plan ist ab heute angepasst.'
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 409
        ? 'An dem Tag gibt es schon ein Event.'
        : 'Speichern hat nicht geklappt – prüf Datum (ab heute), Distanz und Höhenmeter.'
  } finally {
    saving.value = false
  }
}

async function remove(event: MoreEvent) {
  if (!window.confirm(`„${event.name}“ aus dem Kalender nehmen? Der Plan wird ab heute angepasst.`))
    return
  try {
    await deleteMoreEvent(event.id!)
    events.value = events.value.filter((e) => e.id !== event.id)
    message.value = '✓ Event entfernt – der Plan ist ab heute angepasst.'
  } catch {
    error.value = 'Entfernen hat nicht geklappt.'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="panel more-events">
    <h2 class="panel-title">Weitere Events</h2>
    <p class="hint">
      Alle Events sind gleich wichtig: Der Plan arbeitet der Reihe nach auf jedes hin – mit Tapering
      davor und ein paar lockeren Tagen danach.
    </p>

    <ul v-if="events.length" class="list">
      <li v-for="event in events" :key="event.id">
        <div>
          <strong>🏁 {{ event.name }}</strong>
          <span class="facts">
            {{ formatDate(event.date) }} · {{ event.distanceKm }} km ·
            {{ event.elevationMeters }} Hm
            <template v-if="event.type"> · {{ eventTypeLabels[event.type] }}</template>
          </span>
        </div>
        <button type="button" class="link" @click="remove(event)">Entfernen</button>
      </li>
    </ul>

    <p v-if="message" class="ok" role="status">{{ message }}</p>

    <form v-if="formOpen" class="form" @submit.prevent="add">
      <label class="field wide">
        <span>Name</span>
        <input
          v-model="draft.name"
          type="text"
          maxlength="80"
          placeholder="z. B. Rund um Köln"
          required
        />
      </label>
      <label class="field">
        <span>Datum</span>
        <input v-model="draft.date" type="date" :min="today" required />
      </label>
      <label class="field">
        <span>Distanz (km)</span>
        <input v-model.number="draft.distanceKm" type="number" min="1" required />
      </label>
      <label class="field">
        <span>Höhenmeter</span>
        <input v-model.number="draft.elevationMeters" type="number" min="0" required />
      </label>
      <label class="field">
        <span>Art (optional)</span>
        <select v-model="draft.type">
          <option :value="null">weiß nicht / egal</option>
          <option v-for="(label, type) in eventTypeLabels" :key="type" :value="type">
            {{ label }}
          </option>
        </select>
      </label>
      <p v-if="draft.date === props.firstEventDate" class="error">
        An dem Tag ist schon dein erstes Event.
      </p>
      <div class="actions">
        <button type="submit" class="button" :disabled="saving">
          {{ saving ? 'Passe Plan an …' : 'Event eintragen' }}
        </button>
        <button type="button" class="link" @click="formOpen = false">Abbrechen</button>
      </div>
    </form>
    <button
      v-else
      type="button"
      class="button button-ghost"
      @click="((formOpen = true), (message = ''))"
    >
      ＋ Event hinzufügen
    </button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.list {
  display: grid;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 8px 10px;
  border-left: 4px solid var(--color-lilac);
  background: var(--color-ink);
}

.list strong {
  display: block;
}

.facts {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}

.field {
  display: grid;
  gap: 4px;
}

.field.wide {
  grid-column: 1 / -1;
}

.field span {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
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

.ok {
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-lilac);
}

.error {
  grid-column: 1 / -1;
  margin: 8px 0 0;
  color: var(--color-hot);
}
</style>

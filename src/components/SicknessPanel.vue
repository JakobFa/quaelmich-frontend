<script setup lang="ts">
import { computed, ref } from 'vue'

import { endSickness, startSickness } from '../api'
import type { TrainingPlan } from '../types/plan'

/**
 * Krank-Knopf in beide Richtungen: "Ich bin krank" hält den Plan an, bis man "wieder gesund" sagt (auch
 * rückwirkend, wenn man die App erst später geöffnet hat). Oder man trägt eine vorbeigegangene Krankheit nach.
 */
const props = defineProps<{ plan: TrainingPlan; today: string }>()
const emit = defineEmits<{ updated: [plan: TrainingPlan] }>()

type Mode = 'now' | 'past'

const open = ref(false)
const mode = ref<Mode>('now')
const sickFrom = ref(props.today)
const pastFrom = ref(props.today)
const pastTo = ref(props.today)
const healthyFrom = ref(props.today)
const earlierOpen = ref(false)
const busy = ref(false)
const error = ref('')

const sickSince = computed(() => props.plan.sickSince ?? null)

/**
 * Erste Fahrt (zugeordnet, abgehakt oder zusätzlich) seit Krankheitsbeginn: ein Zeichen, dass man wieder fit ist
 * und nur vergessen hat, "wieder gesund" zu drücken.
 */
const firstRide = computed(() => {
  const since = sickSince.value
  if (!since) return null
  const dates = [
    ...props.plan.workouts
      .filter((planned) => planned.actual || planned.completed)
      .map((planned) => planned.date),
    ...(props.plan.extraRides ?? []).map((ride) => ride.date),
  ].filter((date) => date >= since && date <= props.today)
  return dates.sort()[0] ?? null
})

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

async function run(action: () => Promise<TrainingPlan>, failure: string) {
  busy.value = true
  error.value = ''
  try {
    emit('updated', await action())
    open.value = false
    earlierOpen.value = false
  } catch {
    error.value = failure
  } finally {
    busy.value = false
  }
}

function submit() {
  if (mode.value === 'now') {
    return run(
      () => startSickness(sickFrom.value),
      'Das geht nicht: Der Beginn darf nicht in der Zukunft und höchstens 8 Wochen zurück liegen.',
    )
  }
  return run(
    () => startSickness(pastFrom.value, pastTo.value),
    'Das geht nicht: Bitte prüfe den Zeitraum (Beginn vor Ende, höchstens 8 Wochen zurück).',
  )
}

function recovered() {
  return recoveredSince(earlierOpen.value ? healthyFrom.value : undefined)
}

function recoveredSince(since?: string) {
  return run(() => endSickness(since), 'Das hat nicht geklappt. Bitte versuch es nochmal.')
}

const canSubmit = computed(() =>
  mode.value === 'now' ? !!sickFrom.value : !!pastFrom.value && !!pastTo.value && pastFrom.value <= pastTo.value,
)
</script>

<template>
  <div v-if="sickSince" class="panel sick" role="status">
    <p class="title">🤒 Krank seit {{ formatDay(sickSince) }} – dein Plan ist angehalten</p>
    <p class="hint">
      Alles ab diesem Tag ist ausgesetzt, auch die kommenden Wochen. Wenn du wieder fit bist, geht es
      sanft weiter – nach über einer Woche mit einer lockeren Einstiegswoche.
    </p>
    <div v-if="firstRide" class="ride-hint" role="note" data-test="ride-hint">
      <p>
        🚴 Du bist am {{ formatDay(firstRide) }} gefahren – bist du wieder gesund? Dann gilt dein Plan
        ab diesem Tag wieder.
      </p>
      <button type="button" class="button" :disabled="busy" @click="recoveredSince(firstRide)">
        Ja, gesund seit {{ formatDay(firstRide) }}
      </button>
    </div>
    <div class="actions">
      <button type="button" class="button" :disabled="busy" @click="recovered">
        Wieder gesund – Plan fortsetzen
      </button>
      <button
        v-if="!earlierOpen"
        type="button"
        class="link"
        :disabled="busy"
        @click="earlierOpen = true"
      >
        Schon früher gesund?
      </button>
    </div>
    <div v-if="earlierOpen" class="earlier">
      <label>
        Gesund seit
        <input v-model="healthyFrom" type="date" :min="sickSince" :max="today" />
      </label>
      <p class="hint">Ab diesem Tag gilt der Plan wieder; die Tage davor bleiben als krank markiert.</p>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>

  <div v-else-if="open" class="panel sick-form">
    <p class="title">Krank melden</p>
    <div class="modes" role="radiogroup" aria-label="Krankheit">
      <label>
        <input v-model="mode" type="radio" value="now" />
        Ich bin krank – Plan anhalten, bis ich wieder gesund bin
      </label>
      <label>
        <input v-model="mode" type="radio" value="past" />
        Ich war krank – ist schon vorbei (nachtragen)
      </label>
    </div>

    <div v-if="mode === 'now'" class="dates">
      <label>
        Krank seit
        <input v-model="sickFrom" type="date" :max="today" />
      </label>
    </div>
    <div v-else class="dates">
      <label>
        Von
        <input v-model="pastFrom" type="date" :max="today" />
      </label>
      <label>
        Bis
        <input v-model="pastTo" type="date" :min="pastFrom" :max="today" />
      </label>
    </div>
    <p class="hint">
      Du hast die App erst nach Krankheitsbeginn geöffnet? Wähle einfach den Tag, an dem es losging.
      Einheiten in dieser Zeit entfallen, gefahrene Einheiten bleiben.
    </p>

    <div class="actions">
      <button type="button" class="button" :disabled="busy || !canSubmit" @click="submit">
        Eintragen
      </button>
      <button type="button" class="button button-ghost" @click="open = false">Abbrechen</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>

  <button v-else type="button" class="open-link" @click="open = true">🤒 Krank melden</button>
</template>

<style scoped>
.title {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-lilac);
}

.hint {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.modes {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.modes label {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.9rem;
}

.dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.dates label,
.earlier label {
  display: grid;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.earlier {
  margin-top: 12px;
}

.ride-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--color-hot);
  background: var(--color-panel-raised);
}

.ride-hint p {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.link,
.open-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.link:hover,
.open-link:hover {
  color: var(--color-lilac);
}

.error {
  margin: 8px 0 0;
  color: var(--color-hot);
}
</style>

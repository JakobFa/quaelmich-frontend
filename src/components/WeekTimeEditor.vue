<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { generatePlan, getMyAthlete, saveMyAthlete, setWeekAvailability } from '../api'
import { toIsoDate } from '../plan/weeks'
import {
  weekdayLabels,
  type Athlete,
  type Weekday,
  type WeeklyAvailability,
} from '../types/athlete'
import type { TrainingPlan } from '../types/plan'

/** Zeit für eine Woche ändern: nur diese Woche oder dauerhaft (wie im Profil) */
const props = defineProps<{
  monday: string
  today: string
  override: WeeklyAvailability | null
}>()
const emit = defineEmits<{ saved: [plan: TrainingPlan, message: string]; close: [] }>()

const athlete = ref<Athlete | null>(null)
const draft = ref<WeeklyAvailability | null>(null)
const saving = ref(false)
const failed = ref(false)

onMounted(async () => {
  try {
    athlete.value = await getMyAthlete()
    if (athlete.value) draft.value = { ...(props.override ?? athlete.value.availability) }
  } catch {
    failed.value = true
  }
})

const days = computed(() =>
  (Object.keys(weekdayLabels) as Weekday[]).map((day, index) => {
    const date = new Date(props.monday)
    date.setDate(date.getDate() + index)
    const iso = toIsoDate(date)
    return {
      day,
      label: weekdayLabels[day],
      date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      past: iso < props.today,
    }
  }),
)

const total = computed(() =>
  draft.value ? Object.values(draft.value).reduce((sum, hours) => sum + (hours || 0), 0) : 0,
)
const normalTotal = computed(() =>
  athlete.value ? Object.values(athlete.value.availability).reduce((sum, h) => sum + h, 0) : 0,
)

async function save(mode: 'week' | 'always' | 'reset') {
  if (!athlete.value || !draft.value) return
  saving.value = true
  failed.value = false
  try {
    let plan: TrainingPlan
    if (mode === 'week') {
      plan = await setWeekAvailability(props.monday, draft.value)
      emit('saved', plan, '✓ Diese Woche neu verteilt – deine normale Zeit bleibt.')
    } else if (mode === 'reset') {
      plan = await setWeekAvailability(props.monday, null)
      emit('saved', plan, '✓ Diese Woche wieder mit deiner normalen Zeit.')
    } else {
      // eine Ausnahme für diese Woche würde die neue normale Zeit verdecken
      if (props.override) await setWeekAvailability(props.monday, null)
      await saveMyAthlete({ ...athlete.value, availability: draft.value })
      plan = await generatePlan()
      emit('saved', plan, '✓ Neue Zeit gespeichert – der Plan ist ab heute angepasst.')
    }
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}

function format(hours: number) {
  return hours.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="panel week-time">
    <p class="title">Zeit für diese Woche</p>
    <p v-if="!draft && !failed" class="hint">Lädt …</p>
    <form v-if="draft" @submit.prevent="save('week')">
      <ul class="days">
        <li v-for="day in days" :key="day.day" :class="{ past: day.past }">
          <label :for="`week-${day.day}`">
            <span class="label">{{ day.label }}</span>
            <span class="date">{{ day.date }}</span>
          </label>
          <input
            :id="`week-${day.day}`"
            v-model.number="draft[day.day]"
            type="number"
            min="0"
            max="12"
            step="0.25"
            :disabled="day.past"
            required
          />
        </li>
      </ul>
      <p class="hint">
        Stunden pro Tag · {{ format(total) }} h diese Woche (normal {{ format(normalTotal) }} h).
        Erledigtes und Rückmeldungen bleiben, vergangene Tage ändern sich nicht.
      </p>
      <div class="actions">
        <button type="submit" class="button" :disabled="saving">Nur diese Woche</button>
        <button
          type="button"
          class="button button-ghost"
          :disabled="saving"
          @click="save('always')"
        >
          Ab jetzt immer
        </button>
        <button type="button" class="link" :disabled="saving" @click="emit('close')">
          Abbrechen
        </button>
      </div>
      <button
        v-if="override"
        type="button"
        class="link reset"
        :disabled="saving"
        @click="save('reset')"
      >
        ↺ Zurück zur normalen Zeit
      </button>
    </form>
    <p v-if="failed" class="error" role="alert">
      Das hat nicht geklappt. Bitte versuch es nochmal.
    </p>
  </div>
</template>

<style scoped>
.title {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-lilac);
}

.days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}

.days li {
  display: grid;
  gap: 4px;
  text-align: center;
}

.days li.past {
  opacity: 0.4;
}

.days label {
  display: grid;
  font-family: var(--font-mono);
}

.label {
  font-weight: 700;
}

.date {
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.days input {
  width: 100%;
  min-width: 0;
  padding: 8px 2px;
  text-align: center;
}

.hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.reset {
  display: block;
  margin-top: 12px;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

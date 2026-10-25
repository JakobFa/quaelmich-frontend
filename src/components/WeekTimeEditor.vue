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

/**
 * Zeit für 7 Tage ab start ändern: in der laufenden Woche die nächsten 7 Tage ab heute (wie der Plan sie
 * zeigt), sonst Montag bis Sonntag. Gespeichert wird je Kalenderwoche – 7 Tage ab Mittwoch landen also zum
 * Teil in dieser und zum Teil in der nächsten Woche; die übrigen Tage dieser Wochen bleiben, wie sie sind.
 */
const props = defineProps<{
  start: string
  today: string
  /** schon angepasste Wochen (Schlüssel: Montag) */
  weekAvailability?: Record<string, WeeklyAvailability> | null
}>()
const emit = defineEmits<{ saved: [plan: TrainingPlan, message: string]; close: [] }>()

const WEEKDAYS = Object.keys(weekdayLabels) as Weekday[]

const athlete = ref<Athlete | null>(null)
const draft = ref<number[] | null>(null)
const saving = ref(false)
const failed = ref(false)

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function weekdayOf(iso: string): Weekday {
  return WEEKDAYS[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7]!
}

function mondayOf(iso: string): string {
  return addDays(iso, -WEEKDAYS.indexOf(weekdayOf(iso)))
}

/** Montag ab start = genau eine Kalenderwoche */
const rolling = computed(() => weekdayOf(props.start) !== 'monday')

const days = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const iso = addDays(props.start, index)
    const day = weekdayOf(iso)
    return {
      iso,
      day,
      monday: mondayOf(iso),
      label: weekdayLabels[day],
      // nur der Tag – sieben volle Daten passen auf dem Handy nicht nebeneinander
      date: `${Number(iso.slice(8, 10))}.`,
      past: iso < props.today,
    }
  }),
)

/** Zeitraum über den Tagen, z. B. "So 25.10. – Sa 31.10." */
const span = computed(() => {
  const format = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })
  const first = days.value[0]!
  const last = days.value[6]!
  return `${first.label} ${format(first.iso)} – ${last.label} ${format(last.iso)}`
})

/** betroffene Kalenderwochen (eine oder zwei) */
const mondays = computed(() => [...new Set(days.value.map((day) => day.monday))])
const overridden = computed(() =>
  mondays.value.filter((monday) => props.weekAvailability?.[monday]),
)

/** Zeit einer Woche, wie sie gerade gilt: angepasst oder normal */
function currentWeek(monday: string): WeeklyAvailability {
  return { ...(props.weekAvailability?.[monday] ?? athlete.value!.availability) }
}

onMounted(async () => {
  try {
    athlete.value = await getMyAthlete()
    if (athlete.value) draft.value = days.value.map((day) => currentWeek(day.monday)[day.day])
  } catch {
    failed.value = true
  }
})

const total = computed(() => (draft.value ?? []).reduce((sum, hours) => sum + (hours || 0), 0))
const normalTotal = computed(() =>
  athlete.value ? Object.values(athlete.value.availability).reduce((sum, h) => sum + h, 0) : 0,
)

async function save(mode: 'week' | 'always' | 'reset') {
  if (!athlete.value || !draft.value) return
  saving.value = true
  failed.value = false
  const what = rolling.value ? 'Die nächsten 7 Tage' : 'Diese Woche'
  try {
    let plan: TrainingPlan | null = null
    if (mode === 'week') {
      for (const monday of mondays.value) {
        const week = currentWeek(monday)
        days.value.forEach((day, index) => {
          if (day.monday === monday) week[day.day] = draft.value![index] ?? 0
        })
        // wie die normale Zeit? Dann ist das keine Ausnahme (und eine alte fällt weg)
        const normal = WEEKDAYS.every((day) => week[day] === athlete.value!.availability[day])
        if (!normal) plan = await setWeekAvailability(monday, week)
        else if (props.weekAvailability?.[monday]) plan = await setWeekAvailability(monday, null)
      }
      if (plan) emit('saved', plan, `✓ ${what} neu verteilt – deine normale Zeit bleibt.`)
      else emit('close') // nichts geändert
    } else if (mode === 'reset') {
      for (const monday of overridden.value) plan = await setWeekAvailability(monday, null)
      if (plan) emit('saved', plan, `✓ ${what} wieder mit deiner normalen Zeit.`)
    } else {
      // Ausnahmen für diese Tage würden die neue normale Zeit verdecken
      for (const monday of overridden.value) await setWeekAvailability(monday, null)
      const availability = { ...athlete.value.availability }
      days.value.forEach((day, index) => (availability[day.day] = draft.value![index] ?? 0))
      await saveMyAthlete({ ...athlete.value, availability })
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
    <p class="title">{{ rolling ? 'Zeit für die nächsten 7 Tage' : 'Zeit für diese Woche' }}</p>
    <p class="span">{{ span }}</p>
    <p v-if="!draft && !failed" class="hint">Lädt …</p>
    <form v-if="draft" @submit.prevent="save('week')">
      <ul class="days">
        <li v-for="(day, index) in days" :key="day.iso" :class="{ past: day.past }">
          <label :for="`week-${day.iso}`">
            <span class="label">{{ day.label }}</span>
            <span class="date">{{ day.date }}</span>
          </label>
          <input
            :id="`week-${day.iso}`"
            v-model.number="draft[index]"
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
        Stunden pro Tag · {{ format(total) }} h {{ rolling ? 'in 7 Tagen' : 'diese Woche' }} (normal
        {{ format(normalTotal) }} h). Erledigtes und Rückmeldungen bleiben, vergangene Tage ändern
        sich nicht.
      </p>
      <div class="actions">
        <button type="submit" class="button" :disabled="saving">
          {{ rolling ? 'Nur diese 7 Tage' : 'Nur diese Woche' }}
        </button>
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
        v-if="overridden.length > 0"
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
.span {
  margin: 2px 0 10px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.title {
  margin: 0;
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

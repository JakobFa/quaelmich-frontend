<script setup lang="ts">
import { computed, ref } from 'vue'

import { dismissFtpSuggestion, generatePlan, saveMyAthlete } from '../api'
import type { Athlete } from '../types/athlete'
import type { TrainingPlan } from '../types/plan'

/** "Deine FTP ist wahrscheinlich zu niedrig" – nur bei sehr sicheren Fällen (das entscheidet das Backend) */
const props = defineProps<{ athlete: Athlete; plan: TrainingPlan; today: string }>()
const emit = defineEmits<{ athlete: [athlete: Athlete]; plan: [plan: TrainingPlan] }>()

const busy = ref(false)
const failed = ref(false)

const visible = computed(
  () =>
    !!props.athlete.suggestedFtp &&
    !!props.athlete.ftp &&
    props.athlete.suggestedFtp > props.athlete.ftp &&
    props.athlete.suggestedFtp !== props.athlete.dismissedSuggestedFtp,
)

/** nächster FTP-Test im Plan, falls einer ansteht */
const nextTest = computed(() =>
  props.plan.workouts.find(
    (planned) =>
      planned.workout.type === 'FTP_TEST' && planned.date >= props.today && !planned.completed,
  ),
)

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

async function adopt() {
  busy.value = true
  failed.value = false
  try {
    const updated = await saveMyAthlete({ ...props.athlete, ftp: props.athlete.suggestedFtp! })
    emit('athlete', updated)
    emit('plan', await generatePlan()) // Wattangaben und Plan passen sich an
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}

async function dismiss() {
  busy.value = true
  try {
    emit('athlete', await dismissFtpSuggestion())
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="panel ftp-hint" role="status">
    <p class="title">💡 Deine FTP ist wahrscheinlich zu niedrig</p>
    <p>
      {{ athlete.suggestedFtpNote }} Mit {{ athlete.ftp }} W FTP ist das über diese Dauer eigentlich
      nicht möglich – geschätzt liegt sie bei mindestens
      <strong>{{ athlete.suggestedFtp }} W</strong>.
    </p>
    <p class="hint">
      <template v-if="nextTest">
        Am sichersten: der FTP-Test am {{ formatDay(nextTest.date) }} in deinem Plan.
      </template>
      <template v-else
        >Am sichersten misst das ein FTP-Test – den findest du in der Bibliothek.</template
      >
    </p>
    <div class="actions">
      <button type="button" class="button" :disabled="busy" @click="adopt">
        FTP auf {{ athlete.suggestedFtp }} W setzen
      </button>
      <RouterLink v-if="nextTest" :to="`/plan/${nextTest.id}`" class="button button-ghost">
        Zum Test
      </RouterLink>
      <RouterLink v-else to="/workouts/11" class="button button-ghost">FTP-Test ansehen</RouterLink>
      <button type="button" class="link" :disabled="busy" @click="dismiss">Ausblenden</button>
    </div>
    <p v-if="failed" class="error" role="alert">
      Das hat nicht geklappt. Bitte versuch es nochmal.
    </p>
  </div>
</template>

<style scoped>
.ftp-hint {
  border-left-color: #f4c430;
}

.title {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #f4c430;
}

p {
  margin: 0 0 8px;
}

.hint {
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
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

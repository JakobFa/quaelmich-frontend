<script setup lang="ts">
import { computed, ref } from 'vue'

import { generatePlan, saveMyAthlete } from '../api'
import type { RampTestResult } from '../plan/rampTest'
import type { Athlete } from '../types/athlete'

/** Ergebnis des Rampentests mit "FTP übernehmen" – im Player und beim geplanten Test */
const props = defineProps<{ result: RampTestResult; athlete: Athlete | null }>()
const emit = defineEmits<{ adopted: [athlete: Athlete] }>()

const saving = ref(false)
const failed = ref(false)
const adopted = ref(false)

const current = computed(() => props.athlete?.ftp ?? null)
const difference = computed(() => (current.value ? props.result.ftp - current.value : null))
const same = computed(() => current.value === props.result.ftp)

async function adopt() {
  if (!props.athlete) return
  saving.value = true
  failed.value = false
  try {
    const updated = await saveMyAthlete({ ...props.athlete, ftp: props.result.ftp })
    await generatePlan() // Wattangaben und Plan passen sich an
    adopted.value = true
    emit('adopted', updated)
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="panel ramp-result" role="status">
    <p class="title">Dein Rampentest</p>
    <p class="numbers">
      Beste Minute <strong>{{ result.bestMinuteWatts }} W</strong> · davon 75 % =
      <strong class="ftp">{{ result.ftp }} W FTP</strong>
    </p>
    <p v-if="difference !== null && !same" class="change">
      Bisher {{ current }} W –
      {{ difference > 0 ? `${difference} W mehr 💪` : `${-difference} W weniger` }}
    </p>
    <p v-else-if="same" class="change">Genau deine eingetragene FTP – passt.</p>
    <div v-if="athlete && !same && !adopted" class="actions">
      <button type="button" class="button" :disabled="saving" @click="adopt">
        FTP auf {{ result.ftp }} W setzen
      </button>
    </div>
    <p v-if="adopted" class="change">
      ✓ Übernommen – dein Plan rechnet jetzt mit {{ result.ftp }} W.
    </p>
    <p v-if="failed" class="error" role="alert">Speichern hat nicht geklappt.</p>
  </div>
</template>

<style scoped>
.ramp-result {
  border-left-color: #35b86b;
}

.title {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #35b86b;
}

p {
  margin: 0 0 8px;
}

.numbers {
  font-family: var(--font-mono);
}

.ftp {
  font-size: 1.2em;
}

.change {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.error {
  margin: 8px 0 0;
  color: var(--color-hot);
}
</style>

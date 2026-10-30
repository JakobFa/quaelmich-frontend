<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getSteadyHold } from '../api'
import { steadyHoldLabels, type SteadyHold } from '../types/plan'

/** Einschätzung einer lockeren Fahrt – lädt die Auswertung zur zugeordneten Fahrt; ohne Daten unsichtbar */
const props = defineProps<{ plannedId: number }>()

const hold = ref<SteadyHold | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    hold.value = await getSteadyHold(props.plannedId)
  } catch {
    hold.value = null // nicht schlimm – dann eben ohne Auswertung
  } finally {
    loading.value = false
  }
})

const unit = computed(() => (hold.value?.basis === 'HEART_RATE' ? 'bpm' : 'W'))
const toneClass = computed(() => {
  switch (hold.value?.hold) {
    case 'STEADY':
      return 'good'
    case 'A_BIT_HARD':
    case 'VERY_EASY':
      return 'warn'
    case 'TOO_HARD':
      return 'off'
    default:
      return ''
  }
})
</script>

<template>
  <p v-if="loading" class="loading">Wertet die Fahrt aus …</p>
  <div v-else-if="hold" class="hold">
    <p class="title" :class="toneClass">{{ steadyHoldLabels[hold.hold] }}</p>
    <p class="summary">
      Ø {{ hold.average }} {{ unit }} · Ziel {{ hold.targetLow }}–{{ hold.targetHigh }} {{ unit }}
      <template v-if="hold.basis === 'HEART_RATE'"> · nach Puls</template>
    </p>
    <div class="bar" aria-hidden="true">
      <span class="below" :style="{ width: `${hold.percentBelow}%` }"></span>
      <span class="inzone" :style="{ width: `${hold.percentInZone}%` }"></span>
      <span class="above" :style="{ width: `${hold.percentAbove}%` }"></span>
    </div>
    <p class="legend">
      <span><i class="dot below"></i> {{ hold.percentBelow }} % darunter</span>
      <span><i class="dot inzone"></i> {{ hold.percentInZone }} % im Zielbereich</span>
      <span><i class="dot above"></i> {{ hold.percentAbove }} % darüber</span>
    </p>
    <p class="tip">{{ hold.tip }}</p>
    <p class="note">
      Richtwert: quaelmich vergleicht deine {{ unit === 'bpm' ? 'Pulswerte' : 'Wattwerte' }} mit dem
      Zielbereich der Einheit.
    </p>
  </div>
</template>

<style scoped>
.loading {
  margin: 16px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.hold {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.title {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.title.good {
  color: #35b86b;
}

.title.warn {
  color: #f4c430;
}

.title.off {
  color: var(--color-hot);
}

.summary {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.bar {
  display: flex;
  height: 12px;
  margin: 10px 0 6px;
  background: var(--color-ink);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
}

.below {
  background: var(--color-panel-raised);
}

.inzone {
  background: #35b86b;
}

.above {
  background: var(--color-hot);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 3px;
  vertical-align: middle;
}

.dot.below {
  background: var(--color-panel-raised);
}

.dot.inzone {
  background: #35b86b;
}

.dot.above {
  background: var(--color-hot);
}

.tip {
  margin: 10px 0 0;
}

.note {
  margin: 10px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>

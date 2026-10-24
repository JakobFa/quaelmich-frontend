<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getFormCurve, type FormCurve } from '../api'
import { formStateOf } from '../plan/form'
import FormChart from './FormChart.vue'

/** Form heute und am Eventtag, auf Wunsch mit Kurve */
const curve = ref<FormCurve | null>(null)
const open = ref(false)

onMounted(load)

async function load() {
  try {
    curve.value = await getFormCurve()
  } catch {
    curve.value = null // ohne Kurve geht es auch
  }
}

function sign(value: number) {
  const rounded = Math.round(value)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}
</script>

<template>
  <div v-if="curve?.today" class="panel form-panel">
    <div class="numbers">
      <div>
        <p class="label">Form heute</p>
        <p class="value">{{ sign(curve.today.form) }}</p>
        <p class="state">{{ formStateOf(curve.today.form).label }}</p>
      </div>
      <div v-if="curve.eventForm !== null">
        <p class="label">Am Eventtag (geplant)</p>
        <p class="value">{{ sign(curve.eventForm) }}</p>
        <p class="state">{{ formStateOf(curve.eventForm).label }}</p>
      </div>
      <div>
        <p class="label">Fitness</p>
        <p class="value">{{ Math.round(curve.today.fitness) }}</p>
        <p class="state">Ermüdung {{ Math.round(curve.today.fatigue) }}</p>
      </div>
    </div>
    <p class="hint">{{ formStateOf(curve.today.form).hint }}</p>
    <button type="button" class="link" :aria-expanded="open" @click="open = !open">
      {{ open ? '▾ Form-Kurve ausblenden' : '▸ Form-Kurve anzeigen' }}
    </button>
    <FormChart v-if="open" :curve="curve" class="chart" />
    <p v-if="open" class="explain">
      <strong>Fitness</strong> wächst langsam mit dem Training der letzten ~6 Wochen,
      <strong>Ermüdung</strong> schnell mit der letzten Woche. <strong>Form</strong> ist der
      Unterschied: negativ im Aufbau, positiv nach Erholung – ideal sind zum Event etwa +5 bis +15.
    </p>
  </div>
</template>

<style scoped>
.form-panel {
  margin-bottom: 24px;
}

.numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
}

.label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.value {
  margin: 2px 0 0;
  font-family: var(--font-heading);
  font-size: 2rem;
  line-height: 1;
}

.state {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.hint {
  margin: 12px 0 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  cursor: pointer;
}

.chart {
  margin-top: 12px;
}

.explain {
  margin: 10px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.explain strong {
  color: var(--color-text);
}
</style>

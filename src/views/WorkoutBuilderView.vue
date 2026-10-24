<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError, deleteMyWorkout, getWorkout, saveMyWorkout } from '../api'
import LoadingNotice from '../components/LoadingNotice.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { formatDuration } from '../plan/weeks'
import { powerZoneFor } from '../plan/zones'
import {
  stepKindLabels,
  stepTss,
  suggestWorkoutType,
  workoutTypeLabels,
  type StepKind,
  type WorkoutStep,
  type WorkoutType,
} from '../types/workout'

/** Eigenes Workout bauen (/workouts/neu) oder ändern (/workouts/:id/bearbeiten) */
const route = useRoute()
const router = useRouter()
const editId = route.params.id ? Number(route.params.id) : null

/** Ein Abschnitt im Formular: Dauer als Minuten + Sekunden, Rampe optional */
type DraftStep = {
  kind: StepKind
  minutes: number
  seconds: number
  start: number
  end: number
  ramp: boolean
}

const title = ref('')
const description = ref('')
const type = ref<WorkoutType>('THRESHOLD')
/** Art automatisch vorschlagen, bis man sie selbst wählt */
const typeTouched = ref(false)
const steps = ref<DraftStep[]>([
  { kind: 'WARMUP', minutes: 10, seconds: 0, start: 50, end: 75, ramp: true },
  { kind: 'INTERVAL', minutes: 10, seconds: 0, start: 95, end: 95, ramp: false },
  { kind: 'COOLDOWN', minutes: 10, seconds: 0, start: 60, end: 45, ramp: true },
])
const loading = ref(editId !== null)
const saving = ref(false)
const error = ref('')

const kinds = Object.keys(stepKindLabels) as StepKind[]
const types = (Object.keys(workoutTypeLabels) as WorkoutType[]).filter((t) => t !== 'FTP_TEST')

function toStep(step: DraftStep): WorkoutStep {
  return {
    kind: step.kind,
    durationSeconds: (Number(step.minutes) || 0) * 60 + (Number(step.seconds) || 0),
    powerStartPercent: Number(step.start) || 0,
    powerEndPercent: step.ramp ? Number(step.end) || 0 : Number(step.start) || 0,
  }
}

const builtSteps = computed(() => steps.value.map(toStep))
const totalSeconds = computed(() => builtSteps.value.reduce((s, st) => s + st.durationSeconds, 0))
const totalTss = computed(() =>
  Math.round(builtSteps.value.reduce((sum, step) => sum + stepTss(step), 0)),
)

watch(builtSteps, (current) => {
  if (!typeTouched.value) type.value = suggestWorkoutType(current)
})

onMounted(async () => {
  if (editId === null) {
    type.value = suggestWorkoutType(builtSteps.value)
    return
  }
  try {
    const existing = await getWorkout(editId)
    title.value = existing.title
    description.value = existing.description
    type.value = existing.type
    typeTouched.value = true
    steps.value = existing.steps.map((step) => ({
      kind: step.kind,
      minutes: Math.floor(step.durationSeconds / 60),
      seconds: step.durationSeconds % 60,
      start: step.powerStartPercent,
      end: step.powerEndPercent,
      ramp: step.powerStartPercent !== step.powerEndPercent,
    }))
  } catch {
    error.value = 'Dieses Workout gibt es nicht (mehr).'
  } finally {
    loading.value = false
  }
})

// ---------- Abschnitte bearbeiten ----------

/** neue Abschnitte vor dem Ausfahren einfügen, falls es eins gibt */
function insertIndex() {
  const last = steps.value[steps.value.length - 1]
  return last?.kind === 'COOLDOWN' ? steps.value.length - 1 : steps.value.length
}

function addStep() {
  steps.value.splice(insertIndex(), 0, {
    kind: 'STEADY',
    minutes: 10,
    seconds: 0,
    start: 70,
    end: 70,
    ramp: false,
  })
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
}

function moveStep(index: number, by: number) {
  const target = index + by
  if (target < 0 || target >= steps.value.length) return
  const [step] = steps.value.splice(index, 1)
  steps.value.splice(target, 0, step!)
}

// Intervall-Block: n × (Belastung + Pause)
const block = ref({
  repeats: 4,
  workMinutes: 4,
  workSeconds: 0,
  workPercent: 110,
  restMinutes: 4,
  restSeconds: 0,
  restPercent: 50,
})
const blockOpen = ref(false)

function addBlock() {
  const b = block.value
  const parts: DraftStep[] = []
  for (let i = 0; i < Math.max(1, Math.min(30, Number(b.repeats) || 1)); i++) {
    parts.push({
      kind: 'INTERVAL',
      minutes: Number(b.workMinutes) || 0,
      seconds: Number(b.workSeconds) || 0,
      start: Number(b.workPercent),
      end: Number(b.workPercent),
      ramp: false,
    })
    parts.push({
      kind: 'RECOVERY',
      minutes: Number(b.restMinutes) || 0,
      seconds: Number(b.restSeconds) || 0,
      start: Number(b.restPercent),
      end: Number(b.restPercent),
      ramp: false,
    })
  }
  steps.value.splice(insertIndex(), 0, ...parts)
  blockOpen.value = false
}

// ---------- Speichern ----------

const valid = computed(
  () =>
    title.value.trim().length > 0 &&
    builtSteps.value.length > 0 &&
    builtSteps.value.every(
      (step) =>
        step.durationSeconds >= 10 &&
        step.powerStartPercent >= 30 &&
        step.powerStartPercent <= 250 &&
        step.powerEndPercent >= 30 &&
        step.powerEndPercent <= 250,
    ) &&
    totalSeconds.value <= 6 * 3600,
)

async function save() {
  if (!valid.value) return
  saving.value = true
  error.value = ''
  try {
    const saved = await saveMyWorkout(editId, {
      title: title.value.trim(),
      description: description.value.trim(),
      type: type.value,
      steps: builtSteps.value,
    })
    await router.push(`/workouts/${saved.id}`)
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 400
        ? 'Das Workout ist so nicht gültig – prüf Dauer (max. 6 h) und Prozentwerte (30–250 %).'
        : 'Speichern hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (
    editId === null ||
    !window.confirm('Dieses Workout löschen? Eingeplante Tage bleiben erhalten.')
  ) {
    return
  }
  try {
    await deleteMyWorkout(editId)
    await router.push('/workouts')
  } catch {
    error.value = 'Löschen hat nicht geklappt.'
  }
}
</script>

<template>
  <section>
    <RouterLink to="/workouts" class="back">← Zurück zur Bibliothek</RouterLink>
    <p class="kicker">// {{ editId === null ? 'Eigenes Workout bauen' : 'Workout bearbeiten' }}</p>

    <LoadingNotice v-if="loading" label="Lädt das Workout …" />

    <form v-else class="builder" @submit.prevent="save">
      <div class="panel">
        <label class="field">
          <span>Name</span>
          <input
            v-model="title"
            type="text"
            maxlength="80"
            placeholder="z. B. Hausberg 4 × 8"
            required
          />
        </label>
        <label class="field">
          <span>Beschreibung (optional)</span>
          <input
            v-model="description"
            type="text"
            maxlength="500"
            placeholder="Wofür ist es gedacht?"
          />
        </label>
        <label class="field">
          <span>Art</span>
          <select v-model="type" @change="typeTouched = true">
            <option v-for="t in types" :key="t" :value="t">{{ workoutTypeLabels[t] }}</option>
          </select>
          <small class="hint"
            >Wird aus dem härtesten Abschnitt vorgeschlagen, bis du selbst wählst.</small
          >
        </label>
      </div>

      <!-- Vorschau -->
      <div class="preview">
        <WorkoutProfile :steps="builtSteps" class="profile" />
        <p class="totals">
          <span>{{ formatDuration(Math.round(totalSeconds / 60)) }}</span>
          <span>TSS {{ totalTss }}</span>
          <span>{{ builtSteps.length }} Abschnitte</span>
        </p>
      </div>

      <!-- Abschnitte -->
      <ol class="steps">
        <li
          v-for="(step, index) in steps"
          :key="index"
          class="step"
          :style="{
            borderLeftColor: powerZoneFor(Math.max(step.start, step.ramp ? step.end : step.start))
              .color,
          }"
        >
          <div class="step-head">
            <select v-model="step.kind" :aria-label="`Art von Abschnitt ${index + 1}`">
              <option v-for="kind in kinds" :key="kind" :value="kind">
                {{ stepKindLabels[kind] }}
              </option>
            </select>
            <div class="step-actions">
              <button
                type="button"
                class="icon"
                :disabled="index === 0"
                aria-label="Nach oben"
                @click="moveStep(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="icon"
                :disabled="index === steps.length - 1"
                aria-label="Nach unten"
                @click="moveStep(index, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="icon remove"
                aria-label="Abschnitt entfernen"
                @click="removeStep(index)"
              >
                ×
              </button>
            </div>
          </div>
          <div class="step-fields">
            <label>
              <small>min</small>
              <input v-model.number="step.minutes" type="number" min="0" max="240" />
            </label>
            <label>
              <small>s</small>
              <input v-model.number="step.seconds" type="number" min="0" max="59" step="5" />
            </label>
            <label>
              <small>{{ step.ramp ? 'von %' : '% FTP' }}</small>
              <input v-model.number="step.start" type="number" min="30" max="250" />
            </label>
            <label v-if="step.ramp">
              <small>bis %</small>
              <input v-model.number="step.end" type="number" min="30" max="250" />
            </label>
            <label class="ramp">
              <input v-model="step.ramp" type="checkbox" />
              <small>Rampe</small>
            </label>
          </div>
        </li>
      </ol>

      <div class="add">
        <button type="button" class="button button-ghost" @click="addStep">+ Abschnitt</button>
        <button type="button" class="button button-ghost" @click="blockOpen = !blockOpen">
          + Intervall-Block
        </button>
      </div>

      <div v-if="blockOpen" class="panel block">
        <p class="block-title">Intervall-Block: Wiederholungen × (Belastung + Pause)</p>
        <div class="block-fields">
          <label
            ><small>×</small><input v-model.number="block.repeats" type="number" min="1" max="30"
          /></label>
          <label
            ><small>Belastung min</small
            ><input v-model.number="block.workMinutes" type="number" min="0" max="60"
          /></label>
          <label
            ><small>s</small
            ><input v-model.number="block.workSeconds" type="number" min="0" max="59" step="5"
          /></label>
          <label
            ><small>% FTP</small
            ><input v-model.number="block.workPercent" type="number" min="30" max="250"
          /></label>
          <label
            ><small>Pause min</small
            ><input v-model.number="block.restMinutes" type="number" min="0" max="60"
          /></label>
          <label
            ><small>s</small
            ><input v-model.number="block.restSeconds" type="number" min="0" max="59" step="5"
          /></label>
          <label
            ><small>% FTP</small
            ><input v-model.number="block.restPercent" type="number" min="30" max="250"
          /></label>
        </div>
        <button type="button" class="button" @click="addBlock">Block einfügen</button>
      </div>

      <p v-if="totalSeconds > 6 * 3600" class="error">Höchstens 6 Stunden.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="save">
        <button type="submit" class="button" :disabled="saving || !valid">
          {{ saving ? 'Speichert …' : 'Speichern' }}
        </button>
        <button v-if="editId !== null" type="button" class="link" @click="remove">Löschen</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
}

.builder {
  display: grid;
  gap: 16px;
}

.panel {
  margin: 0;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 4px;
}

.field > span {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.preview .profile {
  height: 96px;
}

.totals {
  display: flex;
  gap: 20px;
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-weight: 700;
}

.steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-left: 5px solid var(--color-panel-raised);
  background: var(--color-panel);
}

.step-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.step-actions {
  display: flex;
  gap: 4px;
}

.icon {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-panel-raised);
  background: var(--color-ink);
  color: var(--color-text);
  cursor: pointer;
}

.icon:disabled {
  opacity: 0.3;
  cursor: default;
}

.icon.remove:hover {
  border-color: var(--color-hot);
  color: var(--color-hot);
}

.step-fields,
.block-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.step-fields label,
.block-fields label {
  display: grid;
  gap: 2px;
}

.step-fields small,
.block-fields small {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.step-fields input[type='number'],
.block-fields input[type='number'] {
  width: 72px;
  padding-inline: 4px;
  text-align: center;
}

.step-fields .ramp {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: end;
  padding-bottom: 8px;
}

.add,
.save {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.block-title {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.85rem;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-hot);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.error {
  margin: 0;
  color: var(--color-hot);
}
</style>

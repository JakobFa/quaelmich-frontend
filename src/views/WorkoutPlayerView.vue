<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getMyAthlete, getPlannedWorkout, getWorkout, updateProgress } from '../api'
import { auth } from '../auth'
import LoadingNotice from '../components/LoadingNotice.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { formatRange, heartRateZonesOf, targetForStep } from '../plan/heartRate'
import {
  formatClock,
  nextStepStart,
  percentAt,
  positionAt,
  previousStepStart,
} from '../plan/player'
import { isHeartRateMode, type Athlete } from '../types/athlete'
import type { StepKind, Workout, WorkoutStep } from '../types/workout'

/** Abgespielt wird entweder ein Workout aus dem Plan (/plan/:id/fahren) oder aus der Bibliothek */
const route = useRoute()
const router = useRouter()
const fromPlan = route.name === 'planned-workout-player'
const id = Number(route.params.id)
const backLink = fromPlan ? `/plan/${id}` : `/workouts/${id}`

const workout = ref<Workout | null>(null)
const athlete = ref<Athlete | null>(null)
const loading = ref(true)
const failed = ref(false)

const ftp = computed(() => athlete.value?.ftp ?? null)
const heartRate = computed(() =>
  isHeartRateMode(athlete.value) ? heartRateZonesOf(athlete.value) : null,
)
const steps = computed<WorkoutStep[]>(() => workout.value?.steps ?? [])

const kindLabels: Record<StepKind, string> = {
  WARMUP: 'Aufwärmen',
  STEADY: 'Gleichmäßig',
  INTERVAL: 'Intervall',
  RECOVERY: 'Pause',
  COOLDOWN: 'Ausfahren',
}

// ---------- Zeit ----------

const elapsed = ref(0)
const running = ref(false)
let startedAt = 0
let elapsedAtStart = 0
let timer: ReturnType<typeof setInterval> | undefined

const position = computed(() => positionAt(steps.value, elapsed.value))
const current = computed(() => steps.value[position.value.index] ?? null)
const next = computed(() => steps.value[position.value.index + 1] ?? null)
const progressPercent = computed(() =>
  position.value.totalSeconds ? (elapsed.value / position.value.totalSeconds) * 100 : 0,
)
const stepPercent = computed(() =>
  current.value ? (position.value.stepElapsed / current.value.durationSeconds) * 100 : 100,
)

function tick() {
  elapsed.value = Math.min(
    elapsedAtStart + (performance.now() - startedAt) / 1000,
    position.value.totalSeconds,
  )
}

function start() {
  if (position.value.finished) return
  unlockAudio()
  startedAt = performance.now()
  elapsedAtStart = elapsed.value
  running.value = true
  timer = setInterval(tick, 200)
  keepScreenOn()
}

function pause() {
  running.value = false
  clearInterval(timer)
  releaseScreen()
  remember()
}

function toggle() {
  if (running.value) pause()
  else start()
}

/** Springen, ohne Start/Pause zu ändern */
function jumpTo(seconds: number) {
  elapsed.value = Math.max(0, Math.min(seconds, position.value.totalSeconds))
  startedAt = performance.now()
  elapsedAtStart = elapsed.value
  lastSecond = Infinity
  if (position.value.finished) finish()
  else remember()
}

function restart() {
  pause()
  jumpTo(0)
}

// ---------- Ziel im Moment ----------

const percentNow = computed(() =>
  current.value ? percentAt(current.value, position.value.stepElapsed) : 0,
)

/** Großes Ziel: Puls (im Puls-Modus), sonst Watt (mit FTP) oder % FTP */
function targetOf(step: WorkoutStep, percent: number) {
  if (heartRate.value) {
    const range = targetForStep(heartRate.value, step)
    return range
      ? { main: formatRange(range), unit: 'bpm', sub: `Zone ${range.zone}` }
      : { main: 'Vollgas', unit: '', sub: 'nach Gefühl – der Puls ist zu langsam' }
  }
  if (ftp.value) {
    return {
      main: String(Math.round((ftp.value * percent) / 100)),
      unit: 'W',
      sub: `${percent} % FTP`,
    }
  }
  return { main: String(percent), unit: '% FTP', sub: 'Ohne FTP im Profil keine Watt' }
}

const target = computed(() => (current.value ? targetOf(current.value, percentNow.value) : null))

function describeNext(step: WorkoutStep) {
  const percent =
    step.powerStartPercent === step.powerEndPercent
      ? `${step.powerStartPercent} %`
      : `${step.powerStartPercent} → ${step.powerEndPercent} %`
  const goal = targetOf(step, step.powerStartPercent)
  const detail = heartRate.value ? `${goal.main} ${goal.unit}`.trim() : percent
  return `${kindLabels[step.kind]} · ${formatClock(step.durationSeconds)} · ${detail}`
}

// ---------- Töne: 3-2-1 vor jedem Wechsel ----------

const soundOn = ref(true)
let audio: AudioContext | null = null
let lastSecond = Infinity

/** Browser erlauben Ton erst nach einem Klick – deshalb beim Start */
function unlockAudio() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    audio = null
  }
}

function beep(frequency: number, seconds: number) {
  if (!soundOn.value || !audio) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.25, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + seconds)
}

watch(
  () => Math.ceil(position.value.stepRemaining),
  (second) => {
    if (!running.value) return
    if (second < lastSecond && second >= 1 && second <= 3) beep(660, 0.12)
    lastSecond = second
  },
)

watch(
  () => position.value.index,
  (index, before) => {
    if (!running.value || index <= before) return
    beep(990, 0.4)
    lastSecond = Infinity
    if (position.value.finished) finish()
  },
)

// ---------- Bildschirm anlassen ----------

let wakeLock: WakeLockSentinel | null = null

async function keepScreenOn() {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
  } catch {
    wakeLock = null // z. B. Akku-Sparmodus – dann eben ohne
  }
}

function releaseScreen() {
  void wakeLock?.release().catch(() => undefined)
  wakeLock = null
}

/** Beim Zurückwechseln in den Tab geht die Sperre verloren – neu anfordern */
function onVisibility() {
  if (document.visibilityState === 'visible' && running.value) keepScreenOn()
}

// ---------- Vollbild ----------

const canFullscreen =
  typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
const stage = ref<HTMLElement | null>(null)

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void stage.value?.requestFullscreen().catch(() => undefined)
}

// ---------- Weitermachen nach Neuladen (nur in diesem Browser) ----------

const storageKey = `quaelmich-player-${fromPlan ? 'plan' : 'workout'}-${id}`

function remember() {
  try {
    if (elapsed.value > 0 && !position.value.finished) {
      localStorage.setItem(storageKey, String(Math.floor(elapsed.value)))
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // ohne Speicher geht es auch
  }
}

function restore() {
  try {
    const saved = Number(localStorage.getItem(storageKey))
    if (saved > 0 && saved < position.value.totalSeconds) elapsed.value = saved
  } catch {
    // ohne Speicher geht es auch
  }
}

let rememberTimer: ReturnType<typeof setInterval> | undefined

// ---------- Fertig ----------

const finished = ref(false)
const marking = ref(false)
const markError = ref(false)

function finish() {
  pause()
  finished.value = true
  setTimeout(() => beep(1320, 0.6), 450)
}

async function markDone() {
  marking.value = true
  markError.value = false
  try {
    await updateProgress(id, true, null)
    await router.push(backLink)
  } catch {
    markError.value = true
  } finally {
    marking.value = false
  }
}

function onKey(event: KeyboardEvent) {
  if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault()
    toggle()
  }
}

onMounted(async () => {
  try {
    workout.value = fromPlan ? (await getPlannedWorkout(id)).workout : await getWorkout(id)
    if (auth.isLoggedIn.value) athlete.value = await getMyAthlete()
    restore()
  } catch {
    failed.value = !workout.value
  } finally {
    loading.value = false
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('keydown', onKey)
  rememberTimer = setInterval(() => running.value && remember(), 5000)
})

onBeforeUnmount(() => {
  if (running.value) pause()
  clearInterval(rememberTimer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('keydown', onKey)
  void audio?.close().catch(() => undefined)
})
</script>

<template>
  <section ref="stage" class="stage">
    <RouterLink :to="backLink" class="back">← Beenden</RouterLink>

    <LoadingNotice v-if="loading" label="Lädt das Workout …" />

    <div v-else-if="failed || !workout" class="panel" role="alert">
      <p class="error">Dieses Workout gibt es nicht (mehr).</p>
    </div>

    <template v-else>
      <p class="kicker">// {{ workout.title }}</p>

      <div v-if="finished" class="panel done" role="status">
        <p class="done-title">Geschafft.</p>
        <p>{{ formatClock(position.totalSeconds) }} gefahren.</p>
        <div class="done-actions">
          <button
            v-if="fromPlan"
            type="button"
            class="button"
            :disabled="marking"
            @click="markDone"
          >
            Als erledigt abhaken
          </button>
          <RouterLink :to="backLink" class="button button-ghost">Zurück</RouterLink>
        </div>
        <p v-if="markError" class="error" role="alert">Abhaken hat nicht geklappt.</p>
      </div>

      <div v-else class="now">
        <div class="now-main" :class="{ hard: percentNow > 105, paused: !running }">
          <p class="step-label">
            {{ current ? kindLabels[current.kind] : '' }}
            <span class="step-count">{{ position.index + 1 }} / {{ steps.length }}</span>
          </p>
          <p v-if="target" class="target">
            {{ target.main }}<span class="unit">{{ target.unit }}</span>
          </p>
          <p v-if="target" class="target-sub">{{ target.sub }}</p>
          <p class="countdown" aria-live="off">{{ formatClock(position.stepRemaining) }}</p>
          <div class="step-bar" aria-hidden="true">
            <span :style="{ width: `${stepPercent}%` }"></span>
          </div>
        </div>

        <div class="now-side">
          <p v-if="next" class="next">
            <span class="next-label">Danach</span>
            {{ describeNext(next) }}
          </p>
          <p v-else class="next"><span class="next-label">Danach</span>Fertig!</p>

          <div class="profile-wrap">
            <WorkoutProfile :steps="steps" class="profile" />
            <span class="marker" :style="{ left: `${progressPercent}%` }" aria-hidden="true"></span>
          </div>
          <p class="totals">
            <span>Gefahren {{ formatClock(elapsed) }}</span>
            <span>Noch {{ formatClock(position.totalSeconds - elapsed) }}</span>
          </p>
        </div>
      </div>

      <div v-if="!finished" class="controls">
        <button
          type="button"
          class="button button-ghost"
          aria-label="Zurück zum Anfang des Abschnitts"
          @click="jumpTo(previousStepStart(steps, elapsed))"
        >
          ⏮
        </button>
        <button type="button" class="button play" @click="toggle">
          {{ running ? '⏸ Pause' : elapsed > 0 ? '▶ Weiter' : '▶ Los' }}
        </button>
        <button
          type="button"
          class="button button-ghost"
          aria-label="Zum nächsten Abschnitt"
          @click="jumpTo(nextStepStart(steps, elapsed))"
        >
          ⏭
        </button>
      </div>

      <div v-if="!finished" class="extras">
        <button type="button" class="link" :aria-pressed="soundOn" @click="soundOn = !soundOn">
          {{ soundOn ? '🔊 Ton an' : '🔇 Ton aus' }}
        </button>
        <button v-if="canFullscreen" type="button" class="link" @click="toggleFullscreen">
          ⛶ Vollbild
        </button>
        <button v-if="elapsed > 0 && !running" type="button" class="link" @click="restart">
          ↺ Von vorn
        </button>
      </div>
      <p v-if="!finished" class="hint">
        Der Bildschirm bleibt an, solange das Training läuft. Vor jedem Wechsel piept es 3-2-1.
        Leertaste = Start/Pause.
      </p>
    </template>
  </section>
</template>

<style scoped>
.stage {
  background: var(--color-ink);
}

.stage:fullscreen {
  overflow-y: auto;
  padding: 24px;
}

.back {
  display: inline-block;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
}

.back:hover {
  color: var(--color-lilac);
}

.now {
  display: grid;
  gap: 16px;
}

@media (min-width: 900px) {
  .now {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: start;
  }
}

.now-main {
  padding: 16px;
  border: 3px solid var(--color-lilac);
  background: var(--color-panel);
  text-align: center;
}

.now-main.hard {
  border-color: var(--color-hot);
}

.now-main.paused .countdown {
  opacity: 0.55;
}

.step-label {
  display: flex;
  justify-content: space-between;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-lilac);
}

.hard .step-label {
  color: var(--color-hot);
}

.step-count {
  color: var(--color-text-muted);
}

.target {
  margin: 12px 0 0;
  font-family: var(--font-heading);
  font-size: clamp(3.5rem, 16vw, 7rem);
  line-height: 1;
}

.unit {
  margin-left: 0.15em;
  font-family: var(--font-mono);
  font-size: 0.3em;
  color: var(--color-text-muted);
}

.target-sub {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.countdown {
  margin: 16px 0 8px;
  font-family: var(--font-mono);
  font-size: clamp(2.6rem, 12vw, 5rem);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.step-bar {
  height: 8px;
  background: var(--color-panel-raised);
}

.step-bar span {
  display: block;
  height: 100%;
  background: var(--color-lilac);
}

.hard .step-bar span {
  background: var(--color-hot);
}

.next {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 2px dashed var(--color-panel-raised);
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.next-label {
  display: block;
  margin-bottom: 2px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.profile-wrap {
  position: relative;
}

.profile {
  height: 72px;
}

.marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 3px;
  margin-left: -1px;
  background: var(--color-text);
}

.totals {
  display: flex;
  justify-content: space-between;
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 8px;
  margin-top: 16px;
}

.controls .button {
  padding: 16px 8px;
  font-size: 1.2rem;
}

.controls .play {
  font-size: 1.3rem;
}

.extras {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 12px;
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

.hint {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.done {
  border-left-color: var(--color-hot);
}

.done-title {
  margin: 0 0 4px;
  font-family: var(--font-heading);
  font-size: 2.4rem;
  text-transform: uppercase;
  color: var(--color-hot);
}

.done p {
  margin: 0;
}

.done-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

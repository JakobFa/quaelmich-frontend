<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  downloadRecordingFit,
  getMyAthlete,
  getPlannedWorkout,
  getWorkout,
  updateProgress,
} from '../api'
import { auth } from '../auth'
import LoadingNotice from '../components/LoadingNotice.vue'
import TrainerPanel from '../components/TrainerPanel.vue'
import WorkoutProfile from '../components/WorkoutProfile.vue'
import { formatRange, heartRateZonesOf, targetForStep } from '../plan/heartRate'
import {
  formatClock,
  nextStepStart,
  percentAt,
  positionAt,
  previousStepStart,
} from '../plan/player'
import { powerZoneFor } from '../plan/zones'
import { trainer } from '../trainer/connection'
import { RideRecorder, summarize, type Recording, type RideSummary } from '../trainer/recording'
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
  if (deviceConnected.value) {
    recorder.record(Date.now(), trainer.values())
    recordedSeconds.value = recorder.samples.length
  }
}

function start() {
  if (position.value.finished) return
  unlockAudio()
  startedAt = performance.now()
  elapsedAtStart = elapsed.value
  running.value = true
  timer = setInterval(tick, 200)
  keepScreenOn()
  trainer.resumeTrainer()
}

function pause() {
  running.value = false
  clearInterval(timer)
  releaseScreen()
  trainer.pauseTrainer()
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
  recorder = new RideRecorder()
  recordedSeconds.value = 0
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
      main: String(wattsFor(percent)),
      unit: 'W',
      sub:
        `${percent} % FTP` + (intensity.value !== 100 ? ` · Intensität ${intensity.value} %` : ''),
    }
  }
  return { main: String(percent), unit: '% FTP', sub: 'Ohne FTP im Profil keine Watt' }
}

const zone = computed(() => powerZoneFor(percentNow.value))

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

// ---------- Trainer: ERG und Live-Werte ----------

const live = trainer.state
const deviceConnected = computed(
  () => live.trainerStatus !== 'none' || live.heartRateStatus !== 'none',
)
/** Workouts, die man nicht in ERG fährt: beim FTP-Test und bei Sprints gibt man selbst alles */
const FREE_RIDE_TYPES = ['FTP_TEST', 'SPRINT']
const ergOn = ref(true)
/** alle Ziele etwas leichter oder härter, wenn die Beine heute nicht (oder besonders gut) wollen */
const intensity = ref(100)
const canErg = computed(() => live.trainerKind === 'SMART' && ftp.value !== null)

function wattsFor(percent: number) {
  return Math.round((ftp.value! * percent * intensity.value) / 10000)
}

const ergWatts = computed(() => (current.value && ftp.value ? wattsFor(percentNow.value) : null))

watch(
  [ergWatts, ergOn, canErg, () => live.trainerStatus],
  () => {
    if (canErg.value) trainer.setTarget(ergOn.value ? ergWatts.value : null)
  },
  { immediate: true },
)

function changeIntensity(step: number) {
  intensity.value = Math.min(150, Math.max(50, intensity.value + step))
}

/** Ist im Vergleich zum Ziel: knapp daneben ist ok (±5 %) */
const powerVerdict = computed(() => {
  if (live.power === null || heartRate.value || !ftp.value || !current.value) return ''
  const goal = ergWatts.value!
  if (live.power < goal * 0.95) return 'low'
  if (live.power > goal * 1.05) return 'high'
  return 'ok'
})

// ---------- Aufzeichnen ----------

const recordingKey = `quaelmich-recording-${fromPlan ? 'plan' : 'workout'}-${id}`
let recorder = new RideRecorder()
const recordedSeconds = ref(0)
const summary = ref<RideSummary | null>(null)
const saving = ref(false)
const saveError = ref(false)
const saved = ref(false)

function rememberRecording() {
  try {
    const recording = recorder.toJSON()
    if (recording) localStorage.setItem(recordingKey, JSON.stringify(recording))
    else localStorage.removeItem(recordingKey)
  } catch {
    // ohne Speicher geht es auch – dann ist die Aufzeichnung nach dem Neuladen weg
  }
}

function restoreRecording() {
  try {
    const saved = localStorage.getItem(recordingKey)
    recorder = new RideRecorder(saved ? (JSON.parse(saved) as Recording) : null)
  } catch {
    recorder = new RideRecorder()
  }
  recordedSeconds.value = recorder.samples.length
}

async function saveRecording() {
  const recording = recorder.toJSON()
  if (!recording || !workout.value) return
  saving.value = true
  saveError.value = false
  try {
    await downloadRecordingFit(recording, workout.value.title)
    saved.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
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
  rememberRecording()
}

function restore() {
  try {
    const saved = Number(localStorage.getItem(storageKey))
    if (saved > 0 && saved < position.value.totalSeconds) {
      elapsed.value = saved
      restoreRecording()
    } else {
      localStorage.removeItem(recordingKey) // alte Aufzeichnung gehört zu einer früheren Fahrt
    }
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
  summary.value = recorder.hasData ? summarize(recorder.samples) : null
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
    ergOn.value = !FREE_RIDE_TYPES.includes(workout.value.type)
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
  trainer.pauseTrainer() // Verbindung bleibt, aber der Trainer hält kein Ziel mehr fest
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
        <p>{{ formatClock(summary ? summary.seconds : elapsed) }} gefahren.</p>
        <template v-if="summary">
          <p class="ride-summary">
            <span v-if="summary.avgPower !== null">Ø {{ summary.avgPower }} W</span>
            <span v-if="summary.normalizedPower !== null">NP {{ summary.normalizedPower }} W</span>
            <span v-if="summary.avgCadence !== null">Ø {{ summary.avgCadence }} rpm</span>
            <span v-if="summary.avgHeartRate !== null">Ø {{ summary.avgHeartRate }} bpm</span>
          </p>
          <p v-if="auth.isLoggedIn.value" class="save-hint">
            Lade die Datei bei Strava oder intervals.icu hoch – dann ordnet quaelmich die Fahrt wie
            jede andere zu.
          </p>
          <p v-else class="save-hint">Zum Speichern der Fahrt musst du eingeloggt sein.</p>
        </template>
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
          <button
            v-if="summary && auth.isLoggedIn.value"
            type="button"
            class="button"
            :class="{ 'button-ghost': fromPlan }"
            :disabled="saving"
            @click="saveRecording"
          >
            {{ saved ? '✓ Fahrt gespeichert' : 'Fahrt als .fit speichern' }}
          </button>
          <RouterLink :to="backLink" class="button button-ghost">Zurück</RouterLink>
        </div>
        <p v-if="markError" class="error" role="alert">Abhaken hat nicht geklappt.</p>
        <p v-if="saveError" class="error" role="alert">Speichern hat nicht geklappt.</p>
      </div>

      <div v-else class="now">
        <div class="now-main" :class="{ paused: !running }" :style="{ '--zone': zone.color }">
          <p class="step-label">
            <span>
              {{ current ? kindLabels[current.kind] : '' }}
              <span class="zone-name">Z{{ zone.zone }} {{ zone.name }}</span>
            </span>
            <span class="step-count">{{ position.index + 1 }} / {{ steps.length }}</span>
          </p>
          <p v-if="target" class="target">
            {{ target.main }}<span class="unit">{{ target.unit }}</span>
          </p>
          <p v-if="target" class="target-sub">{{ target.sub }}</p>
          <p v-if="deviceConnected" class="live" aria-live="off">
            <span class="live-power" :class="powerVerdict">
              {{ live.power ?? '–' }}<small>W</small>
            </span>
            <span>{{ live.cadence ?? '–' }}<small>rpm</small></span>
            <span>{{ live.heartRate ?? '–' }}<small>bpm</small></span>
          </p>
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

      <TrainerPanel v-if="!finished" />

      <div v-if="!finished && (canErg || (deviceConnected && ftp))" class="erg">
        <button
          v-if="canErg"
          type="button"
          class="link"
          :aria-pressed="ergOn"
          @click="ergOn = !ergOn"
        >
          {{ ergOn ? '⚡ ERG an' : '⚡ ERG aus – frei fahren' }}
        </button>
        <span class="intensity">
          Intensität
          <button type="button" class="step" aria-label="Leichter" @click="changeIntensity(-1)">
            −
          </button>
          <strong>{{ intensity }} %</strong>
          <button type="button" class="step" aria-label="Härter" @click="changeIntensity(1)">
            +
          </button>
        </span>
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
        <button v-if="recordedSeconds > 0 && !running" type="button" class="link" @click="finish">
          ■ Beenden &amp; speichern
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
  border: 3px solid var(--zone);
  background: var(--color-panel);
  text-align: center;
  transition: border-color 0.4s;
}

.now-main.paused .countdown {
  opacity: 0.55;
}

.step-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--zone);
}

.zone-name {
  display: inline-block;
  margin-left: 6px;
  white-space: nowrap;
  padding: 1px 6px;
  background: var(--zone);
  color: var(--color-ink);
}

.step-count {
  white-space: nowrap;
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
  background: var(--zone);
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

.live {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 12px 0 0;
  font-family: var(--font-mono);
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.live small {
  margin-left: 2px;
  font-size: 0.55em;
  font-weight: 400;
  color: var(--color-text-muted);
}

.live-power.ok {
  color: #35b86b;
}

.live-power.low,
.live-power.high {
  color: #f4c430;
}

.erg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.intensity {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
}

.intensity strong {
  min-width: 3.5em;
  text-align: center;
  color: var(--color-text);
}

.step {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-panel-raised);
  background: none;
  color: var(--color-text);
  font: inherit;
  font-size: 1.1rem;
  cursor: pointer;
}

.ride-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 8px !important;
  font-family: var(--font-mono);
  font-weight: 700;
}

.save-hint {
  margin-top: 8px !important;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>

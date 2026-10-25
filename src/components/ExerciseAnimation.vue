<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { Exercise, Point, Pose } from '../strength/exercises'

/**
 * Strichfigur, die eine Übung vormacht: zwischen Start- und Endposition wird jedes Gelenk verschoben.
 * smooth = false springt nur zwischen den beiden Posen. Wer weniger Bewegung eingestellt hat, sieht die
 * Startposition und die Endposition als Umriss.
 */
const props = withDefaults(defineProps<{ exercise: Exercise; smooth?: boolean }>(), {
  smooth: true,
})
const emit = defineEmits<{ cue: [text: string] }>()

const progress = ref(0)
const cue = ref(props.exercise.cueTowardsEnd)
let frame = 0
let startedAt = 0

/** hin, kurz halten, zurück, kurz halten (Stütz: langsames Atmen) */
const timing = computed(() =>
  props.exercise.hold
    ? { towards: 2000, holdEnd: 0, back: 2000, holdStart: 0 }
    : { towards: 1400, holdEnd: 300, back: 1200, holdStart: 300 },
)

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function tick(now: number) {
  const { towards, holdEnd, back, holdStart } = timing.value
  const cycle = towards + holdEnd + back + holdStart
  const ms = (now - startedAt) % cycle
  let t: number
  if (ms < towards) t = ease(ms / towards)
  else if (ms < towards + holdEnd) t = 1
  else if (ms < towards + holdEnd + back) t = 1 - ease((ms - towards - holdEnd) / back)
  else t = 0
  if (!props.smooth) t = ms < towards / 2 || ms >= towards + holdEnd + back ? 0 : 1
  progress.value = t
  const text = ms < towards + holdEnd ? props.exercise.cueTowardsEnd : props.exercise.cueBack
  if (text !== cue.value) {
    cue.value = text
    emit('cue', text)
  }
  frame = requestAnimationFrame(tick)
}

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (reducedMotion || typeof requestAnimationFrame === 'undefined') return
  startedAt = performance.now()
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))

function mix(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

const pose = computed<Pose>(() => {
  const { start, end } = props.exercise
  const t = progress.value
  return Object.fromEntries(
    (Object.keys(start) as (keyof Pose)[]).map((joint) => [
      joint,
      mix(start[joint], end[joint], t),
    ]),
  ) as Pose
})

/** Umriss der Position, auf die sich die Figur gerade zubewegt */
const ghost = computed(() => (progress.value > 0.5 ? props.exercise.start : props.exercise.end))

/** Ausschnitt: volle Breite (gleicher Maßstab für alle Übungen), oben nur so viel Platz wie die Figur braucht */
const viewBox = computed(() => {
  const ys = [props.exercise.start, props.exercise.end].flatMap((p) =>
    Object.values(p).map(([, y]) => y),
  )
  const top = Math.max(0, Math.min(...ys, props.exercise.bench ? 226 : 300) - 32)
  return `0 ${top} 300 ${284 - top}`
})

const line = (...points: Point[]) =>
  points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')

function limbs(p: Pose) {
  return {
    leg2: line(p.toe2, p.ankle2, p.knee2, p.hip),
    leg: line(p.toe, p.ankle, p.knee, p.hip),
    body: line(p.hip, p.shoulder),
    arm: line(p.shoulder, p.elbow, p.hand),
  }
}
</script>

<template>
  <svg :viewBox="viewBox" class="figure" role="img" :aria-label="`${exercise.name}: ${cue}`">
    <line x1="20" y1="276" x2="290" y2="276" class="ground" />
    <rect v-if="exercise.bench" x="30" y="226" width="62" height="48" class="bench" />

    <g class="ghost">
      <polyline :points="limbs(ghost).leg2" />
      <polyline :points="limbs(ghost).leg" />
      <polyline :points="limbs(ghost).body" />
      <polyline :points="limbs(ghost).arm" />
      <circle :cx="ghost.head[0]" :cy="ghost.head[1]" r="14" />
    </g>

    <g class="limb back">
      <polyline :points="limbs(pose).leg2" />
    </g>
    <g class="limb">
      <polyline :points="limbs(pose).leg" />
      <polyline :points="limbs(pose).body" />
      <polyline :points="limbs(pose).arm" />
      <circle :cx="pose.head[0]" :cy="pose.head[1]" r="14" class="head" />
    </g>
    <rect
      v-if="exercise.weights"
      :x="pose.hand[0] - 12"
      :y="pose.hand[1] - 5"
      width="24"
      height="10"
      class="weight"
    />
    <circle :cx="pose.knee[0]" :cy="pose.knee[1]" r="5" class="joint" />
    <circle :cx="pose.hip[0]" :cy="pose.hip[1]" r="5" class="joint" />
  </svg>
</template>

<style scoped>
.figure {
  display: block;
  width: 100%;
  max-width: 260px;
  margin: 0 auto;
}

.ground {
  stroke: var(--color-lilac);
  stroke-width: 2;
  stroke-dasharray: 6 6;
}

.bench {
  fill: none;
  stroke: var(--color-lilac);
  stroke-width: 3;
}

.ghost polyline,
.ghost circle {
  fill: none;
  stroke: var(--color-lilac);
  stroke-opacity: 0.22;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.limb polyline {
  fill: none;
  stroke: var(--color-hot);
  stroke-width: 9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.limb.back polyline {
  stroke: var(--color-plum);
}

.head {
  fill: var(--color-ink);
  stroke: var(--color-hot);
  stroke-width: 9;
}

.weight {
  fill: var(--color-lilac);
}

.joint {
  fill: var(--color-ink);
  stroke: var(--color-lilac);
  stroke-width: 3;
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { Exercise, Point, Pose, Tempo } from '../strength/exercises'
import { loadCenter, mainMover, poseAt } from '../strength/motion'

/**
 * Figur, die eine Übung vormacht. Die Körperteile drehen sich um ihre Gelenke (siehe motion.ts), Gewichte
 * bewegen sich mit den Händen, eine gestrichelte Linie zeigt die Bahn des Teils, das sich am meisten
 * bewegt. smooth = false springt nur zwischen den beiden Posen. Wer weniger Bewegung eingestellt hat, sieht
 * die Startposition und die Endposition als Umriss. still = fester Zeitpunkt (0 bis 1) ohne Animation.
 */
const props = withDefaults(
  defineProps<{ exercise: Exercise; smooth?: boolean; still?: number }>(),
  { smooth: true, still: undefined },
)
const emit = defineEmits<{ cue: [text: string] }>()

const progress = ref(props.still ?? 0)
const cue = ref(props.exercise.cueTowardsEnd)
let frame = 0
let startedAt = 0

/** hin, kurz halten, zurück, kurz halten (Stütz: langsames Atmen, Mobility: ruhig im Atemrhythmus) */
const timing = computed<Tempo>(() => {
  if (props.exercise.tempo) return props.exercise.tempo
  if (props.exercise.hold) return { towards: 2000, holdEnd: 0, back: 2000, holdStart: 0 }
  if (props.exercise.kind === 'mobility')
    return { towards: 2200, holdEnd: 600, back: 2000, holdStart: 400 }
  return { towards: 1400, holdEnd: 300, back: 1200, holdStart: 300 }
})

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
  if (props.still !== undefined || reducedMotion || typeof requestAnimationFrame === 'undefined')
    return
  startedAt = performance.now()
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))

const pose = computed(() => poseAt(props.exercise, progress.value))

/** Umriss der Position, auf die sich die Figur gerade zubewegt */
const ghost = computed(() => poseAt(props.exercise, progress.value > 0.5 ? 0 : 1))

/** Bahn des Körperteils, das sich am meisten bewegt (bei Stütz-Übungen keine) */
const path = computed(() => {
  const key = mainMover(props.exercise)
  if (!key || props.exercise.hold) return null
  const points = Array.from({ length: 25 }, (_, i) => poseAt(props.exercise, i / 24)[key] as Point)
  return line(...points)
})

/** Liegen, knien, stützen: dann liegt eine Matte unter der Figur */
const onMat = computed(() => Math.min(props.exercise.start.hip[1], props.exercise.end.hip[1]) > 195)

/** Ausschnitt: volle Breite (gleicher Maßstab für alle Übungen), oben nur so viel Platz wie die Figur braucht */
const viewBox = computed(() => {
  const ys = [0, 0.25, 0.5, 0.75, 1].flatMap((t) =>
    Object.values(poseAt(props.exercise, t)).map(([, y]) => y),
  )
  const top = Math.max(0, Math.min(...ys) - 34)
  return `0 ${top.toFixed(0)} 300 ${(288 - top).toFixed(0)}`
})

/** Schatten unter der Figur: so breit wie der Körper über dem Boden */
const shadow = computed(() => {
  const xs = Object.values(pose.value).map(([x]) => x)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  return { cx: (left + right) / 2, rx: (right - left) / 2 + 14 }
})

const line = (...points: Point[]) =>
  points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')

function body(p: Required<Pose>) {
  const torso = props.exercise.start.spine ? [p.hip, p.spine, p.shoulder] : [p.hip, p.shoulder]
  return {
    torso: line(...torso),
    neck: line(p.shoulder, p.head),
    thigh: line(p.hip, p.knee),
    shin: line(p.knee, p.ankle),
    foot: line(p.ankle, p.toe),
    thigh2: line(p.hip, p.knee2),
    shin2: line(p.knee2, p.ankle2),
    foot2: line(p.ankle2, p.toe2),
    upperArm: line(p.shoulder, p.elbow),
    forearm: line(p.elbow, p.hand),
    upperArm2: line(p.shoulder, p.elbow2),
    forearm2: line(p.elbow2, p.hand2),
  }
}

const parts = computed(() => body(pose.value))
const ghostParts = computed(() => body(ghost.value))

/** Gewichte: vorn das in der vorderen Hand, hinten das zweite (bei zwei Kurzhanteln) */
const weights = computed(() => {
  const load = props.exercise.load
  if (!load) return []
  const front = loadCenter(props.exercise, pose.value)
  const back = load.pair ? loadCenter(props.exercise, pose.value, true) : null
  /** Kettlebell: der Griff zeigt zur Hand */
  const turn = (center: Point, hand: Point) =>
    load.kind === 'kettlebell' && load.at !== 'hip'
      ? (Math.atan2(hand[1] - center[1], hand[0] - center[0]) * 180) / Math.PI + 90
      : 0
  return [
    ...(back ? [{ center: back, back: true, rotate: turn(back, pose.value.hand2) }] : []),
    ...(front ? [{ center: front, back: false, rotate: turn(front, pose.value.hand) }] : []),
  ].map((weight) => ({ ...weight, kind: load.kind, vertical: !!load.vertical }))
})
const backWeights = computed(() => weights.value.filter((weight) => weight.back))
const frontWeights = computed(() => weights.value.filter((weight) => !weight.back))
</script>

<template>
  <svg :viewBox="viewBox" class="figure" role="img" :aria-label="`${exercise.name}: ${cue}`">
    <ellipse :cx="shadow.cx" cy="273" :rx="shadow.rx" ry="5" class="shadow" />
    <rect v-if="onMat" x="22" y="271" width="270" height="6" rx="3" class="mat" />
    <line v-else x1="20" y1="276" x2="290" y2="276" class="ground" />

    <polyline v-if="path" :points="path" class="path" />

    <g class="ghost">
      <polyline :points="ghostParts.torso" />
      <polyline :points="`${ghostParts.thigh} ${ghostParts.shin.split(' ')[1]}`" />
      <polyline :points="`${ghostParts.upperArm} ${ghostParts.forearm.split(' ')[1]}`" />
      <circle :cx="ghost.head[0]" :cy="ghost.head[1]" r="13" />
    </g>

    <!-- hinten: zweites Bein, zweiter Arm und was er hält -->
    <g class="back">
      <polyline :points="parts.thigh2" class="thigh" />
      <polyline :points="parts.shin2" class="shin" />
      <polyline :points="parts.foot2" class="foot" />
      <polyline :points="parts.upperArm2" class="upper-arm" />
      <polyline :points="parts.forearm2" class="forearm" />
    </g>
    <template v-for="(weight, i) in backWeights" :key="`b${i}`">
      <g
        :transform="`translate(${weight.center[0].toFixed(1)} ${weight.center[1].toFixed(1)}) rotate(${weight.rotate.toFixed(1)})`"
        class="weight back"
      >
        <template v-if="weight.kind === 'dumbbell'">
          <g :transform="weight.vertical ? 'rotate(90)' : undefined">
            <rect x="-9" y="-1.8" width="18" height="3.6" rx="1.5" />
            <rect x="-14" y="-8" width="6" height="16" rx="2" />
            <rect x="8" y="-8" width="6" height="16" rx="2" />
          </g>
        </template>
        <template v-else>
          <path d="M -6 -9 Q -7 -19 0 -19 Q 7 -19 6 -9" class="handle" />
          <circle r="10" />
        </template>
      </g>
    </template>

    <!-- vorn: Oberkörper, Kopf, vorderes Bein, vorderer Arm -->
    <g class="front">
      <polyline :points="parts.thigh" class="thigh" />
      <polyline :points="parts.shin" class="shin" />
      <polyline :points="parts.foot" class="foot" />
      <polyline :points="parts.torso" class="torso" />
      <polyline :points="parts.neck" class="neck" />
      <circle :cx="pose.head[0]" :cy="pose.head[1]" r="13" class="head" />
    </g>
    <template v-for="(weight, i) in frontWeights" :key="`f${i}`">
      <g
        :transform="`translate(${weight.center[0].toFixed(1)} ${weight.center[1].toFixed(1)}) rotate(${weight.rotate.toFixed(1)})`"
        class="weight"
      >
        <template v-if="weight.kind === 'dumbbell'">
          <g :transform="weight.vertical ? 'rotate(90)' : undefined">
            <rect x="-9" y="-1.8" width="18" height="3.6" rx="1.5" />
            <rect x="-14" y="-8" width="6" height="16" rx="2" />
            <rect x="8" y="-8" width="6" height="16" rx="2" />
          </g>
        </template>
        <template v-else>
          <path d="M -6 -9 Q -7 -19 0 -19 Q 7 -19 6 -9" class="handle" />
          <circle r="10" />
        </template>
      </g>
    </template>
    <g class="front">
      <polyline :points="parts.upperArm" class="upper-arm" />
      <polyline :points="parts.forearm" class="forearm" />
    </g>
    <circle :cx="pose.knee[0]" :cy="pose.knee[1]" r="3" class="joint" />
    <circle :cx="pose.hip[0]" :cy="pose.hip[1]" r="3.5" class="joint" />
  </svg>
</template>

<style scoped>
.figure {
  --front: var(--color-hot);
  --back: color-mix(in srgb, var(--color-hot) 48%, var(--color-ink));
  --metal: var(--color-lilac);
  --metal-back: var(--color-lilac-dim);
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.ground {
  stroke: var(--color-lilac);
  stroke-opacity: 0.5;
  stroke-width: 2;
  stroke-dasharray: 6 6;
}

.mat {
  fill: var(--color-plum);
}

.shadow {
  fill: #000;
  opacity: 0.35;
}

.path {
  fill: none;
  stroke: var(--color-lilac);
  stroke-opacity: 0.45;
  stroke-width: 2;
  stroke-dasharray: 2 5;
  stroke-linecap: round;
}

.ghost polyline,
.ghost circle {
  fill: none;
  stroke: var(--color-lilac);
  stroke-opacity: 0.16;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.front polyline,
.back polyline {
  fill: none;
  stroke: var(--front);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back polyline {
  stroke: var(--back);
}

.torso {
  stroke-width: 17;
}

.neck {
  stroke-width: 8;
}

.thigh {
  stroke-width: 13;
}

.shin {
  stroke-width: 10;
}

.foot {
  stroke-width: 7;
}

.upper-arm {
  stroke-width: 9;
}

.forearm {
  stroke-width: 7.5;
}

.head {
  fill: var(--front);
}

.joint {
  fill: var(--color-ink);
  opacity: 0.55;
}

.weight rect,
.weight circle {
  fill: var(--metal);
  stroke: var(--color-ink);
  stroke-width: 1.5;
}

.weight .handle {
  fill: none;
  stroke: var(--metal);
  stroke-width: 3.5;
  stroke-linecap: round;
}

.weight.back rect,
.weight.back circle {
  fill: var(--metal-back);
}

.weight.back .handle {
  stroke: var(--metal-back);
}
</style>

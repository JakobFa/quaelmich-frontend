<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { Exercise, Point, Tempo } from '../strength/exercises'
import { figure, type Group } from '../strength/figure'
import { loadCenter, mainMover, poseAt } from '../strength/motion'

/**
 * Ein Mensch, der eine Übung vormacht: Körperformen, Kleidung und Kopf kommen aus figure.ts, die Bewegung
 * aus motion.ts. Die Bewegung folgt dem Verlauf, mit dem Menschen sich bewegen (sanft anlaufen, sanft
 * abbremsen), freie Arme schwingen ein wenig nach, die Brust hebt sich beim Atmen. Gewichte bewegen sich
 * mit den Händen, eine gestrichelte Linie zeigt die Bahn des Teils, das sich am meisten bewegt.
 * smooth = false springt nur zwischen den beiden Posen. Wer weniger Bewegung eingestellt hat, sieht die
 * Startposition und die Endposition als Schatten. still = fester Zeitpunkt (0 bis 1) ohne Animation.
 */
const props = withDefaults(
  defineProps<{ exercise: Exercise; smooth?: boolean; still?: number }>(),
  { smooth: true, still: undefined },
)
const emit = defineEmits<{ cue: [text: string] }>()

const progress = ref(props.still ?? 0)
/** Zeitpunkt der freien Arme: folgt progress wie an einer Feder, mit etwas Nachschwingen */
const armProgress = ref(progress.value)
/** Atmung von -1 bis 1 */
const breath = ref(0)
const cue = ref(props.exercise.cueTowardsEnd)
let frame = 0
let startedAt = 0
let lastTick = 0
let armSpeed = 0

/** hin, kurz halten, zurück, kurz halten (Stütz: langsames Atmen, Mobility: ruhig im Atemrhythmus) */
const timing = computed<Tempo>(() => {
  if (props.exercise.tempo) return props.exercise.tempo
  if (props.exercise.hold) return { towards: 2000, holdEnd: 0, back: 2000, holdStart: 0 }
  if (props.exercise.kind === 'mobility')
    return { towards: 2200, holdEnd: 600, back: 2000, holdStart: 400 }
  return { towards: 1400, holdEnd: 300, back: 1200, holdStart: 300 }
})

/** Verlauf mit geringstem Ruck: so beschleunigen und bremsen Menschen eine Bewegung */
const ease = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t)

/** Feder für die Arme: etwas weicher als kritisch gedämpft, damit sie kurz nachschwingen */
const SPRING = 90
const DAMPING = 2 * Math.sqrt(SPRING) * 0.62

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

  const dt = Math.min(0.05, (now - lastTick) / 1000)
  lastTick = now
  if (props.smooth) {
    armSpeed += (SPRING * (t - armProgress.value) - DAMPING * armSpeed) * dt
    armProgress.value = Math.min(1.08, Math.max(-0.08, armProgress.value + armSpeed * dt))
  } else {
    armProgress.value = t
    armSpeed = 0
  }
  breath.value = Math.sin(((now - startedAt) / 4200) * 2 * Math.PI)

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
  lastTick = startedAt
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))

const pose = computed(() => poseAt(props.exercise, progress.value, armProgress.value))
const grip = computed(() => !!props.exercise.load)
const shapes = computed(() => figure(pose.value, { breath: breath.value, grip: grip.value }))

/** Schatten der Position, auf die sich die Figur gerade zubewegt */
const ghost = computed(() => {
  const target = figure(poseAt(props.exercise, progress.value > 0.5 ? 0 : 1), { grip: grip.value })
  return [target.body, target.frontLeg, target.frontArm].flatMap((group) => group.shapes)
})

/** Hinten das zweite Bein und der zweite Arm, davor Rumpf und vorderes Bein; der vordere Arm kommt zuletzt */
const layers = computed<{ back: Group[]; front: Group[]; arm: Group }>(() => ({
  back: [shapes.value.backLeg, shapes.value.backArm],
  front: [shapes.value.body, shapes.value.frontLeg],
  arm: shapes.value.frontArm,
}))

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
      <path v-for="(shape, i) in ghost" :key="i" :d="shape.d" />
    </g>

    <!-- hinten: zweites Bein, zweiter Arm und was er hält -->
    <template v-for="(group, g) in layers.back" :key="`b${g}`">
      <g class="outline">
        <path v-for="(shape, i) in group.shapes" :key="i" :d="shape.d" />
      </g>
      <g class="back">
        <path
          v-for="(shape, i) in [...group.shapes, ...group.details]"
          :key="i"
          :d="shape.d"
          :class="[shape.part, shape.name]"
        />
      </g>
    </template>
    <template v-for="(weight, i) in backWeights" :key="`bw${i}`">
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

    <!-- vorn: Rumpf mit Kopf, vorderes Bein -->
    <template v-for="(group, g) in layers.front" :key="`f${g}`">
      <g class="outline">
        <path v-for="(shape, i) in group.shapes" :key="i" :d="shape.d" />
      </g>
      <g class="front">
        <path
          v-for="(shape, i) in [...group.shapes, ...group.details]"
          :key="i"
          :d="shape.d"
          :class="[shape.part, shape.name]"
        />
      </g>
    </template>
    <template v-for="(weight, i) in frontWeights" :key="`fw${i}`">
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

    <!-- ganz vorn: der vordere Arm, die Hand greift über das Gewicht -->
    <g class="outline">
      <path v-for="(shape, i) in layers.arm.shapes" :key="i" :d="shape.d" />
    </g>
    <g class="front">
      <path
        v-for="(shape, i) in [...layers.arm.shapes, ...layers.arm.details]"
        :key="i"
        :d="shape.d"
        :class="[shape.part, shape.name]"
      />
    </g>
  </svg>
</template>

<style scoped>
.figure {
  --skin: #e6ad8f;
  --skin-back: #a9765f;
  --ear: #cf9175;
  --hair: #4b3128;
  --shirt: var(--color-hot);
  --shirt-back: color-mix(in srgb, var(--color-hot) 55%, var(--color-ink));
  --shorts: var(--color-lilac-dim);
  --shorts-back: color-mix(in srgb, var(--color-lilac-dim) 55%, var(--color-ink));
  --shoe: var(--color-text);
  --shoe-back: color-mix(in srgb, var(--color-text) 55%, var(--color-ink));
  --sole: var(--color-lilac);
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

.ghost path {
  fill: var(--color-lilac);
  fill-opacity: 0.1;
}

/* gemeinsamer Umriss je Gruppe: trennt Arm vom Rumpf und vorderes vom hinteren Bein */
.outline path {
  fill: var(--color-ink);
  stroke: var(--color-ink);
  stroke-width: 3.4;
  stroke-linejoin: round;
}

.front .skin {
  fill: var(--skin);
}
.back .skin {
  fill: var(--skin-back);
}
.front .shirt {
  fill: var(--shirt);
}
.back .shirt {
  fill: var(--shirt-back);
}
.front .shorts {
  fill: var(--shorts);
}
.back .shorts {
  fill: var(--shorts-back);
}
.front .shoe {
  fill: var(--shoe);
}
.back .shoe {
  fill: var(--shoe-back);
}
.sole {
  fill: var(--sole);
}
.back .sole {
  fill: var(--metal-back);
}
.hair {
  fill: var(--hair);
}
.ear {
  fill: var(--ear);
}
.eye {
  fill: var(--color-ink);
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

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ExerciseAnimation from '../components/ExerciseAnimation.vue'
import StrengthSession from '../components/StrengthSession.vue'
import {
  exercises,
  exercisesOf,
  STRENGTH_SESSIONS,
  type Equipment,
  type Pose,
} from '../strength/exercises'
import { poseAt } from '../strength/motion'

const EQUIPMENT: Equipment[] = ['none', 'dumbbells', 'kettlebell']
const OPTIONAL = ['spine', 'elbow2', 'hand2']
const gap = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1])

const JOINTS = [
  'head',
  'shoulder',
  'elbow',
  'hand',
  'hip',
  'knee',
  'ankle',
  'toe',
  'knee2',
  'ankle2',
  'toe2',
]

describe('Krafttraining', () => {
  beforeEach(() => {
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      clear: () => saved.clear(),
    })
  })

  it('jede Übung hat beide Posen mit allen Gelenken im Bild', () => {
    for (const exercise of Object.values(exercises)) {
      for (const pose of [exercise.start, exercise.end]) {
        expect(
          Object.keys(pose)
            .filter((joint) => !OPTIONAL.includes(joint))
            .sort(),
        ).toEqual([...JOINTS].sort())
        for (const joint of OPTIONAL) {
          expect(joint in exercise.start, `${exercise.id}: ${joint} in beiden Posen`).toBe(
            joint in exercise.end,
          )
        }
        for (const [x, y] of Object.values(pose)) {
          expect(x, `${exercise.id} x`).toBeGreaterThanOrEqual(0)
          expect(x, `${exercise.id} x`).toBeLessThanOrEqual(300)
          expect(y, `${exercise.id} y`).toBeGreaterThanOrEqual(0)
          expect(y, `${exercise.id} y`).toBeLessThanOrEqual(276)
        }
      }
      expect(exercise.cues.length).toBeGreaterThan(0)
    }
  })

  it('die Bewegung beginnt und endet genau in den beiden Posen', () => {
    for (const exercise of Object.values(exercises)) {
      for (const [t, pose] of [
        [0, exercise.start],
        [1, exercise.end],
      ] as const) {
        const moved = poseAt(exercise, t)
        for (const joint of JOINTS as (keyof Pose)[]) {
          expect(gap(moved[joint], pose[joint]!), `${exercise.id} ${joint} bei ${t}`).toBeLessThan(
            3,
          )
        }
      }
    }
  })

  it('Arme und Oberkörper schrumpfen mitten in der Bewegung nicht', () => {
    const bones: [keyof Pose, keyof Pose][] = [
      ['hip', 'shoulder'],
      ['shoulder', 'elbow'],
      ['elbow', 'hand'],
      ['hip', 'knee'],
      ['knee', 'ankle'],
    ]
    for (const exercise of Object.values(exercises)) {
      for (const [a, b] of bones) {
        const shortest = Math.min(
          gap(exercise.start[a]!, exercise.start[b]!),
          gap(exercise.end[a]!, exercise.end[b]!),
        )
        for (const t of [0.25, 0.5, 0.75]) {
          const pose = poseAt(exercise, t)
          expect(gap(pose[a], pose[b]), `${exercise.id} ${a}–${b} bei ${t}`).toBeGreaterThan(
            shortest * 0.9,
          )
        }
      }
    }
  })

  it('Füße am Boden bleiben stehen, auch wenn sich der Körper bewegt', () => {
    const squat = exercises.gobletSquatKettlebell!
    for (const t of [0.25, 0.5, 0.75]) {
      expect(gap(poseAt(squat, t).ankle, squat.start.ankle)).toBeLessThan(0.5)
    }
  })

  it('jede Einheit: erst mobilisieren, dann vier Kraftübungen, zum Schluss dehnen – mit jeder Ausrüstung', () => {
    for (const [id, equipment] of Object.keys(STRENGTH_SESSIONS)
      .map(Number)
      .flatMap((id) => EQUIPMENT.map((e) => [id, e] as const))) {
      const items = exercisesOf(id, equipment)
      expect(items.every((item) => item.exercise && item.sets > 0)).toBe(true)
      expect(items.map((item) => item.block)).toEqual([
        'warmup',
        'main',
        'main',
        'main',
        'main',
        'cooldown',
      ])
      expect(
        items.filter((item) => item.block === 'main').every((i) => i.exercise.kind === 'strength'),
      ).toBe(true)
      expect(
        items.filter((item) => item.block !== 'main').every((i) => i.exercise.kind === 'mobility'),
      ).toBe(true)
    }
    expect(exercisesOf(5)).toEqual([]) // eine Radeinheit
  })

  it('mit Kurzhanteln oder Kettlebell trägt jede Kraftübung außer dem Stütz ein Gewicht', () => {
    for (const id of Object.keys(STRENGTH_SESSIONS).map(Number)) {
      for (const equipment of ['dumbbells', 'kettlebell'] as const) {
        const main = exercisesOf(id, equipment).filter((item) => item.block === 'main')
        const weighted = main.filter((item) => item.exercise.load)
        expect(weighted.length, `${id} ${equipment}`).toBe(3)
        expect(
          weighted.every(
            (item) =>
              item.exercise.load!.kind === (equipment === 'kettlebell' ? 'kettlebell' : 'dumbbell'),
          ),
        ).toBe(true)
      }
    }
  })

  it('zeichnet Hanteln und Kettlebell an der Hand', () => {
    const row = mount(ExerciseAnimation, {
      props: { exercise: exercises.rowDumbbells!, still: 0.5 },
    })
    expect(row.findAll('.weight')).toHaveLength(2) // in jeder Hand eine
    const swing = mount(ExerciseAnimation, { props: { exercise: exercises.kettlebellSwing! } })
    expect(swing.findAll('.weight')).toHaveLength(1)
    expect(swing.find('.weight .handle').exists()).toBe(true)
    expect(swing.find('.path').exists()).toBe(true) // Bahn des Schwungs
  })

  it('rundet bei Katze-Kuh den Rücken über einen Punkt in der Wirbelsäule', () => {
    const catCow = mount(ExerciseAnimation, { props: { exercise: exercises.catCow! } })
    const body = catCow.find('.torso').attributes('points')!
    expect(body.split(' ')).toHaveLength(3) // Hüfte, Wirbelsäule, Schulter
  })

  it('zeichnet die Figur mit Kopf und allen Gliedmaßen', () => {
    const squat = mount(ExerciseAnimation, { props: { exercise: exercises.squat! } })
    expect(squat.findAll('.front polyline, .back polyline')).toHaveLength(12)
    expect(squat.find('.head').exists()).toBe(true)
    expect(squat.attributes('aria-label')).toContain('Kniebeuge')
  })

  it('zeigt die Einheit mit Sätzen, Hinweisen und Umschalter für die Animation', async () => {
    const wrapper = mount(StrengthSession, { props: { workoutId: 40, phase: 'BASE' } })

    expect(wrapper.findAll('.exercise')).toHaveLength(6)
    expect(wrapper.findAll('.block-title').map((title) => title.text())).toEqual([
      '// Mobilisieren',
      '// Kraft',
      '// Dehnen zum Schluss',
    ])
    expect(wrapper.text()).toContain('Kniebeuge')
    expect(wrapper.text()).toContain('3 × 12')
    expect(wrapper.text()).toContain('Grundlagenphase')

    await wrapper.find('button.link').trigger('click')
    expect(wrapper.text()).toContain('Animation: 2 Posen')
  })

  it('wechselt die Ausrüstung und merkt sie sich', async () => {
    const wrapper = mount(StrengthSession, { props: { workoutId: 40, phase: 'BASE' } })
    expect(wrapper.text()).toContain('Kniebeuge')

    await wrapper.find('input[value="kettlebell"]').setValue(true)
    expect(wrapper.text()).toContain('Kettlebell-Swing')
    expect(wrapper.text()).toContain('8–16 kg')
    expect(localStorage.getItem('quaelmich.kraft.ausruestung')).toBe('kettlebell')

    const again = mount(StrengthSession, { props: { workoutId: 41, phase: 'BUILD' } })
    expect(again.text()).toContain('Bodendrücken')
  })
})

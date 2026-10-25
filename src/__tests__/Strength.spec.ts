import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExerciseAnimation from '../components/ExerciseAnimation.vue'
import StrengthSession from '../components/StrengthSession.vue'
import { exercises, exercisesOf, STRENGTH_SESSIONS } from '../strength/exercises'

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
  it('jede Übung hat beide Posen mit allen Gelenken im Bild', () => {
    for (const exercise of Object.values(exercises)) {
      for (const pose of [exercise.start, exercise.end]) {
        expect(
          Object.keys(pose)
            .filter((joint) => joint !== 'spine')
            .sort(),
        ).toEqual([...JOINTS].sort())
        expect('spine' in exercise.start, `${exercise.id}: Wirbelsäule in beiden Posen`).toBe(
          'spine' in exercise.end,
        )
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

  it('jede Einheit: erst mobilisieren, dann vier Kraftübungen, zum Schluss dehnen', () => {
    for (const id of Object.keys(STRENGTH_SESSIONS).map(Number)) {
      const items = exercisesOf(id)
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

  it('rundet bei Katze-Kuh den Rücken über einen Punkt in der Wirbelsäule', () => {
    const catCow = mount(ExerciseAnimation, { props: { exercise: exercises.catCow! } })
    const body = catCow.findAll('.limb polyline')[2]!.attributes('points')!
    expect(body.split(' ')).toHaveLength(3) // Hüfte, Wirbelsäule, Schulter
  })

  it('zeichnet die Figur mit Kopf und allen Gliedmaßen', () => {
    const squat = mount(ExerciseAnimation, { props: { exercise: exercises.squat! } })
    expect(squat.findAll('.limb polyline')).toHaveLength(4)
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
})

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
        expect(Object.keys(pose).sort()).toEqual([...JOINTS].sort())
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

  it('jede Einheit hat vier Übungen aus der Bibliothek', () => {
    for (const id of Object.keys(STRENGTH_SESSIONS).map(Number)) {
      const items = exercisesOf(id)
      expect(items).toHaveLength(4)
      expect(items.every((item) => item.exercise && item.sets > 0)).toBe(true)
    }
    expect(exercisesOf(5)).toEqual([]) // eine Radeinheit
  })

  it('zeichnet die Figur, mit Hanteln nur, wo welche dazugehören', () => {
    const deadlift = mount(ExerciseAnimation, { props: { exercise: exercises.deadlift! } })
    expect(deadlift.findAll('polyline').length).toBeGreaterThan(4)
    expect(deadlift.find('.weight').exists()).toBe(true)
    expect(deadlift.attributes('aria-label')).toContain('Rumänisches Kreuzheben')

    const plank = mount(ExerciseAnimation, { props: { exercise: exercises.plank! } })
    expect(plank.find('.weight').exists()).toBe(false)
    expect(plank.find('.bench').exists()).toBe(false)
  })

  it('zeigt die Einheit mit Sätzen, Hinweisen und Umschalter für die Animation', async () => {
    const wrapper = mount(StrengthSession, { props: { workoutId: 40, phase: 'BASE' } })

    expect(wrapper.findAll('.exercise')).toHaveLength(4)
    expect(wrapper.text()).toContain('Kniebeuge (Goblet)')
    expect(wrapper.text()).toContain('3 × 8')
    expect(wrapper.text()).toContain('Grundlagenphase')

    await wrapper.find('button.link').trigger('click')
    expect(wrapper.text()).toContain('Animation: 2 Posen')
  })
})

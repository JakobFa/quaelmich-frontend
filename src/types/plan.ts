import type { Workout } from './workout'

export type Phase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY'

export const phaseLabels: Record<Phase, string> = {
  BASE: 'Grundlage',
  BUILD: 'Aufbau',
  PEAK: 'Spitze',
  TAPER: 'Tapering',
  RECOVERY: 'Erholung',
}

export type PlannedWorkout = {
  id: number
  date: string
  phase: Phase
  completed: boolean
  rating: number | null
  workout: Workout
}

export type TrainingPlan = {
  id: number
  startDate: string
  eventName: string
  eventDate: string
  workouts: PlannedWorkout[]
}

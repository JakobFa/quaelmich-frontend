import type { Athlete } from './types/athlete'
import type { PlannedWorkout, TrainingPlan } from './types/plan'
import type { Workout } from './types/workout'

const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`${message} (${status})`)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Content-Type nur mitschicken, wenn es auch einen Body gibt: bei einfachen GETs
  // spart das die zusätzliche CORS-Vorabfrage (OPTIONS) des Browsers.
  const headers = options.body ? { 'Content-Type': 'application/json' } : undefined
  const response = await fetch(baseUrl + path, { ...options, headers })
  if (!response.ok) {
    throw new ApiError(response.status, `${options.method ?? 'GET'} ${path} fehlgeschlagen`)
  }
  return response.json() as Promise<T>
}

export function getWorkouts() {
  return request<Workout[]>('/workouts')
}

export function getWorkout(id: number) {
  return request<Workout>(`/workouts/${id}`)
}

export function getAthlete(id: number) {
  return request<Athlete>(`/athletes/${id}`)
}

export function createAthlete(athlete: Athlete) {
  return request<Athlete>('/athletes', { method: 'POST', body: JSON.stringify(athlete) })
}

export function updateAthlete(id: number, athlete: Athlete) {
  return request<Athlete>(`/athletes/${id}`, { method: 'PUT', body: JSON.stringify(athlete) })
}

/** Liefert den Plan oder null, wenn für das Profil noch keiner erstellt wurde. */
export async function getPlan(athleteId: number): Promise<TrainingPlan | null> {
  try {
    return await request<TrainingPlan>(`/athletes/${athleteId}/plan`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export function generatePlan(athleteId: number) {
  return request<TrainingPlan>(`/athletes/${athleteId}/plan`, { method: 'POST' })
}

export function getPlannedWorkout(id: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}`)
}

export function updateProgress(id: number, completed: boolean, rating: number | null) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ completed, rating }),
  })
}

// Ohne Login merkt sich der Browser, welches Profil zu ihm gehört.
const ATHLETE_ID_KEY = 'quaelmich.athleteId'

export function getStoredAthleteId(): number | null {
  try {
    const value = localStorage.getItem(ATHLETE_ID_KEY)
    return value ? Number(value) : null
  } catch {
    return null
  }
}

export function storeAthleteId(id: number) {
  try {
    localStorage.setItem(ATHLETE_ID_KEY, String(id))
  } catch {
    // z. B. im privaten Modus nicht verfügbar – dann gilt das Profil nur für diese Sitzung
  }
}

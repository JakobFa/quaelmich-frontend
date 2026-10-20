import type { Athlete } from './types/athlete'
import type { Workout } from './types/workout'

const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} fehlgeschlagen (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function getWorkouts() {
  return request<Workout[]>('/workouts')
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

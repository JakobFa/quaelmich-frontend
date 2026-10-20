import { auth, endSession, startSession } from './auth'
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

/** Wird aufgerufen, wenn das Backend den Login nicht (mehr) akzeptiert – z. B. Token abgelaufen. */
let onUnauthorized: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

/** Länger als das Aufwachen des kostenlosen Render-Backends (bis ca. 1 Minute) */
const TIMEOUT_MS = 90_000

/** status 0 = keine Antwort (Server nicht erreichbar oder Zeitlimit überschritten) */
export const NO_RESPONSE = 0

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  // Content-Type nur mitschicken, wenn es auch einen Body gibt
  if (options.body) headers['Content-Type'] = 'application/json'
  if (auth.token.value) headers['Authorization'] = `Bearer ${auth.token.value}`

  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      ...options,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(NO_RESPONSE, `${options.method ?? 'GET'} ${path}: keine Antwort`)
  }
  if (response.status === 401 && auth.token.value) {
    endSession()
    onUnauthorized()
  }
  if (!response.ok) {
    throw new ApiError(response.status, `${options.method ?? 'GET'} ${path} fehlgeschlagen`)
  }
  return response
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await send(path, options)).json() as Promise<T>
}

/** Wie request, liefert aber null statt eines Fehlers, wenn es die Ressource (noch) nicht gibt. */
async function requestOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// ---------- Login ----------

type AuthResponse = { token: string; email: string }

export async function login(email: string, password: string) {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  startSession(result.token, result.email)
}

export async function register(email: string, password: string) {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  startSession(result.token, result.email)
}

// ---------- Workout-Bibliothek (öffentlich) ----------

export function getWorkouts() {
  return request<Workout[]>('/workouts')
}

export function getWorkout(id: number) {
  return request<Workout>(`/workouts/${id}`)
}

export function workoutFitUrl(workoutId: number) {
  return `${baseUrl}/workouts/${workoutId}/fit`
}

// ---------- Eigenes Profil und Plan ----------

export function getMyAthlete() {
  return requestOrNull<Athlete>('/me/athlete')
}

export function saveMyAthlete(athlete: Athlete) {
  return request<Athlete>('/me/athlete', { method: 'PUT', body: JSON.stringify(athlete) })
}

export function getPlan() {
  return requestOrNull<TrainingPlan>('/me/plan')
}

export function generatePlan() {
  return request<TrainingPlan>('/me/plan', { method: 'POST' })
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

/**
 * Lädt die .fit-Datei eines geplanten Workouts herunter. Ein einfacher Link reicht hier nicht,
 * weil der Download den Login-Token im Header braucht.
 */
export async function downloadPlannedWorkoutFit(id: number) {
  const response = await send(`/planned-workouts/${id}/fit`)
  const fileName =
    /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ??
    'workout.fit'
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// ---------- intervals.icu ----------

export type IntervalsStatus = {
  connected: boolean
  intervalsAthleteId: string | null
  connectedAt: string | null
}

export type IntervalsSyncResult = { uploaded: number; from: string; to: string }

export function getIntervalsStatus() {
  return request<IntervalsStatus>('/me/intervals')
}

/** Prüft den Schlüssel bei intervals.icu und speichert ihn verschlüsselt (422 = abgelehnt). */
export function connectIntervals(apiKey: string, athleteId: string) {
  return request<IntervalsStatus>('/me/intervals', {
    method: 'PUT',
    body: JSON.stringify({ apiKey, athleteId }),
  })
}

export async function disconnectIntervals() {
  await send('/me/intervals', { method: 'DELETE' })
}

export function syncToIntervals(days = 14) {
  return request<IntervalsSyncResult>(`/me/intervals/sync?days=${days}`, { method: 'POST' })
}

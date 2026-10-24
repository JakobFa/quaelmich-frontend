import { auth, endSession, startSession } from './auth'
import type { Athlete } from './types/athlete'
import type {
  PlannedWorkout,
  TrainingPlan,
  AdjustDirection,
  ExtraRide,
  SkipReason,
} from './types/plan'
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

export async function register(email: string, password: string, inviteCode = '') {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, inviteCode }),
  })
  startSession(result.token, result.email)
}

/** Braucht die Registrierung gerade einen Einladungscode? */
export function getRegistrationInfo() {
  return request<{ inviteRequired: boolean }>('/auth/registration')
}

/** "Passwort vergessen": verschickt einen Link, falls es das Konto gibt (Antwort ist immer gleich) */
export async function requestPasswordReset(email: string) {
  await send('/auth/password-reset', { method: 'POST', body: JSON.stringify({ email }) })
}

/** Neues Passwort mit dem Link aus der Mail setzen (400 = Link ungültig oder abgelaufen) */
export async function confirmPasswordReset(token: string, password: string) {
  await send('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
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

export type ProgressLevel = { number: number; name: string; fromXp: number }

export type Progress = {
  /** Erfahrungspunkte = gefahrene Trainingslast */
  xp: number
  level: ProgressLevel
  nextLevel: ProgressLevel | null
  /** Wochen in Folge mit mindestens 80 % erledigten Workouts */
  streakWeeks: number
  plan: {
    week: number
    totalWeeks: number
    completed: number
    due: number
    daysToEvent: number
    eventName: string
  } | null
}

export function getProgress() {
  return request<Progress>('/me/progress')
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

/** Workout für heute anpassen: leichter, härter, kürzer oder länger (409 = geht gerade nicht) */
export function adjustPlannedWorkout(id: number, direction: AdjustDirection) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/adjustment`, {
    method: 'PUT',
    body: JSON.stringify({ direction }),
  })
}

/** "Nicht gemacht" mit Grund (409 = es ist schon eine Fahrt zugeordnet) */
export function skipPlannedWorkout(id: number, reason: SkipReason) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/skip`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
}

export function undoSkipPlannedWorkout(id: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/skip`, { method: 'DELETE' })
}

/** Plan pausieren, beide Tage eingeschlossen (409 = Vergangenheit oder länger als 8 Wochen) */
export function pausePlan(from: string, until: string) {
  return request<TrainingPlan>('/me/plan/pause', {
    method: 'PUT',
    body: JSON.stringify({ from, until }),
  })
}

export function resumePlan() {
  return request<TrainingPlan>('/me/plan/pause', { method: 'DELETE' })
}

/** Heute ein anderes Workout aus der Bibliothek fahren (409 = geht gerade nicht) */
export function replacePlannedWorkout(id: number, workoutId: number, durationMinutes?: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/workout`, {
    method: 'PUT',
    body: JSON.stringify({ workoutId, durationMinutes }),
  })
}

/** Zurück zum ursprünglich geplanten Workout */
export function resetPlannedWorkout(id: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/adjustment`, { method: 'DELETE' })
}

/** Fahrten des Tages, die man diesem Workout selbst zuordnen kann */
export function getCandidateRides(id: number) {
  return request<ExtraRide[]>(`/planned-workouts/${id}/candidate-rides`)
}

/** "Diese Fahrt war das Training": hakt das Workout ab und übernimmt die Werte der Fahrt */
export function assignRide(id: number, extraRideId: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/activity`, {
    method: 'PUT',
    body: JSON.stringify({ extraRideId }),
  })
}

/** "War das das geplante Training?" – bei Nein zählt das Workout nicht mehr als erledigt */
export function confirmActivity(id: number, matchesPlan: boolean) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/activity-confirmation`, {
    method: 'PUT',
    body: JSON.stringify({ matchesPlan }),
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
  autoSync: boolean
  lastSyncedAt: string | null
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

export function setIntervalsAutoSync(autoSync: boolean) {
  return request<IntervalsStatus>('/me/intervals/settings', {
    method: 'PUT',
    body: JSON.stringify({ autoSync }),
  })
}

export async function disconnectIntervals() {
  await send('/me/intervals', { method: 'DELETE' })
}

export type ActivityImportResult = {
  activities: number
  matched: number
  extra: number
  adjusted: number
}

/** Gefahrene Einheiten der letzten 14 Tage aus intervals.icu und Strava abholen und dem Plan zuordnen */
export function importActivities() {
  return request<ActivityImportResult>('/me/activities/import', { method: 'POST' })
}

export type StravaStatus = {
  /** Ist Strava auf dem Server eingerichtet? */
  available: boolean
  clientId: string | null
  connected: boolean
  athleteName: string | null
  connectedAt: string | null
}

export function getStravaStatus() {
  return request<StravaStatus>('/me/strava')
}

/** Code aus dem Rücksprung von Strava ans Backend geben */
export function connectStrava(code: string, scope: string) {
  return request<StravaStatus>('/me/strava', {
    method: 'POST',
    body: JSON.stringify({ code, scope }),
  })
}

/** Werte aus dem Strava-Profil; null = dort nicht eingetragen */
export type StravaProfileSuggestion = {
  /** false = ohne Erlaubnis fürs Profil verbunden → neu verbinden */
  profileAccess: boolean
  ftp: number | null
  weightKg: number | null
  /** aus den Strava-Pulszonen zurückgerechnet oder höchster Puls der letzten 90 Tage */
  maxHeartRate: number | null
  maxHeartRateSource: 'ZONES' | 'ACTIVITIES' | null
  /** Beginn von Zone 2–5 laut Strava */
  heartRateZoneStarts?: number[] | null
  /** eigene Zonen bei Strava eingetragen (sonst Standardzonen aus dem Maximalpuls) */
  customZones?: boolean
}

export function getStravaProfile() {
  return request<StravaProfileSuggestion>('/me/strava/profile')
}

export async function disconnectStrava() {
  await send('/me/strava', { method: 'DELETE' })
}

export function syncToIntervals(days = 14) {
  return request<IntervalsSyncResult>(`/me/intervals/sync?days=${days}`, { method: 'POST' })
}

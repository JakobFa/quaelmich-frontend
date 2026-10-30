import { auth, endSession, startSession } from './auth'
import { setPowerZoneStarts } from './plan/zones'
import type { RampTestResult } from './plan/rampTest'
import type { Recording } from './trainer/recording'
import type { Athlete, WeeklyAvailability } from './types/athlete'
import type {
  PlannedWorkout,
  TrainingPlan,
  AdjustDirection,
  ExtraRide,
  IntervalAccuracy,
  MoreEvent,
  SkipReason,
} from './types/plan'
import { isCustomWorkout, type Workout } from './types/workout'

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

/** Bibliothek oder – bei eigenen IDs – das eigene Workout (braucht Login) */
export function getWorkout(id: number) {
  return request<Workout>(isCustomWorkout(id) ? `/me/workouts/${id}` : `/workouts/${id}`)
}

// ---------- Eigene Workouts ----------

export type WorkoutDraft = Pick<Workout, 'title' | 'description' | 'type' | 'steps'>

export function getMyWorkouts() {
  return request<Workout[]>('/me/workouts')
}

/** id null = neu anlegen (400 mit Text, z. B. "Höchstens 6 Stunden.") */
export function saveMyWorkout(id: number | null, draft: WorkoutDraft) {
  return request<Workout>(id === null ? '/me/workouts' : `/me/workouts/${id}`, {
    method: id === null ? 'POST' : 'PUT',
    body: JSON.stringify(draft),
  })
}

export async function deleteMyWorkout(id: number) {
  await send(`/me/workouts/${id}`, { method: 'DELETE' })
}

export function downloadMyWorkoutFit(id: number) {
  return downloadFit(`/me/workouts/${id}/fit`)
}

export function workoutFitUrl(workoutId: number) {
  return `${baseUrl}/workouts/${workoutId}/fit`
}

// ---------- Eigenes Profil und Plan ----------

/** Lädt das Profil und merkt sich dabei die eigenen Leistungszonen für Farben und Anzeige */
export async function getMyAthlete() {
  const athlete = await requestOrNull<Athlete>('/me/athlete')
  setPowerZoneStarts(athlete?.powerZoneStarts)
  return athlete
}

export async function saveMyAthlete(athlete: Athlete) {
  const saved = await request<Athlete>('/me/athlete', {
    method: 'PUT',
    body: JSON.stringify(athlete),
  })
  setPowerZoneStarts(saved.powerZoneStarts)
  return saved
}

/** Feedback aus der Beta (429 = zu viel auf einmal) */
export async function sendFeedback(message: string, page: string) {
  await send('/me/feedback', { method: 'POST', body: JSON.stringify({ message, page }) })
}

/** Hinweis "FTP wahrscheinlich zu niedrig" ausblenden */
export function dismissFtpSuggestion() {
  return request<Athlete>('/me/athlete/ftp-suggestion', { method: 'DELETE' })
}

// ---------- Weitere Events ----------

export function getMoreEvents() {
  return request<MoreEvent[]>('/me/events')
}

/** id null = neu (409 = an dem Tag ist schon ein Event) */
export function saveMoreEvent(id: number | null, event: MoreEvent) {
  return request<MoreEvent>(id === null ? '/me/events' : `/me/events/${id}`, {
    method: id === null ? 'POST' : 'PUT',
    body: JSON.stringify(event),
  })
}

export async function deleteMoreEvent(id: number) {
  await send(`/me/events/${id}`, { method: 'DELETE' })
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
    /** Ziel ohne Event: Nummer des 8-Wochen-Zyklus (week/totalWeeks gelten darin), sonst null */
    cycle?: number | null
  } | null
  /** Belastung der letzten 7 Tage im Vergleich zum Plan; null ohne Plan */
  load?: {
    plannedTss: number
    actualTss: number
    /** Wochenschnitt der letzten ~4 Wochen – daran wird "zu viel" gemessen */
    chronicTss: number
    status: 'TOO_LITTLE' | 'ON_TRACK' | 'A_BIT_MUCH' | 'TOO_MUCH' | 'RESTING'
  } | null
}

export function getProgress() {
  return request<Progress>('/me/progress')
}

/** Andere Zeit nur für eine Woche (monday = Montag als ISO-Datum); null = zurück zur normalen Zeit */
export function setWeekAvailability(monday: string, availability: WeeklyAvailability | null) {
  return request<TrainingPlan>(`/me/plan/weeks/${monday}/availability`, {
    method: availability ? 'PUT' : 'DELETE',
    body: availability ? JSON.stringify(availability) : undefined,
  })
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

/** "Überrasch mich": zufälliges anderes Workout, passend zur Zeit des Tages (409 = nichts Passendes) */
export function shufflePlannedWorkout(id: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/random`, { method: 'PUT' })
}

/** Zurück zum ursprünglich geplanten Workout */
export function resetPlannedWorkout(id: number) {
  return request<PlannedWorkout>(`/planned-workouts/${id}/adjustment`, { method: 'DELETE' })
}

/** Intervall-Genauigkeit; null, wenn nicht auswertbar (keine Intervalle, keine Watt-/Pulsdaten) */
export async function getIntervalAccuracy(id: number): Promise<IntervalAccuracy | null> {
  const response = await send(`/planned-workouts/${id}/accuracy`)
  return response.status === 204 ? null : ((await response.json()) as IntervalAccuracy)
}

/** Ergebnis des Rampentests aus der zugeordneten Fahrt; null, wenn es keiner war oder Watt fehlen */
export async function getRampTest(id: number): Promise<RampTestResult | null> {
  const response = await send(`/planned-workouts/${id}/ramp-test`)
  return response.status === 204 ? null : ((await response.json()) as RampTestResult)
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
// ---------- Konto ----------

/** Alle eigenen Daten als JSON-Datei herunterladen */
export function downloadMyData() {
  return downloadFit('/me/account/export')
}

/** Konto endgültig löschen (403 = Passwort falsch) */
export async function deleteMyAccount(password: string) {
  await send('/me/account/delete', { method: 'POST', body: JSON.stringify({ password }) })
}

export function downloadPlannedWorkoutFit(id: number) {
  return downloadFit(`/planned-workouts/${id}/fit`)
}

/** Mit dem Trainer aufgezeichnete Fahrt als .fit-Aktivität (zum Hochladen bei Strava/intervals.icu) */
export function downloadRecordingFit(recording: Recording, title: string) {
  return downloadFit('/me/recordings/fit', {
    method: 'POST',
    body: JSON.stringify({ ...recording, title }),
  })
}

/** Datei vom Backend herunterladen (Name aus Content-Disposition) */
async function downloadFit(path: string, options: RequestInit = {}) {
  const response = await send(path, options)
  const fileName =
    /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'download'
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
  /** hat Strava das Bearbeiten von Aktivitäten erlaubt? */
  canWriteActivities?: boolean
  /** Training in die Beschreibung bestätigter Fahrten schreiben */
  writeDescriptions?: boolean
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

/** Schalter fürs Schreiben in die Strava-Beschreibung (409 ohne Erlaubnis activity:write) */
export function setStravaDescriptions(enabled: boolean) {
  return request<StravaStatus>('/me/strava/descriptions', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export async function disconnectStrava() {
  await send('/me/strava', { method: 'DELETE' })
}

export function syncToIntervals(days = 14) {
  return request<IntervalsSyncResult>(`/me/intervals/sync?days=${days}`, { method: 'POST' })
}

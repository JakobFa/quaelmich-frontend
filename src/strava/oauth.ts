/**
 * Anmeldung bei Strava (OAuth): Wir leiten zu strava.com weiter, der Nutzer erlaubt den Zugriff,
 * Strava schickt ihn mit einem Code zu /strava/callback zurück. Den Code tauscht das Backend gegen Tokens.
 */
const STATE_KEY = 'quaelmich.strava.state'

/** activity:read_all, damit auch private Fahrten (z. B. Pendeln) ankommen */
export const STRAVA_SCOPE = 'activity:read_all'

export function stravaAuthorizeUrl(clientId: string, origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPE,
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

/** Merkt sich einen Zufallswert, damit nur unser eigener Rücksprung akzeptiert wird */
export function startStravaLogin(clientId: string) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  window.location.assign(stravaAuthorizeUrl(clientId, window.location.origin, state))
}

export function takeExpectedState(): string | null {
  const state = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return state
}

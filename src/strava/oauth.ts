/**
 * Anmeldung bei Strava (OAuth): Wir leiten zu strava.com weiter, der Nutzer erlaubt den Zugriff,
 * Strava schickt ihn mit einem Code zu /strava/callback zurück. Den Code tauscht das Backend gegen Tokens.
 */
const STATE_KEY = 'quaelmich.strava.state'

/**
 * activity:read_all, damit auch private Fahrten (z. B. Pendeln) ankommen;
 * profile:read_all für FTP, Gewicht und Pulszonen
 */
export const STRAVA_SCOPE = 'activity:read_all,profile:read_all'

/** Zusätzlich activity:write – nur, wenn quaelmich das Training in die Beschreibung schreiben soll */
export const STRAVA_WRITE_SCOPE = `${STRAVA_SCOPE},activity:write`

export function stravaAuthorizeUrl(
  clientId: string,
  origin: string,
  state: string,
  scope = STRAVA_SCOPE,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope,
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

/** Merkt sich einen Zufallswert, damit nur unser eigener Rücksprung akzeptiert wird */
export function startStravaLogin(clientId: string, scope = STRAVA_SCOPE) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  window.location.assign(stravaAuthorizeUrl(clientId, window.location.origin, state, scope))
}

export function takeExpectedState(): string | null {
  const state = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return state
}

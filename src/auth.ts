import { computed, ref } from 'vue'
import { setPowerZoneStarts } from './plan/zones'

/**
 * Anmeldezustand der App. Das Token (JWT) wird im Browser gespeichert,
 * damit man nach dem Neuladen angemeldet bleibt.
 */
const TOKEN_KEY = 'quaelmich.token'
const EMAIL_KEY = 'quaelmich.email'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // z. B. im privaten Modus – dann gilt der Login nur für diese Sitzung
  }
}

const token = ref<string | null>(read(TOKEN_KEY))
const email = ref<string | null>(read(EMAIL_KEY))

export const auth = {
  token,
  email,
  isLoggedIn: computed(() => token.value !== null),
}

export function startSession(newToken: string, userEmail: string) {
  token.value = newToken
  email.value = userEmail
  write(TOKEN_KEY, newToken)
  write(EMAIL_KEY, userEmail)
}

export function endSession() {
  setPowerZoneStarts(null)
  token.value = null
  email.value = null
  write(TOKEN_KEY, null)
  write(EMAIL_KEY, null)
}

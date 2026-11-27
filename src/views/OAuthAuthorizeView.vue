<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getAiMode, getOAuthClient, oauthConsent, type OAuthClientInfo } from '../api'

/**
 * Erlaubnis-Seite für KI-Apps (z. B. Claude): Die App hat den Nutzer hierher geschickt. Er sieht, wer was darf, und
 * erlaubt oder lehnt ab. Danach geht es zurück zur App.
 */
const route = useRoute()

const params = computed(() => ({
  clientId: String(route.query.client_id ?? ''),
  redirectUri: String(route.query.redirect_uri ?? ''),
  codeChallenge: String(route.query.code_challenge ?? ''),
  codeChallengeMethod: String(route.query.code_challenge_method ?? ''),
  scope: String(route.query.scope ?? '').trim() || 'plan:read plan:write',
  state: String(route.query.state ?? ''),
}))

const scopeLabels: Record<string, string> = {
  'plan:read': 'Deinen Trainingsplan lesen',
  'plan:write':
    'Deinen Plan und dein Profil ändern, auch dein sportliches Ziel (die KI-App fragt dich vorher)',
}

const scopes = computed(() => params.value.scope.split(/\s+/).filter(Boolean))
const knownScopes = computed(() => scopes.value.every((scope) => scope in scopeLabels))

const client = ref<OAuthClientInfo | null>(null)
/** KI-Modus in den Einstellungen an? Ohne ihn gibt es keine Erlaubnis */
const aiMode = ref(true)
const loading = ref(true)
const busy = ref(false)
const error = ref('')

const valid = computed(
  () =>
    !!params.value.clientId &&
    !!params.value.redirectUri &&
    !!params.value.codeChallenge &&
    params.value.codeChallengeMethod === 'S256' &&
    knownScopes.value &&
    client.value?.redirectUriRegistered === true,
)

onMounted(async () => {
  try {
    client.value = await getOAuthClient(params.value.clientId, params.value.redirectUri)
    aiMode.value = (await getAiMode()).enabled
  } catch {
    error.value = 'Diese Anfrage ist ungültig oder die KI-App ist unbekannt.'
  } finally {
    loading.value = false
  }
})

async function allow() {
  busy.value = true
  error.value = ''
  try {
    const { redirectUrl } = await oauthConsent(params.value)
    window.location.assign(redirectUrl)
  } catch {
    error.value = 'Das hat nicht geklappt. Bitte starte die Verbindung in der KI-App noch einmal.'
    busy.value = false
  }
}

function deny() {
  if (valid.value) {
    const target = new URL(params.value.redirectUri)
    target.searchParams.set('error', 'access_denied')
    if (params.value.state) target.searchParams.set('state', params.value.state)
    window.location.assign(target.toString())
  } else {
    window.location.assign('/plan')
  }
}
</script>

<template>
  <section class="panel authorize" aria-labelledby="authorize-title">
    <h1 id="authorize-title" class="panel-title">KI-App verbinden</h1>

    <p v-if="loading">Einen Moment ...</p>

    <template v-else-if="valid && client && !aiMode">
      <p class="lead" data-test="ai-mode-off">
        Der KI-Modus ist noch aus. Schalte ihn in den Einstellungen ein, dann kannst du
        <strong>{{ client.name }}</strong> verbinden.
      </p>
      <div class="actions">
        <RouterLink to="/einstellungen" class="button">Zu den Einstellungen</RouterLink>
        <button type="button" class="button button-ghost" @click="deny">Ablehnen</button>
      </div>
    </template>

    <template v-else-if="valid && client">
      <p class="lead">
        <strong>{{ client.name }}</strong> möchte auf deinen quaelmich-Account zugreifen.
      </p>
      <ul class="permissions" data-test="permissions">
        <li v-for="scope in scopes" :key="scope">{{ scopeLabels[scope] }}</li>
      </ul>
      <p class="hint">
        Nach deiner Erlaubnis leitet quaelmich dich zurück zu
        <strong data-test="host">{{ client.redirectHost }}</strong
        >. Die KI sieht nur deinen Plan, dein Profil und die Workout-Bibliothek, keine gefahrenen
        Fahrten, keine Strava-Daten und keine Freitexte. Wenn die KI Fahrten braucht, gibst du sie
        ihr selbst, zum Beispiel über den Strava-Konnektor in Claude. Du kannst die Verbindung
        jederzeit in den Einstellungen beenden.
      </p>
      <div class="actions">
        <button type="button" class="button" :disabled="busy" @click="allow">Erlauben</button>
        <button type="button" class="button button-ghost" :disabled="busy" @click="deny">
          Ablehnen
        </button>
      </div>
    </template>

    <template v-else>
      <p class="error" role="alert">
        {{ error || 'Diese Anfrage ist ungültig. Bitte starte die Verbindung in der KI-App neu.' }}
      </p>
      <button type="button" class="button button-ghost" @click="deny">Zurück zum Plan</button>
    </template>

    <p v-if="error && valid" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.authorize {
  max-width: 560px;
}

.lead {
  margin: 0 0 12px;
  font-size: 1.05rem;
}

.permissions {
  margin: 0 0 12px;
  padding-left: 20px;
}

.hint {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.error {
  color: var(--color-hot);
}
</style>

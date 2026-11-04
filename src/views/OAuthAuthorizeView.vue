<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getOAuthClient, oauthConsent, type OAuthClientInfo } from '../api'

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
  scope: String(route.query.scope ?? '').trim() || 'plan:read',
  state: String(route.query.state ?? ''),
}))

const scopeLabels: Record<string, string> = {
  'plan:read': 'Deinen Trainingsplan lesen',
  'plan:write': 'Deinen Plan ändern (jede Änderung wird geprüft)',
}

const scopes = computed(() => params.value.scope.split(/\s+/).filter(Boolean))
const knownScopes = computed(() => scopes.value.every((scope) => scope in scopeLabels))

const client = ref<OAuthClientInfo | null>(null)
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
        >. Die KI sieht nur deinen Plan, dein Profil und die Workout-Bibliothek, keine gefahrenen Fahrten, keine Strava-Daten und keine Freitexte. Du kannst die
        Verbindung jederzeit im Profil beenden.
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

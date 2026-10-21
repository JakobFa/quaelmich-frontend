<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { ApiError, confirmPasswordReset } from '../api'

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const passwordRepeat = ref('')
const showPassword = ref(false)
const saving = ref(false)
const done = ref(false)
const linkInvalid = ref(false)
const errorMessage = ref('')

const showMismatch = computed(
  () => passwordRepeat.value.length > 0 && password.value !== passwordRepeat.value,
)

async function submit() {
  if (password.value !== passwordRepeat.value) {
    errorMessage.value = 'Die beiden Passwörter stimmen nicht überein.'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    await confirmPasswordReset(token.value, password.value)
    done.value = true
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      linkInvalid.value = true
    } else if (error instanceof ApiError && error.status === 429) {
      errorMessage.value = 'Zu viele Versuche – bitte warte eine Weile.'
    } else {
      errorMessage.value = 'Das hat nicht geklappt. Bitte versuch es gleich nochmal.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow">
    <p class="kicker">// Neues Passwort</p>

    <div v-if="done" class="panel" role="status">
      <h2 class="panel-title">Geschafft</h2>
      <p>
        Dein neues Passwort ist gespeichert. Alte Anmeldungen auf anderen Geräten sind abgemeldet.
      </p>
      <RouterLink to="/login" class="button">Jetzt anmelden</RouterLink>
    </div>

    <div v-else-if="!token || linkInvalid" class="panel" role="alert">
      <h2 class="panel-title">Link ungültig</h2>
      <p>
        Dieser Link ist abgelaufen oder wurde schon benutzt. Links gelten 1 Stunde und nur einmal.
      </p>
      <RouterLink to="/passwort-vergessen" class="button">Neuen Link anfordern</RouterLink>
    </div>

    <form v-else class="panel" @submit.prevent="submit">
      <h2 class="panel-title">Neues Passwort setzen</h2>
      <label class="field">
        <span>Neues Passwort (mind. 8 Zeichen)</span>
        <span class="password-row">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="8"
            required
          />
          <button
            type="button"
            class="toggle"
            :aria-pressed="showPassword"
            :aria-label="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'verbergen' : 'anzeigen' }}
          </button>
        </span>
      </label>
      <label class="field">
        <span>Passwort wiederholen</span>
        <input
          v-model="passwordRepeat"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :aria-invalid="showMismatch"
          required
        />
        <small v-if="showMismatch" class="mismatch" role="status">
          Stimmt noch nicht mit dem ersten Passwort überein.
        </small>
      </label>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button type="submit" class="button" :disabled="saving">
        {{ saving ? 'Einen Moment …' : 'Passwort speichern' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.narrow {
  max-width: 440px;
}

.panel {
  margin-top: 12px;
}

.password-row {
  position: relative;
  display: block;
}

.password-row input {
  padding-right: 96px;
}

.toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  padding: 4px 6px;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.mismatch {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-hot);
}

.error {
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-hot);
}
</style>

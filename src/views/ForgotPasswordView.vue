<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { ApiError, requestPasswordReset } from '../api'

const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const sending = ref(false)
const sent = ref(false)
const errorMessage = ref('')

async function submit() {
  sending.value = true
  errorMessage.value = ''
  try {
    await requestPasswordReset(email.value)
    sent.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.status === 429
        ? 'Zu viele Anfragen – bitte warte eine Weile und versuch es dann nochmal.'
        : 'Das hat nicht geklappt. Bitte versuch es gleich nochmal.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="narrow">
    <p class="kicker">// Passwort vergessen</p>

    <div v-if="sent" class="panel" role="status">
      <h2 class="panel-title">Schau in dein Postfach</h2>
      <p>
        Falls es ein Konto mit <strong>{{ email }}</strong> gibt, haben wir dir einen Link
        geschickt. Er gilt <strong>1 Stunde</strong>.
      </p>
      <p class="hint">Nichts angekommen? Schau auch im Spam-Ordner nach.</p>
      <RouterLink to="/login" class="button button-ghost">Zur Anmeldung</RouterLink>
    </div>

    <form v-else class="panel" @submit.prevent="submit">
      <h2 class="panel-title">Neues Passwort anfordern</h2>
      <p class="hint">
        Gib deine E-Mail ein – wir schicken dir einen Link, mit dem du ein neues Passwort setzt.
      </p>
      <label class="field">
        <span>E-Mail</span>
        <input v-model.trim="email" type="email" autocomplete="email" required />
      </label>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <div class="actions">
        <button type="submit" class="button" :disabled="sending">
          {{ sending ? 'Einen Moment …' : 'Link schicken' }}
        </button>
        <RouterLink to="/login" class="link">Zurück zur Anmeldung</RouterLink>
      </div>
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

.hint {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.error {
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-hot);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.link {
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
</style>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError, login, NO_RESPONSE, register } from '../api'

const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>(route.query.mode === 'register' ? 'register' : 'login')
const email = ref('')
/** nur bei der Registrierung: E-Mail ein zweites Mal, damit Tippfehler auffallen */
const emailRepeat = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

// Hinweis, falls das kostenlose Backend erst aufwachen muss
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(slowTimer))

const isRegister = computed(() => mode.value === 'register')

/** Groß-/Kleinschreibung zählt bei E-Mail-Adressen nicht */
const emailsMatch = computed(
  () => email.value.trim().toLowerCase() === emailRepeat.value.trim().toLowerCase(),
)
/** Hinweis erst zeigen, wenn im zweiten Feld schon etwas steht */
const showMismatch = computed(
  () => isRegister.value && emailRepeat.value.length > 0 && !emailsMatch.value,
)

function switchMode() {
  mode.value = isRegister.value ? 'login' : 'register'
  errorMessage.value = ''
}

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError) || error.status === NO_RESPONSE)
    return 'Der Server antwortet gerade nicht. Bitte versuch es gleich nochmal.'
  if (error.status === 401) return 'E-Mail oder Passwort stimmt nicht.'
  if (error.status === 409) return 'Mit dieser E-Mail gibt es schon ein Konto – melde dich an.'
  if (error.status === 400)
    return 'Bitte gib eine gültige E-Mail und ein Passwort mit mindestens 8 Zeichen ein.'
  return 'Das hat nicht geklappt. Bitte versuch es nochmal.'
}

async function submit() {
  if (isRegister.value && !emailsMatch.value) {
    errorMessage.value = 'Die beiden E-Mail-Adressen stimmen nicht überein.'
    return
  }
  submitting.value = true
  errorMessage.value = ''
  slowTimer = setTimeout(() => (slow.value = true), 3000)
  try {
    if (isRegister.value) {
      await register(email.value, password.value)
    } else {
      await login(email.value, password.value)
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.push(redirect ?? (isRegister.value ? '/onboarding' : '/plan'))
  } catch (error) {
    errorMessage.value = messageFor(error)
  } finally {
    clearTimeout(slowTimer)
    slow.value = false
    submitting.value = false
  }
}
</script>

<template>
  <section class="login">
    <p class="kicker">// {{ isRegister ? 'Konto erstellen' : 'Anmelden' }}</p>

    <form class="panel" @submit.prevent="submit">
      <h2 class="panel-title">{{ isRegister ? 'Neu bei quaelmich?' : 'Willkommen zurück' }}</h2>

      <label class="field">
        <span>E-Mail</span>
        <input v-model.trim="email" type="email" autocomplete="email" required />
      </label>

      <label v-if="isRegister" class="field">
        <span>E-Mail wiederholen</span>
        <input
          v-model.trim="emailRepeat"
          type="email"
          autocomplete="off"
          :aria-invalid="showMismatch"
          required
        />
        <small v-if="showMismatch" class="mismatch" role="status">
          Stimmt noch nicht mit der ersten Adresse überein.
        </small>
      </label>

      <label class="field">
        <span>Passwort{{ isRegister ? ' (mind. 8 Zeichen)' : '' }}</span>
        <input
          v-model="password"
          type="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          :minlength="isRegister ? 8 : undefined"
          required
        />
      </label>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <p v-if="slow" class="slow" role="status">
        Das Backend wacht gerade auf – das kann bis zu einer Minute dauern.
      </p>

      <div class="actions">
        <button type="submit" class="button" :disabled="submitting">
          {{ submitting ? 'Einen Moment …' : isRegister ? 'Konto erstellen' : 'Anmelden' }}
        </button>
        <button type="button" class="link" @click="switchMode">
          {{ isRegister ? 'Schon ein Konto? Anmelden' : 'Noch kein Konto? Registrieren' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.login {
  max-width: 440px;
}

.panel {
  margin-top: 12px;
}

.error {
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-hot);
}

.mismatch {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-hot);
}

.slow {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}
</style>

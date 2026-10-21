<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError, connectStrava } from '../api'
import LoadingNotice from '../components/LoadingNotice.vue'
import { takeExpectedState } from '../strava/oauth'

const route = useRoute()
const router = useRouter()
const errorMessage = ref('')

function param(name: string): string {
  const value = route.query[name]
  return typeof value === 'string' ? value : ''
}

onMounted(async () => {
  const expectedState = takeExpectedState()
  if (param('error')) {
    errorMessage.value = 'Du hast den Zugriff bei Strava nicht erlaubt.'
    return
  }
  if (!expectedState || param('state') !== expectedState) {
    errorMessage.value = 'Die Anmeldung bei Strava ist abgelaufen. Bitte starte sie nochmal im Profil.'
    return
  }
  if (!param('scope').includes('activity:read')) {
    errorMessage.value =
      'Ohne die Erlaubnis „Aktivitäten ansehen“ kann quaelmich deine Fahrten nicht übernehmen.'
    return
  }
  try {
    await connectStrava(param('code'))
    router.replace({ name: 'profile' })
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.status === 422
        ? 'Strava hat die Verbindung abgelehnt – vielleicht sind schon 10 Personen verbunden.'
        : 'Verbinden hat nicht geklappt. Bitte versuch es später nochmal.'
  }
})
</script>

<template>
  <section>
    <p class="kicker">// Strava</p>
    <LoadingNotice v-if="!errorMessage" label="Verbinde mit Strava …" />
    <div v-else class="panel" role="alert">
      <p class="error">{{ errorMessage }}</p>
      <RouterLink to="/profil" class="button button-ghost">Zurück zum Profil</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.error {
  margin: 0 0 16px;
  color: var(--color-hot);
}
</style>

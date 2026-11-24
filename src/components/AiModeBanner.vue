<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { getAiMode } from '../api'

/** Im KI-Modus passt quaelmich den Plan nicht mehr von selbst an – das soll man im Plan sehen */
const enabled = ref(false)

onMounted(async () => {
  try {
    enabled.value = (await getAiMode()).enabled
  } catch {
    enabled.value = false // KI-Modus gibt es nicht oder ist nicht erreichbar: dann kein Hinweis
  }
})
</script>

<template>
  <p v-if="enabled" class="panel hint" role="status" data-test="ai-mode-banner">
    <strong>KI-Modus an:</strong> Dein Plan passt sich nicht mehr von selbst an deine Fahrten an. Änderungen kommen von
    dir oder deiner KI.
    <RouterLink to="/profil">Im Profil ausschalten</RouterLink>
  </p>
</template>

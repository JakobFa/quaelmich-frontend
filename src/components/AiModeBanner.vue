<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { getAiMode } from '../api'

/**
 * Im KI-Modus passt quaelmich den Plan nicht mehr von selbst an. Wer ihn eingeschaltet hat, weiß das –
 * darum nur ein kleines Zeichen; die Erklärung klappt erst beim Antippen auf.
 */
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
  <details v-if="enabled" class="ai-mode" data-test="ai-mode-banner">
    <summary role="status" title="Was heißt das?">✦ KI-Modus an</summary>
    <p class="explain">
      Dein Plan passt sich nicht mehr von selbst an deine Fahrten an. Änderungen kommen von dir oder
      deiner KI.
      <RouterLink to="/einstellungen#ki-modus">In den Einstellungen ausschalten</RouterLink>
    </p>
  </details>
</template>

<style scoped>
.ai-mode {
  position: relative;
}

summary {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid var(--color-lilac);
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

summary::-webkit-details-marker {
  display: none;
}

.ai-mode[open] summary {
  background: var(--color-lilac);
  color: var(--color-ink);
}

.explain {
  position: absolute;
  z-index: 5;
  right: 0;
  top: calc(100% + 6px);
  width: min(320px, 80vw);
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--color-lilac);
  background: var(--color-panel);
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.explain a {
  display: block;
  margin-top: 6px;
  color: var(--color-lilac);
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{ label: string }>()

// Nach ein paar Sekunden erklären, warum es dauert (kostenloser Render-Plan schläft ein)
const SLOW_AFTER_MS = 3000
const slow = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => (slow.value = true), SLOW_AFTER_MS)
})

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <div>
      <p class="label">{{ label }}</p>
      <p v-if="slow" class="slow">
        Das Backend wacht gerade auf – das kann bis zu einer Minute dauern.
      </p>
    </div>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px 20px;
  background: var(--color-panel);
  border-left: 5px solid var(--color-lilac-dim);
}

.label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.slow {
  margin: 6px 0 0;
  color: var(--color-text-muted);
}

/* rotierende Kurbel-Andeutung */
.spinner {
  flex: none;
  width: 18px;
  height: 18px;
  border: 3px solid var(--color-panel-raised);
  border-top-color: var(--color-lilac);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 3s;
  }
}
</style>

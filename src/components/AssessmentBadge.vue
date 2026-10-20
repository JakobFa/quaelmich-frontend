<script setup lang="ts">
import { assessmentLabels, type Assessment } from '../types/plan'

defineProps<{ assessment: Assessment }>()
</script>

<template>
  <span class="badge" :class="assessment.toLowerCase()">{{ assessmentLabels[assessment] }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  max-width: 100%;
}

.badge.as_planned {
  color: var(--color-ink);
  background: #7ee08a;
}

.badge.harder {
  color: var(--color-ink);
  background: var(--color-hot);
}

.badge.much_harder {
  color: var(--color-text);
  background: var(--color-hot);
  box-shadow: 3px 3px 0 var(--color-lilac);
}

.badge.easier {
  color: var(--color-text-muted);
  border: 1px dashed var(--color-text-muted);
}
</style>

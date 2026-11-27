<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Ein Bereich der Einstellungen zum Aufklappen: zu sieht man nur Titel und eine Zeile, worum es geht.
 * Mit /einstellungen#<id> öffnet er sich direkt (z. B. aus dem KI-Hinweis im Plan).
 */
const props = defineProps<{ id: string; title: string; summary: string }>()

const route = useRoute()
const open = ref(false)
const root = ref<HTMLDetailsElement | null>(null)

onMounted(() => {
  if (route?.hash === `#${props.id}`) {
    open.value = true
    root.value?.scrollIntoView?.({ block: 'start' })
  }
})
</script>

<template>
  <details
    :id="id"
    ref="root"
    class="panel settings-section"
    :open="open"
    @toggle="open = ($event.target as HTMLDetailsElement).open"
  >
    <summary>
      <span class="head">
        <span class="title"
          ><slot name="title">{{ title }}</slot></span
        >
        <span class="summary">{{ summary }}</span>
      </span>
      <span class="toggle" aria-hidden="true">{{ open ? '–' : '+' }}</span>
    </summary>
    <div class="body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.settings-section {
  padding: 0;
}

summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.head {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.title {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  text-transform: uppercase;
}

.summary {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.toggle {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-lilac);
}

.body {
  padding: 0 20px 20px;
}

/* Die Bereiche bringen ihre eigene Kachel mit Titel mit – hier steckt sie schon in einer */
.body :deep(> .panel) {
  padding: 0;
  background: none;
  border-left: 0;
  clip-path: none;
}

.body :deep(> .panel > .panel-title:first-child) {
  display: none;
}
</style>

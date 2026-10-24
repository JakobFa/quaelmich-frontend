<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'

import { ApiError, sendFeedback } from '../api'

/** Feedback aus der Beta: unten rechts, ein Feld, abschicken – landet beim Betreiber */
const route = useRoute()
const open = ref(false)
const message = ref('')
const sending = ref(false)
const sent = ref(false)
const error = ref('')
const field = ref<HTMLTextAreaElement | null>(null)

const MAX = 2000

async function toggle() {
  open.value = !open.value
  sent.value = false
  error.value = ''
  if (open.value) {
    await nextTick()
    field.value?.focus()
  }
}

async function submit() {
  if (!message.value.trim()) return
  sending.value = true
  error.value = ''
  try {
    await sendFeedback(message.value, route.fullPath)
    message.value = ''
    sent.value = true
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 429
        ? 'Das war gerade viel Feedback – versuch es später nochmal.'
        : 'Senden hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="feedback">
    <div v-if="open" class="panel sheet" role="dialog" aria-label="Feedback">
      <template v-if="sent">
        <p class="title">Danke! 🙌</p>
        <p class="hint">Dein Feedback ist angekommen.</p>
        <div class="actions">
          <button type="button" class="button button-ghost" @click="sent = false">
            Noch etwas
          </button>
          <button type="button" class="link" @click="open = false">Schließen</button>
        </div>
      </template>
      <form v-else @submit.prevent="submit">
        <label for="feedback-message" class="title">Feedback zur Beta</label>
        <p class="hint">
          Was ist komisch, kaputt oder fehlt dir? Die Seite, auf der du gerade bist, wird
          mitgeschickt.
        </p>
        <textarea
          id="feedback-message"
          ref="field"
          v-model="message"
          rows="5"
          :maxlength="MAX"
          placeholder="z. B. Der Sonntag im Plan wirkt zu hart, weil …"
          required
        ></textarea>
        <p class="count">{{ message.length }} / {{ MAX }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="actions">
          <button type="submit" class="button" :disabled="sending || !message.trim()">
            {{ sending ? 'Sendet …' : 'Senden' }}
          </button>
          <button type="button" class="link" @click="open = false">Abbrechen</button>
        </div>
      </form>
    </div>
    <button type="button" class="toggle" :aria-expanded="open" @click="toggle">
      {{ open ? '× Feedback' : '✎ Feedback' }}
    </button>
  </div>
</template>

<style scoped>
.feedback {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: calc(100vw - 32px);
}

.toggle {
  padding: 8px 14px;
  border: 2px solid var(--color-hot);
  background: var(--color-ink);
  color: var(--color-hot);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 3px 3px 0 var(--color-plum);
  cursor: pointer;
}

.toggle:hover {
  background: var(--color-hot);
  color: var(--color-ink);
}

.sheet {
  width: min(360px, calc(100vw - 32px));
  margin: 0;
  border-left-color: var(--color-hot);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.title {
  display: block;
  margin: 0 0 4px;
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-hot);
}

.hint {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

textarea {
  display: block;
  width: 100%;
  padding: 8px;
  border: 2px solid var(--color-panel-raised);
  background: var(--color-ink);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
}

textarea:focus {
  border-color: var(--color-lilac);
  outline: none;
}

.count {
  margin: 4px 0 8px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-align: right;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.error {
  margin: 0 0 8px;
  color: var(--color-hot);
}
</style>

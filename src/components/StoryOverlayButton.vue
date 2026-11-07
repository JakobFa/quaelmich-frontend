<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import {
  overlayFilename,
  renderOverlayBlob,
  shareOverlay,
  type OverlayData,
  type OverlayVariant,
} from '../plan/storyOverlay'

const props = defineProps<{ data: OverlayData }>()

const open = ref(false)
/** Profil des Trainings (wie bisher) oder Soll gegen Ist, wenn die Fahrt ausgewertet ist */
const variant = ref<OverlayVariant>('profile')
const busy = ref(false)
const error = ref('')
const message = ref('')
const previewUrl = ref('')
let blob: Blob | null = null

function revoke() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function show() {
  open.value = true
  if (!props.data.ride) variant.value = 'profile'
  await render()
}

async function choose(next: OverlayVariant) {
  if (variant.value === next || busy.value) return
  variant.value = next
  await render()
}

async function render() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    blob = await renderOverlayBlob(props.data, variant.value)
    revoke()
    previewUrl.value = URL.createObjectURL(blob)
  } catch {
    error.value = 'Das Overlay konnte nicht erstellt werden.'
  } finally {
    busy.value = false
  }
}

async function share() {
  if (!blob) return
  const result = await shareOverlay(blob, overlayFilename(props.data))
  message.value =
    result === 'downloaded'
      ? 'Gespeichert. In der Instagram-Story als Sticker über dein Foto legen.'
      : ''
}

function close() {
  open.value = false
  revoke()
  blob = null
}

onBeforeUnmount(revoke)
</script>

<template>
  <div class="story">
    <button type="button" class="open" @click="show">Story-Overlay</button>

    <div v-if="open" class="backdrop" @click.self="close">
      <div class="dialog" role="dialog" aria-label="Story-Overlay">
        <p class="kicker">Instagram-Story</p>
        <div v-if="data.ride" class="variants" role="group" aria-label="Variante">
          <button
            type="button"
            :class="{ active: variant === 'profile' }"
            :aria-pressed="variant === 'profile'"
            @click="choose('profile')"
          >
            Profil
          </button>
          <button
            type="button"
            :class="{ active: variant === 'actual' }"
            :aria-pressed="variant === 'actual'"
            @click="choose('actual')"
          >
            Soll &amp; Ist
          </button>
        </div>
        <p v-if="busy && !previewUrl" class="hint">Wird erstellt …</p>
        <p v-else-if="error" class="error" role="alert">{{ error }}</p>
        <div v-else class="preview" :aria-busy="busy">
          <img :src="previewUrl" alt="Vorschau des Overlays" />
        </div>
        <p class="hint">
          Durchsichtiges PNG: In der Story als Foto-Sticker über dein Bild legen.
        </p>
        <p v-if="message" class="message" role="status">{{ message }}</p>
        <div class="actions">
          <button type="button" class="primary" :disabled="busy || !!error" @click="share">
            Teilen / Speichern
          </button>
          <button type="button" class="secondary" @click="close">Schließen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.open {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-ink);
  background: var(--color-lilac);
  border: 0;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.open:hover {
  background: var(--color-hot);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(10, 11, 10, 0.8);
}

.dialog {
  width: min(26rem, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 1.1rem;
  background: var(--color-panel);
  border: 1px solid var(--color-plum);
}

.variants {
  display: flex;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
}

.variants button {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.45rem 0.5rem;
  cursor: pointer;
  color: var(--color-lilac);
  background: transparent;
  border: 1px solid var(--color-lilac);
}

.variants button.active {
  color: var(--color-ink);
  background: var(--color-lilac);
}

.preview {
  /* Schachbrett zeigt, dass der Hintergrund durchsichtig ist */
  background:
    repeating-conic-gradient(#3a423f 0% 25%, #2a312e 0% 50%) 50% / 24px 24px;
  aspect-ratio: 9 / 16;
  max-height: 60vh;
  margin: 0.6rem auto;
}

.preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hint {
  margin: 0.4rem 0;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-hot);
}

.message {
  color: var(--color-lilac);
}

.actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.primary,
.secondary {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.7rem 0.5rem;
  cursor: pointer;
  border: 1px solid var(--color-lilac);
}

.primary {
  background: var(--color-hot);
  color: var(--color-ink);
  border-color: var(--color-hot);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary {
  background: transparent;
  color: var(--color-lilac);
}
</style>

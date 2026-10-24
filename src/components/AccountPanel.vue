<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError, deleteMyAccount, downloadMyData } from '../api'
import { endSession } from '../auth'

/** Daten herunterladen und Konto löschen (DSGVO) */
const router = useRouter()
const downloading = ref(false)
const downloadFailed = ref(false)
const confirmOpen = ref(false)
const password = ref('')
const deleting = ref(false)
const deleteError = ref('')

async function download() {
  downloading.value = true
  downloadFailed.value = false
  try {
    await downloadMyData()
  } catch {
    downloadFailed.value = true
  } finally {
    downloading.value = false
  }
}

async function remove() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteMyAccount(password.value)
    endSession()
    await router.push({ name: 'home', query: { geloescht: '1' } })
  } catch (error) {
    deleteError.value =
      error instanceof ApiError && error.status === 403
        ? 'Das Passwort stimmt nicht.'
        : 'Löschen hat nicht geklappt. Bitte versuch es nochmal.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="panel account">
    <h2 class="panel-title">Konto &amp; Daten</h2>
    <p class="hint">
      Alles, was quaelmich über dich gespeichert hat – Profil, Plan, Fahrten, eigene Workouts,
      Feedback – als Datei.
    </p>
    <button type="button" class="button button-ghost" :disabled="downloading" @click="download">
      {{ downloading ? 'Lädt …' : 'Meine Daten herunterladen' }}
    </button>
    <p v-if="downloadFailed" class="error" role="alert">Download hat nicht geklappt.</p>

    <div class="danger">
      <button
        v-if="!confirmOpen"
        type="button"
        class="link"
        @click="((confirmOpen = true), (password = ''))"
      >
        Konto löschen …
      </button>
      <form v-else @submit.prevent="remove">
        <p class="warning">
          <strong>Endgültig:</strong> Konto, Profil, Plan, Fahrten, eigene Workouts und Feedback
          werden gelöscht, die Verbindung zu Strava und intervals.icu wird getrennt. Das lässt sich
          nicht rückgängig machen.
        </p>
        <label class="field">
          <span>Zur Bestätigung dein Passwort</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <div class="actions">
          <button type="submit" class="button danger-button" :disabled="deleting || !password">
            {{ deleting ? 'Löscht …' : 'Konto endgültig löschen' }}
          </button>
          <button type="button" class="link" @click="confirmOpen = false">Abbrechen</button>
        </div>
        <p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.danger {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-panel-raised);
}

.warning {
  margin: 0 0 12px;
  font-size: 0.9rem;
}

.warning strong {
  color: var(--color-hot);
}

.field {
  display: grid;
  gap: 4px;
  max-width: 320px;
  margin-bottom: 12px;
}

.field span {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.danger-button {
  border-color: var(--color-hot);
  background: var(--color-hot);
  color: var(--color-ink);
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
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

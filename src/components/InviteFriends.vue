<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  ApiError,
  createInvitation,
  getInvitations,
  revokeInvitation,
  type Invitation,
} from '../api'

const invitations = ref<Invitation[]>([])
/** gerade erstellter Code – nur jetzt sichtbar */
const fresh = ref<Invitation | null>(null)
const busy = ref(false)
const errorMessage = ref('')
const copied = ref(false)

const statusLabels: Record<Invitation['status'], string> = {
  OPEN: 'offen',
  USED: '✓ benutzt',
  EXPIRED: 'abgelaufen',
  REVOKED: 'zurückgezogen',
}

const inviteLink = computed(() =>
  fresh.value?.code
    ? `${window.location.origin}/login?mode=register&code=${encodeURIComponent(fresh.value.code)}`
    : '',
)

async function load() {
  try {
    invitations.value = await getInvitations()
  } catch {
    errorMessage.value = 'Einladungen konnten nicht geladen werden.'
  }
}
onMounted(load)

async function create() {
  busy.value = true
  errorMessage.value = ''
  copied.value = false
  try {
    fresh.value = await createInvitation()
    await load()
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.status === 409
        ? 'Du hast schon 3 offene Codes – zieh einen zurück oder warte, bis einer benutzt wird.'
        : 'Code erstellen hat nicht geklappt.'
  } finally {
    busy.value = false
  }
}

async function revoke(invitation: Invitation) {
  busy.value = true
  try {
    await revokeInvitation(invitation.id)
    if (fresh.value?.id === invitation.id) fresh.value = null
    await load()
  } catch {
    errorMessage.value = 'Zurückziehen hat nicht geklappt.'
  } finally {
    busy.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
  } catch {
    copied.value = false // ohne Zwischenablage: Link markieren und selbst kopieren
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <div class="panel">
    <h2 class="panel-title">Freunde einladen</h2>
    <p class="hint">
      Jeder Code funktioniert genau einmal und 14 Tage lang. Du kannst bis zu 3 offene Codes haben.
    </p>

    <div v-if="fresh?.code" class="fresh" role="status">
      <p class="code">{{ fresh.code }}</p>
      <p class="hint">Schick diesen Link – der Code ist schon eingetragen:</p>
      <input
        class="link-field"
        type="text"
        :value="inviteLink"
        readonly
        @focus="($event.target as HTMLInputElement).select()"
      />
      <button type="button" class="button button-ghost" @click="copyLink">
        {{ copied ? '✓ Kopiert' : 'Link kopieren' }}
      </button>
      <p class="hint small">Merk ihn dir jetzt – quaelmich speichert den Code nicht im Klartext.</p>
    </div>

    <button type="button" class="button" :disabled="busy" @click="create">
      Einladungscode erstellen
    </button>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <ul v-if="invitations.length" class="list">
      <li
        v-for="invitation in invitations"
        :key="invitation.id"
        :class="invitation.status.toLowerCase()"
      >
        <span class="mono">…{{ invitation.lastChars }}</span>
        <span>{{ statusLabels[invitation.status] }}</span>
        <span class="muted">
          {{
            invitation.status === 'OPEN'
              ? `bis ${formatDate(invitation.expiresAt)}`
              : `erstellt ${formatDate(invitation.createdAt)}`
          }}
        </span>
        <button
          v-if="invitation.status === 'OPEN'"
          type="button"
          class="revoke"
          :disabled="busy"
          @click="revoke(invitation)"
        >
          zurückziehen
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.hint.small {
  margin: 8px 0 0;
  font-size: 0.8rem;
}

.fresh {
  margin: 0 0 16px;
  padding: 12px;
  border: 2px dashed var(--color-hot);
}

.code {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-hot);
}

.link-field {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  font-size: 0.8rem;
}

.list {
  display: grid;
  gap: 6px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
}

.mono {
  font-family: var(--font-mono);
}

.muted,
.list li.expired,
.list li.revoked {
  color: var(--color-text-muted);
}

.list li.used {
  color: var(--color-lilac);
}

.revoke {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-decoration: underline;
  cursor: pointer;
}

.error {
  margin: 12px 0 0;
  color: var(--color-hot);
}
</style>

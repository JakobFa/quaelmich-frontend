<script setup lang="ts">
import { computed } from 'vue'

import {
  trainer as defaultTrainer,
  type DeviceStatus,
  type TrainerConnection,
} from '../trainer/connection'

/** Trainer und Pulsgurt per Bluetooth verbinden – nur in Chrome/Edge, dort wo es Web Bluetooth gibt */
const props = defineProps<{ connection?: TrainerConnection }>()
const trainer = props.connection ?? defaultTrainer
const state = trainer.state

const supported = trainer.isSupported()

const statusLabels: Record<DeviceStatus, string> = {
  none: '',
  connecting: 'verbindet …',
  connected: 'verbunden',
  reconnecting: 'Verbindung weg – versucht es neu …',
  lost: 'Verbindung verloren',
}

const trainerHint = computed(() => {
  if (state.trainerStatus !== 'connected') return ''
  return state.trainerKind === 'SMART'
    ? 'ERG: Der Trainer stellt die Watt selbst ein.'
    : 'Nur Messen: Dieser Trainer lässt sich nicht steuern – fahr nach Anzeige.'
})

const busy = (status: DeviceStatus) => status === 'connecting' || status === 'reconnecting'
</script>

<template>
  <div class="trainer-panel">
    <p v-if="!supported" class="unsupported">
      Trainer per Bluetooth verbinden geht in <strong>Chrome</strong> oder <strong>Edge</strong> am
      Computer oder auf Android. Auf dem iPhone kann das Safari nicht – dort geht es nur mit der App
      „Bluefy“.
    </p>

    <template v-else>
      <div class="device">
        <span class="device-label">🚲 Trainer</span>
        <template v-if="state.trainerStatus === 'none'">
          <button type="button" class="link" @click="trainer.connectTrainer()">verbinden</button>
        </template>
        <template v-else>
          <span class="device-name">{{ state.trainerName }}</span>
          <span class="status" :class="state.trainerStatus">{{
            statusLabels[state.trainerStatus]
          }}</span>
          <button
            v-if="state.trainerStatus === 'lost'"
            type="button"
            class="link"
            @click="trainer.connectTrainer()"
          >
            neu verbinden
          </button>
          <button
            v-else-if="!busy(state.trainerStatus)"
            type="button"
            class="link muted"
            @click="trainer.disconnectTrainer()"
          >
            trennen
          </button>
        </template>
      </div>

      <div class="device">
        <span class="device-label">❤ Pulsgurt</span>
        <template v-if="state.heartRateStatus === 'none'">
          <button type="button" class="link" @click="trainer.connectHeartRate()">verbinden</button>
        </template>
        <template v-else>
          <span class="device-name">{{ state.heartRateName }}</span>
          <span class="status" :class="state.heartRateStatus">{{
            statusLabels[state.heartRateStatus]
          }}</span>
          <button
            v-if="state.heartRateStatus === 'lost'"
            type="button"
            class="link"
            @click="trainer.connectHeartRate()"
          >
            neu verbinden
          </button>
          <button
            v-else-if="!busy(state.heartRateStatus)"
            type="button"
            class="link muted"
            @click="trainer.disconnectHeartRate()"
          >
            trennen
          </button>
        </template>
      </div>

      <p v-if="trainerHint" class="hint">{{ trainerHint }}</p>
      <p v-if="state.error" class="error" role="alert">{{ state.error }}</p>
    </template>
  </div>
</template>

<style scoped>
.trainer-panel {
  margin-top: 16px;
  padding: 12px;
  border: 2px dashed var(--color-panel-raised);
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.device {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 4px 0;
}

.device-label {
  min-width: 7.5em;
  color: var(--color-text-muted);
}

.device-name {
  font-weight: 700;
}

.status.connected {
  color: #35b86b;
}

.status.connecting,
.status.reconnecting {
  color: #f4c430;
}

.status.lost {
  color: var(--color-hot);
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-lilac);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.link.muted {
  color: var(--color-text-muted);
}

.hint,
.unsupported {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.unsupported {
  margin: 0;
}

.error {
  margin: 8px 0 0;
  color: var(--color-hot);
}
</style>

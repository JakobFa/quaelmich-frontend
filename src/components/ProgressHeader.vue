<script setup lang="ts">
import { computed } from 'vue'

import type { Progress } from '../api'

const props = defineProps<{ progress: Progress }>()

/** Anteil am Weg zum nächsten Level in Prozent */
const levelPercent = computed(() => {
  const { xp, level, nextLevel } = props.progress
  if (!nextLevel) return 100
  return Math.round(((xp - level.fromXp) / (nextLevel.fromXp - level.fromXp)) * 100)
})

const completionPercent = computed(() => {
  const plan = props.progress.plan
  return plan && plan.due > 0 ? Math.round((plan.completed / plan.due) * 100) : null
})

function formatNumber(value: number) {
  return value.toLocaleString('de-DE')
}
</script>

<template>
  <div class="panel progress-head">
    <div class="level">
      <div class="badge" aria-hidden="true">
        <span>LVL</span>
        <strong>{{ progress.level.number }}</strong>
      </div>
      <div class="level-main">
        <p class="level-name">
          <span class="sr-only">Level {{ progress.level.number }}:</span>
          {{ progress.level.name }}
        </p>
        <div
          class="xp-bar"
          role="progressbar"
          :aria-valuenow="levelPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Fortschritt zum nächsten Level: ${levelPercent} %`"
        >
          <span :style="{ width: `${levelPercent}%` }"></span>
        </div>
        <p class="xp-text">
          {{ formatNumber(progress.xp) }} XP
          <template v-if="progress.nextLevel">
            · noch {{ formatNumber(progress.nextLevel.fromXp - progress.xp) }} bis „{{
              progress.nextLevel.name
            }}“
          </template>
        </p>
      </div>
    </div>

    <dl class="stats">
      <div v-if="progress.plan">
        <dt>Woche</dt>
        <dd>
          {{ progress.plan.week }}<small>/{{ progress.plan.totalWeeks }}</small>
        </dd>
      </div>
      <div v-if="completionPercent !== null">
        <dt>Erledigt</dt>
        <dd>{{ completionPercent }}<small>%</small></dd>
      </div>
      <div v-if="progress.plan">
        <dt>Bis {{ progress.plan.eventName }}</dt>
        <dd>{{ progress.plan.daysToEvent }}<small> Tage</small></dd>
      </div>
      <div v-if="progress.streakWeeks > 0" class="streak">
        <dt>Serie</dt>
        <dd>🔥 {{ progress.streakWeeks }}<small> Wo.</small></dd>
      </div>
    </dl>
    <p class="hint">
      XP = gefahrene Trainingslast (TSS), auch Pendel- und Zusatzfahrten. Serie = Wochen in Folge
      mit mindestens 80 % erledigten Workouts.
    </p>
  </div>
</template>

<style scoped>
.progress-head {
  margin: 12px 0 28px;
}

.level {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* schräger Aufnäher wie auf der Kutte */
.badge {
  display: grid;
  flex: none;
  place-items: center;
  width: 72px;
  height: 72px;
  transform: rotate(-6deg);
  background: var(--color-hot);
  color: var(--color-ink);
  box-shadow: 4px 4px 0 var(--color-lilac);
  font-family: var(--font-mono);
  line-height: 1;
}

.badge span {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.badge strong {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-style: italic;
  font-weight: 900;
}

.level-main {
  flex: 1;
  min-width: 0;
}

.level-name {
  margin: 0 0 6px;
  font-size: clamp(1.1rem, 4vw, 1.5rem);
  font-style: italic;
  font-weight: 900;
  font-stretch: 85%;
  text-transform: uppercase;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.xp-bar {
  height: 12px;
  background: var(--color-ink);
  border: 2px solid var(--color-panel-raised);
}

/* Warnband-Streifen */
.xp-bar span {
  display: block;
  height: 100%;
  background: repeating-linear-gradient(
    -45deg,
    var(--color-hot) 0 8px,
    var(--color-lilac) 8px 16px
  );
  transition: width 0.6s ease-out;
}

.xp-text {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  margin: 20px 0 0;
}

.stats dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.stats dd {
  margin: 2px 0 0;
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 900;
}

.stats small {
  font-size: 0.8rem;
  font-style: normal;
  font-weight: 600;
  color: var(--color-text-muted);
}

.streak dd {
  color: var(--color-hot);
}

.hint {
  margin: 16px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (prefers-reduced-motion: reduce) {
  .xp-bar span {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section>
    <RouterLink to="/plan" class="back">← Zurück zum Plan</RouterLink>
    <p class="kicker">// Workout {{ route.params.id }}</p>

    <!-- Platzhalter: später werden hier die Daten des Workouts geladen -->
    <div class="panel">
      <h2 class="panel-title">Intervalle</h2>
      <p class="placeholder">Aufbau des Workouts (Aufwärmen, Intervalle, Ausfahren) folgt.</p>
    </div>

    <div class="panel">
      <h2 class="panel-title">Erledigt?</h2>
      <label class="choice">
        <input type="checkbox" />
        <span>Workout abgehakt</span>
      </label>
      <label class="field">
        <span>Wie anstrengend war es? (1–10)</span>
        <input type="range" min="1" max="10" />
      </label>
    </div>

    <button type="button" class="button" disabled>.fit herunterladen</button>
  </section>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
}

.back:hover {
  color: var(--color-lilac);
}

.panel {
  margin-bottom: 16px;
}

.placeholder {
  margin: 0;
  color: var(--color-text-muted);
}
</style>

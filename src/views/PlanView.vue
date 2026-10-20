<script setup lang="ts">
import WorkoutList from '../components/WorkoutList.vue'
</script>

<template>
  <section>
    <p class="kicker">// Dein Plan</p>
    <!-- Platzhalter: später kommen hier Event, Wochen und Fortschritt hin -->
    <div class="panel plan-summary">
      <div>
        <span class="label">Event</span>
        <strong>—</strong>
      </div>
      <div>
        <span class="label">Noch</span>
        <strong>— Wochen</strong>
      </div>
      <div>
        <span class="label">Diese Woche</span>
        <strong>0 / 3 erledigt</strong>
      </div>
    </div>

    <WorkoutList />
  </section>
</template>

<style scoped>
.plan-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin: 12px 0 28px;
}

.plan-summary strong {
  display: block;
  font-size: 1.2rem;
  font-style: italic;
  text-transform: uppercase;
}
</style>

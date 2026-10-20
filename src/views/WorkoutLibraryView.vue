<script setup lang="ts">
import WorkoutList from '../components/WorkoutList.vue'
</script>

<template>
  <section>
    <p class="kicker">// Bibliothek</p>
    <p class="intro">
      Alle Workouts, aus denen quaelmich deinen Plan zusammenstellt. Leistung in Prozent deiner FTP.
    </p>
    <WorkoutList />
  </section>
</template>

<style scoped>
.intro {
  margin: 8px 0 24px;
  color: var(--color-text-muted);
}
</style>

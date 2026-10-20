<script setup lang="ts">
type Workout = {
  title: string
  durationInMinutes: number
  intensity: number
}

const workouts: Workout[] = [
  { title: 'Grundlagenrunde', durationInMinutes: 90, intensity: 40 },
  { title: 'Intervalle', durationInMinutes: 60, intensity: 85 },
  { title: 'Regeneration', durationInMinutes: 45, intensity: 20 },
]
</script>

<template>
  <ul>
    <li v-for="workout in workouts" :key="workout.title">
      {{ workout.title }} · {{ workout.durationInMinutes }} min · Intensität {{ workout.intensity }}
    </li>
  </ul>
</template>

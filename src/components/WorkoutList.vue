<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Workout = {
  title: string
  durationInMinutes: number
  intensity: number
}

const workouts = ref<Workout[]>([])

function loadWorkouts() {
  const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL
  const endpoint = baseUrl + '/workouts'
  fetch(endpoint)
    .then((response) => response.json())
    .then((result: Workout[]) => (workouts.value = result))
    .catch((error) => console.log('error', error))
}

onMounted(loadWorkouts)
</script>

<template>
  <ul>
    <li v-for="workout in workouts" :key="workout.title">
      {{ workout.title }} · {{ workout.durationInMinutes }} min · Intensität {{ workout.intensity }}
    </li>
  </ul>
</template>

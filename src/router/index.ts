import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import PlanView from '../views/PlanView.vue'
import WorkoutDetailView from '../views/WorkoutDetailView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView },
    { path: '/plan', name: 'plan', component: PlanView },
    { path: '/workouts/:id', name: 'workout', component: WorkoutDetailView },
    { path: '/profil', name: 'profile', component: ProfileView },
  ],
})

export default router

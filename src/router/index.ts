import { createRouter, createWebHistory } from 'vue-router'

import { auth } from '../auth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import PlanView from '../views/PlanView.vue'
import PlannedWorkoutView from '../views/PlannedWorkoutView.vue'
import WorkoutDetailView from '../views/WorkoutDetailView.vue'
import WorkoutLibraryView from '../views/WorkoutLibraryView.vue'
import ProfileView from '../views/ProfileView.vue'
import StravaCallbackView from '../views/StravaCallbackView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
      meta: { requiresAuth: true },
    },
    { path: '/plan', name: 'plan', component: PlanView, meta: { requiresAuth: true } },
    {
      path: '/plan/:id',
      name: 'planned-workout',
      component: PlannedWorkoutView,
      meta: { requiresAuth: true },
    },
    { path: '/workouts', name: 'workouts', component: WorkoutLibraryView },
    { path: '/workouts/:id', name: 'workout', component: WorkoutDetailView },
    { path: '/profil', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
    {
      path: '/strava/callback',
      name: 'strava-callback',
      component: StravaCallbackView,
      meta: { requiresAuth: true },
    },
  ],
})

// Geschützte Seiten nur mit Login – sonst zur Anmeldung und danach zurück
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.isLoggedIn.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isLoggedIn.value) {
    return { name: 'plan' }
  }
})

export default router

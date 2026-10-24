import { createRouter, createWebHistory } from 'vue-router'

import { auth } from '../auth'
import HomeView from '../views/HomeView.vue'
import DatenschutzView from '../views/DatenschutzView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import ImpressumView from '../views/ImpressumView.vue'
import LoginView from '../views/LoginView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import PlanView from '../views/PlanView.vue'
import PlannedWorkoutView from '../views/PlannedWorkoutView.vue'
import WorkoutDetailView from '../views/WorkoutDetailView.vue'
import WorkoutLibraryView from '../views/WorkoutLibraryView.vue'
import WorkoutBuilderView from '../views/WorkoutBuilderView.vue'
import WorkoutPlayerView from '../views/WorkoutPlayerView.vue'
import ProfileView from '../views/ProfileView.vue'
import StravaCallbackView from '../views/StravaCallbackView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/impressum', name: 'impressum', component: ImpressumView },
    { path: '/datenschutz', name: 'datenschutz', component: DatenschutzView },
    { path: '/passwort-vergessen', name: 'forgot-password', component: ForgotPasswordView },
    { path: '/passwort-zuruecksetzen', name: 'reset-password', component: ResetPasswordView },
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
    {
      path: '/plan/:id/fahren',
      name: 'planned-workout-player',
      component: WorkoutPlayerView,
      meta: { requiresAuth: true },
    },
    { path: '/workouts', name: 'workouts', component: WorkoutLibraryView },
    {
      path: '/workouts/neu',
      name: 'workout-new',
      component: WorkoutBuilderView,
      meta: { requiresAuth: true },
    },
    {
      path: '/workouts/:id/bearbeiten',
      name: 'workout-edit',
      component: WorkoutBuilderView,
      meta: { requiresAuth: true },
    },
    { path: '/workouts/:id', name: 'workout', component: WorkoutDetailView },
    { path: '/workouts/:id/fahren', name: 'workout-player', component: WorkoutPlayerView },
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

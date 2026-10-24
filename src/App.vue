<script setup lang="ts">
import { useRouter } from 'vue-router'

import { auth, endSession } from './auth'
import logoUrl from './assets/logo.png'
import FeedbackButton from './components/FeedbackButton.vue'
import { hasImpressum } from './legal'

const router = useRouter()

function logout() {
  endSession()
  router.push('/')
}
</script>

<template>
  <header class="masthead">
    <!-- Der ganze Logo-Bereich ist der Link zur Startseite: das gedrehte Bild selbst hätte
         eine schräge Klickfläche mit durchsichtigen Rändern -->
    <RouterLink to="/" class="stage" aria-label="quaelmich – zur Startseite">
      <div class="band" aria-hidden="true"></div>
      <h1 class="logo-heading">
        <img :src="logoUrl" alt="quaelmich" class="logo" />
      </h1>
      <span class="beta" title="quaelmich ist noch in der Beta – Feedback hilft!">Beta</span>
    </RouterLink>
    <p class="claim">Trainingsplan fürs Rad <span class="claim-accent">— quäl dich.</span></p>
    <nav class="nav">
      <template v-if="auth.isLoggedIn.value">
        <RouterLink to="/plan">Plan</RouterLink>
        <RouterLink to="/workouts">Workouts</RouterLink>
        <RouterLink to="/profil">Profil</RouterLink>
        <span class="spacer"></span>
        <span class="user" :title="auth.email.value ?? ''">{{ auth.email.value }}</span>
        <button type="button" class="logout" @click="logout">Abmelden</button>
      </template>
      <template v-else>
        <RouterLink to="/workouts">Workouts</RouterLink>
        <span class="spacer"></span>
        <RouterLink to="/login">Anmelden</RouterLink>
      </template>
    </nav>
  </header>

  <main class="content">
    <RouterView />
  </main>

  <FeedbackButton v-if="auth.isLoggedIn.value" />

  <footer class="footer">
    <RouterLink v-if="hasImpressum" to="/impressum">Impressum</RouterLink>
    <RouterLink to="/datenschutz">Datenschutz</RouterLink>
  </footer>
</template>

<style scoped>
.masthead {
  padding: 32px 0 8px;
  overflow: hidden;
}

.stage {
  position: relative;
  display: block;
  color: inherit;
  text-decoration: none;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* schräges Brust-Band wie auf dem Trikot – liegt hinter dem Logo */
.band {
  position: absolute;
  top: 12%;
  bottom: 12%;
  left: -50vw;
  right: -50vw;
  background: var(--color-plum);
  clip-path: polygon(0 22%, 100% 0, 100% 78%, 0 100%);
}

/* Halbton-Punkte, die zum Rand hin auslaufen */
.band::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--color-lilac) 1.1px, transparent 1.5px);
  background-size: 6px 6px;
  -webkit-mask-image: linear-gradient(90deg, transparent 55%, black 100%);
  mask-image: linear-gradient(90deg, transparent 55%, black 100%);
  opacity: 0.35;
}

.logo-heading {
  position: relative;
  margin: 0;
}

/* Graffiti-Logo mit dunklem 3D-Block */
.logo {
  display: block;
  width: 100%;
  height: auto;
  transform: rotate(-4deg);
  filter: drop-shadow(2px 2px 0 var(--color-ink)) drop-shadow(2px 2px 0 var(--color-ink))
    drop-shadow(2px 2px 0 var(--color-ink)) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5));
}

/* Stempel: noch in der Beta */
.beta {
  position: absolute;
  right: 6%;
  bottom: 4%;
  padding: 2px 10px;
  border: 3px solid var(--color-hot);
  background: var(--color-ink);
  color: var(--color-hot);
  font-family: var(--font-heading);
  font-size: clamp(0.9rem, 3vw, 1.3rem);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transform: rotate(6deg);
  box-shadow: 3px 3px 0 var(--color-plum);
}

.claim {
  max-width: 800px;
  margin: 18px auto 0;
  padding: 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.claim-accent {
  color: var(--color-lilac);
}

.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 24px;
  max-width: 800px;
  margin: 20px auto 0;
  padding: 0 16px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.nav a {
  padding-bottom: 4px;
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 3px solid transparent;
}

.spacer {
  flex: 1;
}

.user {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
}

.logout {
  padding: 0 0 4px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.logout:hover {
  color: var(--color-hot);
}

.nav a:hover {
  color: var(--color-text);
}

/* aktive Seite markiert der Router automatisch mit dieser Klasse */
.nav a.router-link-active {
  color: var(--color-lilac);
  border-bottom-color: var(--color-lilac);
}

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}
.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  border-top: 1px solid var(--color-panel-raised);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.footer a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.footer a:hover {
  color: var(--color-lilac);
}
</style>

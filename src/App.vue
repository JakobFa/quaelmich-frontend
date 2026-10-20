<script setup lang="ts">
import WorkoutList from './components/WorkoutList.vue'
import logoUrl from './assets/logo.png'
</script>

<template>
  <header class="masthead">
    <div class="stage">
      <div class="band" aria-hidden="true"></div>
      <h1 class="logo-heading">
        <img :src="logoUrl" alt="quaelmich" class="logo" />
      </h1>
    </div>
    <p class="claim">Trainingsplan fürs Rad <span class="claim-accent">— quäl dich.</span></p>
  </header>

  <main class="content">
    <WorkoutList />
  </main>
</template>

<style scoped>
.masthead {
  padding: 32px 0 8px;
  overflow: hidden;
}

.stage {
  position: relative;
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

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}
</style>

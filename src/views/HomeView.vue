<script setup lang="ts">
import heroUrl from '../assets/hero.jpg'
</script>

<template>
  <section class="home">
    <!-- Hintergrund: Foto als angedeutete Silhouette in den Farben der Seite -->
    <div class="backdrop" aria-hidden="true">
      <img :src="heroUrl" alt="" />
    </div>

    <div class="text">
      <p class="kicker">// Dein Ziel. Dein Plan.</p>
      <h2 class="headline">Sag uns, was du vorhast — wir planen, wie du da hinkommst.</h2>
      <p class="intro">
        Profil, Event und deine freien Stunden pro Woche. Daraus baut quaelmich deinen
        Trainingsplan.
      </p>
      <div class="actions">
        <RouterLink to="/onboarding" class="button">Plan erstellen</RouterLink>
        <RouterLink to="/plan" class="button button-ghost">Zum Plan</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 560px;
  padding: 8px 0 24px;
}

.text {
  max-width: 460px;
}

.headline {
  margin: 8px 0 12px;
  font-size: clamp(1.8rem, 5vw, 2.6rem);
  font-weight: 900;
  font-style: italic;
  font-stretch: 85%;
  text-transform: uppercase;
  line-height: 1;
}

.intro {
  max-width: 52ch;
  margin: 0 0 28px;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* ---------- Hintergrundfoto als Silhouette ---------- */

.backdrop {
  position: absolute;
  z-index: -1;
  top: -140px;
  bottom: -60px;
  right: -12%;
  width: 70%;
  /* Duoton: helle Stellen werden flieder, dunkle verschwinden im Schwarz */
  background: var(--color-lilac);
  opacity: 0.32;
  /* Ränder laufen weich in den Hintergrund aus */
  --fade-x: linear-gradient(90deg, transparent, black 35%, black 75%, transparent);
  --fade-y: linear-gradient(180deg, transparent, black 25%, black 70%, transparent);
  -webkit-mask-image: var(--fade-x), var(--fade-y);
  -webkit-mask-composite: source-in;
  mask-image: var(--fade-x), var(--fade-y);
  mask-composite: intersect;
}

.backdrop img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Schwarz-Weiß mit hartem Kontrast → Fahrer, Räder und Fels werden zu Silhouetten */
  filter: grayscale(1) contrast(2.2) brightness(0.95);
  mix-blend-mode: multiply;
}

/* leichtes Filmkorn */
.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.35;
  mix-blend-mode: overlay;
}

@media (max-width: 640px) {
  .home {
    min-height: 480px;
  }

  .backdrop {
    right: -30%;
    width: 120%;
    opacity: 0.22;
  }
}
</style>

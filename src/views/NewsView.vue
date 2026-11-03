<script setup lang="ts">
import { changelog } from '../changelog'

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`))
}
</script>

<template>
  <section class="news">
    <p class="kicker">// Neuigkeiten</p>
    <h2 class="heading">Was ist neu in quaelmich?</h2>
    <p class="intro">
      Das hat sich zuletzt getan. Ideen oder Fehler? Der Feedback-Knopf unten rechts erreicht mich
      direkt.
    </p>

    <article v-for="release in changelog" :key="release.date" class="release">
      <h3 class="date">
        {{ formatDate(release.date) }}
        <small v-if="release.version" class="version">v{{ release.version }}</small>
      </h3>
      <ul>
        <li v-for="change in release.changes" :key="change.title" class="change">
          <span class="kind" :class="{ new: change.kind === 'Neu' }">{{ change.kind }}</span>
          <div>
            <strong class="title">{{ change.title }}</strong>
            <p class="text">{{ change.text }}</p>
          </div>
        </li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.news {
  max-width: 680px;
}

.heading {
  margin: 0.2rem 0 0.4rem;
  font-family: var(--font-heading);
  font-weight: 400;
  text-transform: uppercase;
}

.intro {
  margin: 0 0 1.4rem;
  color: var(--color-text-muted);
}

.release {
  margin-bottom: 1.6rem;
  padding: 1rem 1.1rem;
  background: var(--color-panel);
  border-left: 4px solid var(--color-plum);
}

.date {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  margin: 0 0 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-lilac);
}

.version {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.change {
  display: flex;
  gap: 0.8rem;
  padding: 0.55rem 0;
  border-top: 1px solid var(--color-panel-raised);
}

.kind {
  flex: none;
  align-self: flex-start;
  min-width: 3.9rem;
  padding: 0.1rem 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lilac);
  border: 1px solid var(--color-lilac-dim);
}

.kind.new {
  color: var(--color-ink);
  background: var(--color-hot);
  border-color: var(--color-hot);
}

.title {
  font-weight: 700;
}

.text {
  margin: 0.15rem 0 0;
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
import { hasImpressum, legal } from '../legal'
</script>

<template>
  <section class="legal">
    <p class="kicker">// Impressum</p>

    <div v-if="hasImpressum" class="panel">
      <h2 class="panel-title">Angaben gemäß § 5 DDG</h2>
      <p>
        {{ legal.name }}<br />
        <template v-for="line in legal.address" :key="line">{{ line }}<br /></template>
      </p>
      <h3>Kontakt</h3>
      <p>
        E-Mail: <a :href="`mailto:${legal.email}`">{{ legal.email }}</a>
      </p>
      <h3>Hinweis</h3>
      <p>
        quaelmich ist ein privates, nicht-kommerzielles Projekt, entstanden im Modul
        Webtechnologien. Die Trainingspläne sind Vorschläge und ersetzen keine ärztliche oder
        trainerische Beratung.
      </p>
    </div>

    <div v-else class="panel">
      <h2 class="panel-title">Impressum folgt</h2>
      <p>
        Die Angaben werden gerade ergänzt. Fragen zum Datenschutz:
        <RouterLink to="/datenschutz">Datenschutzerklärung</RouterLink>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.legal {
  max-width: 680px;
}

.panel {
  margin-top: 12px;
}

h3 {
  margin: 20px 0 6px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-lilac);
}

p {
  margin: 0 0 8px;
}

a {
  color: var(--color-lilac);
}
</style>

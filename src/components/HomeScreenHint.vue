<script setup lang="ts">
/** Kurze Anleitung: quaelmich wie eine App auf den Home-Bildschirm legen */
const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
</script>

<template>
  <details class="panel home-screen" :open="isIos">
    <summary class="panel-title">📱 quaelmich als App aufs Handy</summary>
    <p class="hint">
      Auf dem Home-Bildschirm öffnet sich quaelmich wie eine App – ohne Browserleiste, mit eigenem
      Symbol.
    </p>
    <h3>iPhone / iPad</h3>
    <ol>
      <li>
        quaelmich.com in <strong>Safari</strong> öffnen (nicht in Chrome oder einer anderen App).
      </li>
      <li>Unten auf <strong>Teilen</strong> tippen (Quadrat mit Pfeil nach oben).</li>
      <li>Runterscrollen und <strong>„Zum Home-Bildschirm“</strong> wählen.</li>
      <li>Oben rechts auf <strong>„Hinzufügen“</strong> tippen.</li>
    </ol>
    <h3>Android</h3>
    <ol>
      <li>quaelmich.com in <strong>Chrome</strong> öffnen.</li>
      <li>Oben rechts auf <strong>⋮</strong> tippen.</li>
      <li>
        <strong>„App installieren“</strong> oder
        <strong>„Zum Startbildschirm hinzufügen“</strong> wählen.
      </li>
    </ol>
    <p class="hint small">Einmal anmelden reicht – danach öffnet das Symbol direkt deinen Plan.</p>
  </details>
</template>

<style scoped>
summary {
  cursor: pointer;
}

.hint {
  margin: 12px 0 8px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.hint.small {
  margin-top: 8px;
  font-size: 0.8rem;
}

h3 {
  margin: 12px 0 4px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-lilac);
}

ol {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
}

li {
  margin-bottom: 4px;
}
</style>

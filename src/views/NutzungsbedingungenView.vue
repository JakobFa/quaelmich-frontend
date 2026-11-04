<script setup lang="ts">
import { hasImpressum, legal } from '../legal'
</script>

<template>
  <section class="legal">
    <p class="kicker">// Nutzungsbedingungen</p>

    <div class="panel">
      <h2 class="panel-title">Nutzungsbedingungen</h2>
      <p class="hint">Stand: November 2026</p>

      <h3>1. Was quaelmich ist</h3>
      <p>
        quaelmich erstellt dir einen Trainingsplan für das Radfahren und passt ihn an das an, was du
        fährst. Der Dienst ist im Beta-Test und kostenlos. Er kann sich ändern, Fehler haben oder
        zeitweise nicht erreichbar sein.
      </p>

      <h3>2. Kein ärztlicher Rat</h3>
      <p>
        Die Pläne sind Vorschläge für gesunde Erwachsene und ersetzen keine ärztliche oder
        trainerische Beratung. Hör auf deinen Körper, lass dich bei Beschwerden untersuchen und
        entscheide selbst, was du fährst. Du trainierst auf eigene Verantwortung.
      </p>

      <h3>3. Dein Konto</h3>
      <p>
        Du bist für dein Passwort verantwortlich und gibst richtige Angaben an. Du kannst dein Konto
        jederzeit im Profil unter „Konto &amp; Daten“ löschen. Wie wir mit deinen Daten umgehen,
        steht in der <RouterLink to="/datenschutz">Datenschutzerklärung</RouterLink>.
      </p>

      <h3>4. Dienste von Dritten</h3>
      <p>
        quaelmich arbeitet auf Wunsch mit Diensten anderer Anbieter zusammen, zum Beispiel Strava,
        intervals.icu, Wahoo, Garmin oder einer KI-App wie Claude. Diese Dienste gehören nicht zu
        quaelmich. Für sie gelten die Bedingungen ihrer Anbieter.
      </p>
      <p>
        Die Anbieter dieser Dienste geben keine Gewährleistung, auch nicht stillschweigend: weder für
        die Handelsüblichkeit, die Eignung für einen bestimmten Zweck noch für die Freiheit von Rechten
        Dritter. Sie haften nicht für besondere, zufällige, Folge-, mittelbare oder Strafschäden, die
        im Zusammenhang mit quaelmich entstehen.
      </p>

      <h3>5. Haftung</h3>
      <p>
        Für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit
        haftet der Betreiber nach dem Gesetz. Bei leichter Fahrlässigkeit haftet er nur, wenn eine
        wesentliche Vertragspflicht verletzt wird, und nur für den vorhersehbaren, typischen Schaden.
        Eine weitergehende Haftung ist ausgeschlossen. Das gilt, soweit das Gesetz nichts anderes
        zwingend vorschreibt.
      </p>

      <h3>6. Änderungen und Kontakt</h3>
      <p>
        Wir können diese Bedingungen ändern, zum Beispiel wenn sich der Dienst ändert; die neue
        Fassung steht dann hier. Fragen und Wünsche schickst du über „Feedback“ in der App<template
          v-if="legal.email"
        >
          oder an <a :href="`mailto:${legal.email}`">{{ legal.email }}</a></template
        >.
      </p>
      <p v-if="hasImpressum">Siehe auch <RouterLink to="/impressum">Impressum</RouterLink>.</p>
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
  margin: 24px 0 8px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-lilac);
}

p {
  margin: 0 0 8px;
}

ul {
  margin: 0 0 8px;
  padding-left: 20px;
}

li {
  margin-bottom: 6px;
}

.hint {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

a {
  color: var(--color-lilac);
}
</style>

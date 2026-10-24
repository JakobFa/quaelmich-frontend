<script setup lang="ts">
import { hasImpressum, legal } from '../legal'
</script>

<template>
  <section class="legal">
    <p class="kicker">// Datenschutz</p>

    <div class="panel">
      <h2 class="panel-title">Datenschutzerklärung</h2>
      <p class="hint">Stand: Oktober 2026</p>

      <h3>1. Wer ist verantwortlich?</h3>
      <p v-if="legal.name">
        {{ legal.name }}<br />
        <template v-for="line in legal.address" :key="line">{{ line }}<br /></template>
        <template v-if="legal.email">
          E-Mail: <a :href="`mailto:${legal.email}`">{{ legal.email }}</a>
        </template>
      </p>
      <p v-else>Die Kontaktangaben werden gerade ergänzt.</p>
      <p v-if="hasImpressum">Siehe auch <RouterLink to="/impressum">Impressum</RouterLink>.</p>

      <h3>2. Welche Daten quaelmich speichert</h3>
      <ul>
        <li>
          <strong>Konto:</strong> E-Mail-Adresse, Passwort (nur als BCrypt-Hash, nie im Klartext),
          Zeitpunkt der Registrierung und der letzten Passwort-Änderung.
        </li>
        <li>
          <strong>Profil:</strong> Trainingsart (Watt oder Puls), FTP, Gewicht, Level, Ziel-Event
          (Name, Datum, Art, Distanz, Höhenmeter) und deine Verfügbarkeit pro Wochentag.
        </li>
        <li>
          <strong>Pulsdaten (freiwillig):</strong> Maximalpuls, Schwellenpuls und Pulszonen. Das
          sind Gesundheitsdaten – du gibst sie nur an, wenn du nach Puls trainieren oder die
          Belastung aus dem Puls schätzen lassen willst.
        </li>
        <li>
          <strong>Trainingsplan:</strong> geplante Workouts, Häkchen, Bewertungen (1–10) und deine
          Anpassungen.
        </li>
        <li>
          <strong>Gemachte Einheiten</strong> (nur wenn du Strava oder intervals.icu verbindest):
          Datum, Sportart, Dauer, Distanz und Trainingslast (TSS). Keine GPS-Strecken, keine Fotos.
        </li>
        <li>
          <strong>Verbindungen:</strong> dein intervals.icu-Schlüssel bzw. deine Strava-Zugangsdaten
          – nur verschlüsselt (AES-256) gespeichert –, dazu Athleten-ID und bei Strava dein Vorname.
        </li>
        <li>
          <strong>Feedback (freiwillig):</strong> dein Text, die Seite, auf der du ihn geschrieben
          hast, und der Zeitpunkt – verknüpft mit deinem Konto, damit eine Rückfrage möglich ist.
          Der Betreiber bekommt es per E-Mail und liest es, um quaelmich zu verbessern.
        </li>
        <li>
          <strong>Technisch:</strong> Für den Schutz vor automatisierten Angriffen wird deine
          IP-Adresse kurzzeitig im Arbeitsspeicher gezählt (höchstens eine Stunde, nicht dauerhaft
          gespeichert). Der Server-Anbieter protokolliert Zugriffe in üblichem Umfang.
        </li>
      </ul>

      <h3>3. Wofür und auf welcher Grundlage</h3>
      <ul>
        <li>
          Konto, Profil, Plan und Einheiten brauchen wir, um dir deinen Trainingsplan zu erstellen
          und anzupassen – Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag).
        </li>
        <li>
          Pulsdaten verarbeiten wir nur mit deiner Einwilligung – Art. 9 Abs. 2 lit. a DSGVO. Du
          kannst sie jederzeit widerrufen, indem du die Pulsangaben im Profil löschst.
        </li>
        <li>
          Schutz vor Missbrauch (Begrenzung von Anmeldeversuchen) – Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an einem sicheren Dienst).
        </li>
      </ul>
      <p>
        Es gibt <strong>keine Werbung, kein Tracking und keine Analyse-Tools</strong>. Daten werden
        nicht verkauft.
      </p>

      <h3>4. Wer deine Daten außerdem verarbeitet</h3>
      <ul>
        <li>
          <strong>Render Services, Inc. (USA)</strong> – betreibt Server und Datenbank. Die
          Übermittlung in die USA erfolgt auf Grundlage von Standardvertragsklauseln der
          EU-Kommission.
        </li>
        <li>
          <strong>Cloudflare, Inc.</strong> – leitet die Domain quaelmich.com weiter (DNS); Inhalte
          laufen nicht über Cloudflare.
        </li>
        <li>
          <strong>Resend</strong> (Versand aus der EU, Irland) – verschickt Mails zum Zurücksetzen
          des Passworts an deine E-Mail-Adresse.
        </li>
        <li>
          <strong>Strava</strong> und <strong>intervals.icu</strong> – nur wenn du sie selbst
          verbindest: quaelmich holt dort deine Einheiten ab und schickt Workouts an deinen
          intervals.icu-Kalender. Für die Daten bei diesen Diensten gelten deren
          Datenschutzerklärungen.
        </li>
      </ul>
      <p>
        Schriften und Bilder werden von quaelmich selbst ausgeliefert, es gibt keine Verbindung zu
        Google Fonts o. Ä.
      </p>

      <h3>5. Speicher im Browser</h3>
      <p>
        Damit du angemeldet bleibst, speichert quaelmich deine Anmeldung (ein Token) und deine
        E-Mail im lokalen Speicher deines Browsers. Das ist technisch notwendig; Cookies zu Werbe-
        oder Analysezwecken gibt es nicht. Beim Abmelden wird beides gelöscht.
      </p>

      <h3>6. Wie lange</h3>
      <ul>
        <li>Deine Daten bleiben gespeichert, solange dein Konto besteht.</li>
        <li>
          Trennst du Strava, werden alle von Strava übernommenen Einheiten gelöscht. Trennst du
          intervals.icu, wird dein Schlüssel gelöscht.
        </li>
        <li>Links zum Zurücksetzen des Passworts gelten eine Stunde.</li>
      </ul>

      <h3>7. Deine Rechte</h3>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit zu
        widerrufen. Schreib dafür einfach eine Mail<template v-if="legal.email">
          an <a :href="`mailto:${legal.email}`">{{ legal.email }}</a></template
        >. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.
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

/**
 * Neuigkeiten für die Nutzer: nur Änderungen, die man in der App merkt – keine reine Technik.
 * Neueste zuerst. Bei jedem Feature, das Nutzer interessiert, hier einen Eintrag ergänzen.
 */
export type ChangeKind = 'Neu' | 'Besser'

export type Change = { kind: ChangeKind; title: string; text: string }

export type Release = {
  /** ISO-Datum des Tages */
  date: string
  /** nur wenn die Version bekannt ist */
  version?: string
  changes: Change[]
}

export const changelog: Release[] = [
  {
    date: '2026-11-03',
    version: '0.9.33',
    changes: [
      {
        kind: 'Neu',
        title: 'Der Rampentest feuert dich an',
        text: 'Im Player siehst du beim FTP-Test in jeder Minute einen Spruch: erst zum Einrollen, dann härter, kurz vor dem Ende jeder Stufe und wenn du pausierst.',
      },
      {
        kind: 'Besser',
        title: 'Strava-Titel mit dem Namen des Trainings',
        text: 'Bestätigst du ein Training, setzt quaelmich den Titel der Strava-Fahrt auf den Namen des Trainings – aber nur, wenn die Fahrt noch den Standardtitel von Strava hat ("Radfahrt am Abend"). Eigene Titel bleiben immer stehen.',
      },
      {
        kind: 'Besser',
        title: 'Story-Overlay mit Intervallblöcken',
        text: 'Über den Zahlen zeigt das Overlay jetzt das Profil des Trainings, mit den Blöcken in den Farben der Zonen.',
      },
      {
        kind: 'Neu',
        title: 'Neuigkeiten-Seite',
        text: 'Tipp auf den Beta-Stempel: Hier steht, was sich in quaelmich geändert hat.',
      },
      {
        kind: 'Neu',
        title: 'Story-Overlay für Instagram',
        text: 'Bei jeder gefahrenen Einheit und Zusatzfahrt gibt es ein durchsichtiges Bild mit Dauer, Distanz und TSS. Teilen oder speichern und in der Story über dein Foto legen.',
      },
      {
        kind: 'Besser',
        title: 'Der Plan startet passend zu deinem Level',
        text: 'Wer als Leistungsfahrer startet, bekommt gleich mehr Umfang, Einsteiger beginnen sanfter. Wer wenig Zeit hat, nutzt sie von Anfang an besser aus.',
      },
      {
        kind: 'Besser',
        title: 'Lange Wochenenden mit Plan',
        text: 'Höchstens zwei lange Tage pro Woche. Für lange Events (Ultra, Bikepacking) gibt es ab "Ambitioniert" abwechselnd zwei lange Tage hintereinander – als Vorbereitung auf mehrere Tage im Sattel.',
      },
      {
        kind: 'Besser',
        title: 'Leichtere Ersatz-Einheit passt immer in deine Zeit',
        text: 'Nach einer sehr harten Fahrt ersetzt quaelmich die nächste harte Einheit durch eine leichtere. Die ist jetzt nie länger als der Tag Zeit hat.',
      },
      {
        kind: 'Besser',
        title: 'Aufwärmen als Stufen auf dem Wahoo',
        text: 'Rampen kommen als feste Stufen auf deinen ELEMNT, weil er bei einem Bereich nur die Mitte fährt.',
      },
    ],
  },
  {
    date: '2026-11-02',
    version: '0.9.29',
    changes: [
      {
        kind: 'Neu',
        title: 'Zeit pro Tag zum Auswählen',
        text: 'Im Profil wählst du die Stunden pro Tag in halben Stunden aus, statt sie einzutippen.',
      },
      {
        kind: 'Besser',
        title: 'Strava hat Vorrang',
        text: 'Kommt eine Fahrt aus beiden Quellen, zählt die Strava-Version – auch wenn sie später ankommt. Zusatzfahrten zeigen, woher sie stammen.',
      },
      {
        kind: 'Besser',
        title: 'Pulsziele für lange lockere Fahrten',
        text: 'Bei Fahrten ab 1,5 Stunden liegt die Obergrenze bei 75 % deines Maximalpulses. Die Belastung (TSS) aus dem Puls ist bei Stop-and-go genauer.',
      },
      {
        kind: 'Besser',
        title: 'Erholungswoche nach spätestens drei harten Wochen',
        text: 'Auch in der Spitzenphase. Die Woche danach startet frisch.',
      },
    ],
  },
  {
    date: '2026-11-01',
    changes: [
      {
        kind: 'Neu',
        title: 'Ein Pausentag pro Woche',
        text: 'Wer an allen sieben Tagen Zeit hat, bekommt einen freien Tag. Der Wochenumfang steigt außerdem höchstens um etwa 10 % gegenüber der Woche davor.',
      },
      {
        kind: 'Neu',
        title: 'Player schreibt Geschwindigkeit und Strecke mit',
        text: 'Fahrten aus dem Player lassen sich direkt zu Strava hochladen (einschaltbar im Profil).',
      },
      {
        kind: 'Besser',
        title: 'Zeit ändern gilt für die nächsten 10 Tage',
        text: 'Wenn du die Zeit in der laufenden Woche änderst, rechnet der Plan die nächsten 10 Tage neu.',
      },
    ],
  },
  {
    date: '2026-10-30',
    changes: [
      {
        kind: 'Neu',
        title: 'Einschätzung auch für lockere Fahrten',
        text: 'Bei Grundlagenfahrten zeigt eine Kurve über dem Zielbereich, wie gleichmäßig du gefahren bist.',
      },
      {
        kind: 'Besser',
        title: 'Genauerer Belastungscheck',
        text: '"Zu viel" bezieht sich jetzt darauf, was du in letzter Zeit gewohnt bist, nicht nur auf den Plan.',
      },
    ],
  },
  {
    date: '2026-10-27',
    changes: [
      {
        kind: 'Neu',
        title: 'Mehr Abwechslung',
        text: '16 neue Workouts. Der Plan wechselt sie ab, und schon die Grundlage hat harte Reize und lockere Tage mit Einlagen.',
      },
    ],
  },
  {
    date: '2026-10-26',
    changes: [
      {
        kind: 'Neu',
        title: 'Trainer per Bluetooth',
        text: 'Im Player: ERG-Modus, Live-Werte und Aufzeichnung als .fit-Datei.',
      },
      {
        kind: 'Neu',
        title: 'Rampentest statt 20-Minuten-Test',
        text: 'Deine FTP kommt aus dem Rampentest und lässt sich direkt übernehmen.',
      },
      {
        kind: 'Neu',
        title: '"Überrasch mich"',
        text: 'Ein zufälliges Workout passend zur Zeit des Tages.',
      },
      {
        kind: 'Besser',
        title: 'Der Plan wird über die Phasen härter',
        text: 'Die Intensität steigt von Grundlage bis Spitze, bei Ultras gibt es mehr Reize.',
      },
    ],
  },
  {
    date: '2026-10-25',
    changes: [
      {
        kind: 'Neu',
        title: 'Ziele ohne Event',
        text: 'FTP steigern, Ausdauer, fit bleiben oder schneller am Berg – der Plan hat dann kein Enddatum.',
      },
      {
        kind: 'Neu',
        title: 'Bikepacking und mehrere Events',
        text: 'Bikepacking ist eine eigene Event-Art, entspannter als ein Ultra-Rennen. Weitere Events trägst du im Profil ein, der Plan arbeitet der Reihe nach auf alle hin. Nach einem Event gibt es drei Tage Ausrollen.',
      },
      {
        kind: 'Neu',
        title: 'Als App auf den Home-Bildschirm',
        text: 'Im Profil steht, wie du quaelmich auf dem Handy wie eine App ablegst.',
      },
      {
        kind: 'Besser',
        title: 'Bessere Intervall-Erkennung',
        text: 'Intervalle werden auch mitten in der Fahrt gefunden, Stillstand an der Ampel zählt nicht als 0 Watt.',
      },
      {
        kind: 'Besser',
        title: 'Abhaken nur bei passenden Fahrten',
        text: 'Automatisch abgehakt werden nur Rollenfahrten, die zum Workout passen. Draußen ordnest du selbst zu.',
      },
    ],
  },
  {
    date: '2026-10-24',
    version: '0.9.0',
    changes: [
      {
        kind: 'Neu',
        title: 'Beta-Stempel und Feedback',
        text: 'Der Stempel zeigt die Version. Der Feedback-Knopf unten rechts erreicht mich direkt.',
      },
      {
        kind: 'Neu',
        title: 'Eigene Workouts bauen',
        text: 'Im Workout-Builder bauen, ändern und löschen.',
      },
      {
        kind: 'Neu',
        title: 'Einschätzung der letzten 7 Tage',
        text: 'Zu wenig, auf Kurs, etwas viel oder zu viel – oben im Plan. Dazu kommt, wie genau du die Intervalle getroffen hast.',
      },
      {
        kind: 'Neu',
        title: 'Konto und Daten in deiner Hand',
        text: 'Im Profil: alle Daten herunterladen oder das Konto löschen.',
      },
      {
        kind: 'Neu',
        title: 'Zeit pro Woche und Pausen',
        text: 'Zeit für einzelne Wochen ändern, ohne deine normale Verfügbarkeit anzufassen. Ausgefallene Einheiten gibst du mit Grund an, der Plan kann pausieren.',
      },
      {
        kind: 'Neu',
        title: 'Eigene Leistungszonen und FTP-Hinweis',
        text: 'Eigene Zonen im Profil. Im Plan weist ein Hinweis auf eine vermutlich zu niedrige FTP hin.',
      },
    ],
  },
  {
    date: '2026-10-22',
    changes: [
      {
        kind: 'Neu',
        title: 'Workout-Player',
        text: 'Workouts direkt in der App fahren.',
      },
      {
        kind: 'Neu',
        title: 'Anderes Training wählen',
        text: 'Das Workout des Tages lässt sich gegen jedes Bibliotheks-Workout tauschen.',
      },
      {
        kind: 'Neu',
        title: 'Registrierung mit Einladung',
        text: 'quaelmich ist in der Beta nur mit Einladungscode offen.',
      },
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      {
        kind: 'Neu',
        title: 'Strava verbinden',
        text: 'Strava-Fahrten kommen in den Plan, Werte wie Maximalpuls schlägt quaelmich vor.',
      },
      {
        kind: 'Neu',
        title: 'Training nach Puls',
        text: 'Wer ohne Wattmesser fährt, wählt den Puls-Modus mit Pulszonen bei jedem Abschnitt.',
      },
      {
        kind: 'Neu',
        title: '"Heute lieber anders?"',
        text: 'Leichter, härter, kürzer oder länger – und jederzeit zurück zum Original.',
      },
      {
        kind: 'Neu',
        title: 'Fortschritt im Plan',
        text: 'Balken vom Start bis zum Event, nach Phasen gefärbt, mit Countdown.',
      },
    ],
  },
  {
    date: '2026-10-20',
    changes: [
      {
        kind: 'Neu',
        title: 'Der Start der Beta',
        text: 'Trainingsplan fürs Event, Anbindung an intervals.icu und der Vergleich von geplant und gefahren.',
      },
    ],
  },
]

# Wochenplan – wieder in vier übersichtlichen Dateien

```text
Wochenplanner/
├── index.html               → Passwortseite
├── wochenuebersicht.html    → Kalender, GitHub-Einstellungen und gespeicherte Termine
├── styles.css              → Gesamte Gestaltung
└── script.js               → Bedienung und GitHub-Speicherung
```

Die aktuelle Gestaltung wurde aus deiner veröffentlichten Website übernommen. Wie gewünscht startet diese neue Version ohne Einträge. Alle bisherigen Ausgabeverzeichnisse bleiben unverändert.

## Einmal auf GitHub austauschen

1. ZIP entpacken.
2. Im Repository `dbading/Web-Wochenplanner` die **vier Dateien gemeinsam** hochladen. Sie liegen im selben Ordner, aus dem GitHub Pages veröffentlicht wird. Die neue `index.html` ersetzt die bisherige Ein-Datei-Version.
3. Wenn dein Pages-Quellordner die Repository-Wurzel ist, alle vier Dateien direkt dort ablegen. Die optionale `.nojekyll` kann mit hochgeladen werden.
4. Nach der Veröffentlichung `https://dbading.github.io/Web-Wochenplanner/` öffnen. Falls noch die alte Version erscheint, die Seite vollständig neu laden bzw. den Website-Cache aktualisieren.
5. Wie bisher mit `wochenstart` anmelden.
6. Unter „GitHub-Einstellungen“ mit deinem bestehenden Token verbinden. Es ist kein neuer Token nötig, solange er weiterhin „Contents: Read and write“ für dieses Repository besitzt.

Vorbelegt sind:

```text
GitHub-Name: dbading
Repository: Web-Wochenplanner
Branch: main
Dateipfad: wochenuebersicht.html
```

**Der GitHub-Dateipfad ist jetzt `wochenuebersicht.html`, nicht mehr `index.html`.** Die neuen Einstellungen sind bereits so eingetragen. Falls du aus einem Unterordner veröffentlichst, den Repository-Pfad entsprechend ergänzen, etwa `docs/wochenuebersicht.html`.

## Wo werden Termine gespeichert?

Die Einträge bleiben direkt im JSON-Datenblock unten in `wochenuebersicht.html` gespeichert. Mit **„Auf GitHub speichern“** wird ausschließlich diese Datei im Repository aktualisiert. Gestaltung und JavaScript bleiben eigene Dateien und werden beim Termin-Speichern nicht überschrieben.

Die Daten sind nach Kalenderwochen getrennt. Neue Einträge, bearbeitete Beschreibungen, Tageszuordnung, Reihenfolge sowie Erledigt-/Löschmarkierungen werden übernommen. GitHub Pages veröffentlicht den Commit anschließend; das kann einige Minuten dauern. „GitHub-Stand laden“ liest bei Bedarf den neuesten Stand direkt aus dem Repository.

Änderungen an anderen Kalenderwochen können zusammengeführt werden. Unterschiedliche Änderungen an derselben Woche werden nicht ungefragt überschrieben. Bei einem Konflikt zuerst eine HTML-Sicherung anlegen, den aktuellen GitHub-Stand laden und Unterschiede manuell übernehmen.

## Verschieben und Löschen

- **Innerhalb eines Tages:** den Griff ☰ links gedrückt halten und nach oben oder unten ziehen. Eine Linie zeigt die neue Position. Das funktioniert auch bei den Wochen-To-dos.
- **Anderer Tag / Wochen-To-do:** das Pfeilmenü öffnen und ein neues Ziel auswählen.
- **Löschen:** im Pfeilmenü „Löschen …“ wählen und die Rückfrage bestätigen. „Abbrechen“ erhält den Eintrag.
- **Erledigt:** im Menü „Erledigt“ wählen. Über „Wieder öffnen“ wird die Durchstreichung aufgehoben.
- **Beschreibung:** doppelt auf den Beschreibungstext klicken.

Das Menü wird nicht mehr vorzeitig durch einen Fokuswechsel geschlossen. Außenklick, Escape oder die ausgeführte Aktion schließen es. Der Griff unterscheidet jetzt einen echten Ziehvorgang von einem einfachen Klick. Es gibt zusätzlich die Pfeiltasten hoch/runter, wenn der Griff mit der Tastatur fokussiert ist.

**Nach deinen Änderungen auf „Auf GitHub speichern“ klicken.** Bis zur bestätigten Speicherung bleiben sie nur im geöffneten Tab.

## Selbst anpassen

- Farben, Abstände und Schrift: `styles.css`.
- Begrüßung und Passwortseite: `index.html`.
- Kalendertitel, Legende, Namen und Eingabeformular: `wochenuebersicht.html`.
- Funktionen und das einfache Passwort: `script.js`. Oben steht `const PASSWORT = "wochenstart";`.
- Der gespeicherte Kalender steht im Block `kalender-daten` in `wochenuebersicht.html`.
- Öffentliche Repository-Einstellungen stehen im Block `github-konfiguration` in derselben Datei. Dort kein Token eintragen.

Alle vier Dateien gehören zusammen. Eine heruntergeladene HTML-Sicherung enthält den Kalenderstand und Verweise auf `styles.css` und `script.js`; sie braucht zum Anzeigen und Bedienen diese Dateien neben sich. Zum Wiederherstellen zuerst den aktuellen Repository-Stand sichern, damit eine manuelle Dateiersetzung keine neueren Termine überschreibt.

## Anmeldung und Token

Die Passwortseite merkt die einfache Anmeldung im Sitzungsspeicher des Tabs. Das ist weiterhin kein Schutz für öffentliche Termine im HTML. Der GitHub-Token bleibt ausschließlich im Arbeitsspeicher, wird nach dem Verbinden aus dem Eingabefeld entfernt und weder mit hochgeladen noch in einer Sicherung gespeichert. Nach Neuladen oder Abmelden erneut verbinden. „GitHub trennen“ entfernt den Token ebenfalls.

Diese Dateien wurden hier nicht in dein Repository hochgeladen. Die Bedienung wurde lokal in Chromium mit Maus und Touch sowie in der Safari-Browserengine WebKit geprüft: Sortieren, Tageswechsel, Löschen mit Abbrechen/Bestätigen, Erledigen, Bearbeiten und erneutes Laden. Der ursprüngliche Menüfehler konnte in WebKit reproduziert werden; die neue Version besteht den Test. GitHub-Schreibzugriffe in den Tests wurden simuliert und ändern dein echtes Repository nicht.

## Falls Speichern nicht in der HTML-Datei erscheint

„Hinzufügen“ ändert zunächst den Kalender im geöffneten Tab. Erst „Auf GitHub speichern“ schreibt in die Datei `wochenuebersicht.html` im Repository. Die lokale heruntergeladene Datei auf deinem Computer wird dadurch nicht geändert.

Bei der Prüfung am 2. November 2026 lag im Repository noch die frühere einzelne `index.html`; `wochenuebersicht.html`, `script.js` und `styles.css` waren dort nicht vorhanden. Die aufgeteilte Version benötigt deshalb zuerst den gemeinsamen Upload aller vier Dateien. Danach unter „GitHub-Einstellungen“ als Pfad `wochenuebersicht.html` verwenden, mit dem Token verbinden und Änderungen ausdrücklich speichern. Die eigentlichen Termine stehen am Ende dieser Datei im JSON-Block `kalender-daten`, nicht als fest eingetragene HTML-Listenelemente.

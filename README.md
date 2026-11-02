# Wochenplan mit Speicherung bei GitHub

Die Datei `index.html` enthält die komplette Website einschließlich Gestaltung, JavaScript und Kalenderdaten. Kein Python, keine Datenbank und kein weiterer Anbieter sind nötig. Eure bisherigen Versionen bleiben unverändert.

Vorbelegt sind die öffentlichen Einstellungen:

```text
GitHub-Name: dbading
Repository: Wochenplanner
Branch: main
Dateipfad: index.html
Geplante Website: https://dbading.github.io/Wochenplanner/
```

Die angegebene öffentliche Seite konnte während der Vorbereitung nicht abgerufen werden. Branch und Dateipfad sind deshalb Annahmen und müssen mit den tatsächlichen Repository-Einstellungen übereinstimmen. Alle vier Werte lassen sich in der Website unter „GitHub-Einstellungen“ ändern.

## 1. Einmal die neue Website hochladen

1. ZIP entpacken.
2. `https://github.com/dbading/Wochenplanner` im Browser öffnen.
3. Die neue `index.html` in den Branch und Ordner hochladen, aus dem GitHub Pages veröffentlicht wird. Eine bisherige gleichnamige Datei wird damit ersetzt; eine gewünschte Sicherung vorher herunterladen.
4. Unter Repository → Settings → Pages prüfen, dass aus dem richtigen Branch veröffentlicht wird, z. B. `main` und `/ (root)` über „Deploy from a branch“.
5. Falls Pages aus `docs/` veröffentlicht, gehört die Datei nach `docs/index.html`; in den GitHub-Einstellungen der Website dann ebenfalls `docs/index.html` eintragen. Die Websiteadresse kann dabei gleich bleiben.
6. Warten, bis GitHub Pages die neue Version veröffentlicht hat. Danach die Website öffnen und wie bisher mit `wochenstart` anmelden.

Nur `index.html` muss veröffentlicht werden; `.nojekyll` kann zusätzlich hochgeladen werden. Die Anleitung muss nicht auf die Website. Die neue Version muss zuerst manuell hochgeladen sein: Sie ersetzt keine beliebige alte HTML-Datei ungefragt.

## 2. Einen eingeschränkten GitHub-Token anlegen

Den Token direkt bei GitHub anlegen, nicht im Chat mitteilen:

1. GitHub → Profilbild → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Einen verständlichen Namen und eine passende begrenzte Gültigkeit wählen.
3. Resource owner: `dbading`.
4. Repository access: „Only select repositories“ → ausschließlich `Wochenplanner` auswählen.
5. Unter Repository permissions → Contents: **Read and write** setzen. Metadata-Leserechte werden von GitHub automatisch ergänzt. Keine Verwaltungs-, Workflow- oder sonstigen zusätzlichen Rechte für diese Version nötig.
6. Den erzeugten Token privat aufbewahren, beispielsweise in deinem Passwortmanager. Er wird von GitHub nur einmal vollständig angezeigt.

Der Token erlaubt Änderungen an den Inhalten dieses Repositorys, nicht nur an einem einzelnen Termin. Er darf nie in `index.html`, einer öffentlich hochgeladenen Konfigurationsdatei oder einem Screenshot stehen. Die Website fragt den Token nur bei Bedarf ab und legt ihn weder im localStorage noch im sessionStorage ab.

Bei einem geschützten Branch, Organisationsregeln oder fehlenden Rechten kann direktes Speichern abgelehnt werden. Für den vorgesehenen privaten Wochenplan als separates Repository muss dein Token in den Pages-Quellbranch schreiben dürfen. Die Website umgeht keine Branch-Regeln.

## 3. Verbinden und Termine speichern

1. In der veröffentlichten Website „GitHub-Einstellungen“ aufklappen.
2. Name, Repository, Branch und Dateipfad prüfen.
3. Den Token in das Passwortfeld einfügen und „Verbinden / Stand prüfen“ wählen.
4. Das Eingabefeld wird anschließend geleert. Der Token bleibt nur im Arbeitsspeicher dieses geöffneten Tabs. Beim Neuladen, Schließen, „GitHub trennen“ oder „Abmelden“ muss er erneut eingegeben werden.
5. Termine wie gewohnt anlegen, bearbeiten, zuordnen, umsortieren und erledigen.
6. Änderungen mit **„Auf GitHub speichern“** gesammelt veröffentlichen. Der Knopf speichert alle im Tab geänderten Kalenderwochen in einem gemeinsamen Commit.
7. Auf die ausdrückliche GitHub-Erfolgsmeldung warten. GitHub Pages veröffentlicht den Commit danach. Das kann einige Minuten dauern.

Es gibt absichtlich kein automatisches Veröffentlichen nach jedem Tastendruck. Wenn du nicht auf „Auf GitHub speichern“ klickst, liegen Änderungen nur im geöffneten Tab. „HTML-Sicherung“ lädt eine private Kopie deines aktuellen Entwurfs herunter, ohne bei GitHub zu speichern. Der Browser warnt beim Verlassen offener Änderungen, soweit er solche Warnungen unterstützt.

## Auf einem anderen Gerät

Die veröffentlichte Website zeigt die dort eingebetteten gespeicherten Termine. „GitHub-Stand laden“ liest den neuesten Datenstand direkt aus dem Repository, auch wenn die Pages-Veröffentlichung noch hinterherhinkt. Bei einem öffentlichen Repository geht Lesen ohne Token. Vorhandene lokale Änderungen werden nur nach Bestätigung verworfen.

Zum Bearbeiten und Speichern muss das jeweilige Gerät mit einem passenden Token verbunden werden. Jede Person sollte ihre eigenen GitHub-Zugriffsmöglichkeiten verwenden; Fine-grained Tokens haben bei externen Repository-Mitarbeitern Einschränkungen. Diese einfache Version ist zunächst auf den Repository-Eigentümer zugeschnitten. Ein gemeinsames normales Kalenderpasswort allein gewährt kein Schreibrecht bei GitHub.

## Gleichzeitige Änderungen

Vor jedem Speichern wird die aktuelle HTML-Datei mitsamt ihrem GitHub-Dateistand (SHA) geladen. Die Änderung wird nur auf genau diesen Stand geschrieben.

- Änderungen an unterschiedlichen Kalenderwochen können zusammengeführt werden.
- Wurde dieselbe Woche unterschiedlich geändert, wird das Speichern blockiert. Der Entwurf bleibt im Tab. Erst eine HTML-Sicherung herunterladen, dann den aktuellen GitHub-Stand laden und Unterschiede manuell übernehmen.
- Ändert jemand die Datei während der Übertragung, kann GitHub den Schreibversuch ablehnen. Erneut speichern lädt und prüft den aktuellen Stand noch einmal.
- Änderungen am übrigen HTML, die bereits im Repository stehen, bleiben beim Speichern erhalten: Ersetzt werden nur der Kalender-Datenblock und die öffentlichen Verbindungsdaten.
- Während einer GitHub-Anfrage ist die Kalenderfläche kurz gesperrt, damit kein teilweise geänderter Formularstand überschrieben wird.

## Was öffentlich ist

Die Termine und das einfache Kalenderpasswort stehen lesbar in der öffentlichen HTML-Datei. Das ist weiterhin kein vertraulicher Kalender. Der GitHub-Token hingegen gehört niemals hinein. Er wird ausschließlich im Authorization-Header an `https://api.github.com` übermittelt. Dateidownloads und Repository-Commits enthalten ihn nicht.

GitHub speichert die Commit-Historie: Ein gelöschter Termin kann in älteren Dateiversionen weiterhin sichtbar sein. Erledigt-/Löschmarkierungen bleiben auch im aktuellen Datenblock gespeichert. Der Kalender ist deshalb ausschließlich für Inhalte gedacht, die ihr öffentlich teilen wollt.

## Technische Grenzen

- GitHub Pages veröffentlicht nicht in Echtzeit. Gespeichert im Repository und veröffentlicht auf der Website sind zwei getrennte Schritte.
- Standard-Veröffentlichungen haben ein weiches Limit von zehn Builds pro Stunde. Änderungen deshalb sinnvoll sammeln.
- Die GitHub-API hat ebenfalls Anfrage-Limits. Bei einer entsprechenden Fehlermeldung warten; der Entwurf bleibt im Tab.
- Diese einfache Version begrenzt die HTML-Datei beim Speichern auf ungefähr 950 KB. Für sehr große Kalender müsste die Speicherung später angepasst werden.
- Wenn der Token abläuft oder die Verbindung ausfällt, bleibt der Entwurf zunächst nur im geöffneten Tab. Eine HTML-Sicherung anlegen und später erneut verbinden.
- Die Anbindung wurde mit simulierten GitHub-Antworten geprüft. Ein echter Commit und die Pages-Veröffentlichung sind noch nicht getestet, weil kein Zugriff auf das Repository eingerichtet wurde.

## Dateien selbst ändern

Die Gestaltung steht im `<style>`-Block. Die Kalenderoberfläche steht in `<template id="kalender-vorlage">`. Die Termine stehen in `<script id="kalender-daten" type="application/json">`. Die öffentlichen GitHub-Einstellungen stehen im eigenen JSON-Block `github-konfiguration`. Dort existiert bewusst kein Token-Feld. Die Programmlogik befindet sich in `wochenplan-logik`.

Wenn du eine HTML-Sicherung erneut hochlädst, solltest du vorher sicherstellen, dass inzwischen keine neueren Änderungen im Repository liegen. Eine manuelle Dateiersetzung führt keine Konfliktprüfung dieser Website aus.

## Offizielle Dokumentation

- Dateien per GitHub-API ändern: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents
- Fine-grained Tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Pages einrichten: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub Pages Limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

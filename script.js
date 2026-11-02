// 1. Passwortseite. Das einfache Passwort ist weiterhin im Quelltext sichtbar.
// 2. GitHub-Speicherung. 3. Kalenderfunktionen.
(function () {
const PASSWORT = "wochenstart";
const LOGIN_KEY = "wochenplan-angemeldet";
const login = document.getElementById("login-formular");
if (login) {
  login.addEventListener("submit", function (event) {
    event.preventDefault();
    const eingabe = document.getElementById("passwort");
    const fehler = document.getElementById("fehlermeldung");
    if (eingabe.value !== PASSWORT) {
      fehler.textContent = "Das Passwort stimmt noch nicht.";
      eingabe.select();
      return;
    }
    try {
      sessionStorage.setItem(LOGIN_KEY, "ja");
      window.location.href = "wochenuebersicht.html";
    } catch (error) { fehler.textContent = "Bitte den Sitzungsspeicher im Browser erlauben."; }
  });
  return;
}
let angemeldet = false;
try { angemeldet = sessionStorage.getItem(LOGIN_KEY) === "ja"; } catch (error) {}
if (!angemeldet) { window.location.replace("index.html"); return; }

// GitHub ist der gemeinsame Speicher. Der Token bleibt ausschließlich im Arbeitsspeicher.
const htmlSpeicher = (function () {
  const felder = {
    "wochenplan-eintraege-v1": "eintraege", "wochenplan-status-v1": "status",
    "wochenplan-zuordnungen-v1": "zuordnungen", "wochenplan-reihenfolge-v1": "reihenfolge"
  };
  const datenBlock = /(<script id="kalender-daten" type="application\/json">)([\s\S]*?)(<\/script>)/;
  const configBlock = /(<script id="github-konfiguration" type="application\/json">)([\s\S]*?)(<\/script>)/;
  const appId = document.querySelector('meta[name="wochenplan-id"]').content;
  let config = JSON.parse(document.getElementById("github-konfiguration").textContent);
  let alleWochen = JSON.parse(document.getElementById("kalender-daten").textContent);
  let basis = structuredClone(alleWochen), woche;
  let original = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  let token = "", verbunden = false, beschaeftigt = false;
  const el = id => document.getElementById(id);
  const status = text => { el("github-status").textContent = text; };
  function kanonisch(wert) {
    if (Array.isArray(wert)) return wert.map(kanonisch);
    if (wert && typeof wert === "object") return Object.fromEntries(Object.keys(wert).sort().map(key => [key, kanonisch(wert[key])]));
    return wert;
  }
  const gleich = (a, b) => JSON.stringify(kanonisch(a)) === JSON.stringify(kanonisch(b));
  const ungespeichert = () => !gleich(alleWochen, basis);
  function beschaeftigtSetzen(wert) {
    beschaeftigt = wert;
    el("github-speichern").disabled = wert;
    el("github-verbinden").disabled = wert;
    el("github-trennen").disabled = wert;
    el("github-neuladen").disabled = wert;
    // Während des Netzwerkvorgangs bleibt der angezeigte Entwurf unverändert.
    el("kalender-bereich").inert = wert;
  }
  function configPruefen(wert) {
    const c = Object.fromEntries(["owner", "repo", "branch", "path"].map(key => [key, String(wert[key] || "").trim()]));
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(c.owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(c.repo) || [".", ".."].includes(c.repo)) throw new Error("Bitte GitHub-Name und Repository prüfen.");
    if (!c.branch || c.branch.length > 200 || /[\x00-\x1f]/.test(c.branch)) throw new Error("Bitte den Branch prüfen.");
    if (!c.path.endsWith(".html") || c.path.startsWith("/") || c.path.split("/").some(part => !part || part === "." || part === ".." || /[\x00-\x1f]/.test(part))) throw new Error("Bitte einen relativen HTML-Dateipfad eintragen, zum Beispiel wochenuebersicht.html.");
    return c;
  }
  function ausFormular() {
    return configPruefen(Object.fromEntries(["owner", "repo", "branch", "path"].map(key => [key, el("github-" + key).value])));
  }
  function formularFuellen() {
    ["owner", "repo", "branch", "path"].forEach(key => { el("github-" + key).value = config[key]; });
  }
  function lesenAusHtml(html) {
    const m = datenBlock.exec(html);
    if (!m) throw new Error("In dieser Datei fehlt der Kalender-Datenblock. Bitte zuerst die neue wochenuebersicht.html hochladen.");
    const daten = JSON.parse(m[2]);
    if (!daten || typeof daten !== "object" || Array.isArray(daten)) throw new Error("Ungültiger Kalender-Datenblock.");
    return daten;
  }
  function jsonSicher(wert) {
    return JSON.stringify(wert, null, 2).replace(/&/g, "\\u0026").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  function htmlErstellen(vorlage, daten, einstellungen) {
    if (!datenBlock.test(vorlage) || !configBlock.test(vorlage)) throw new Error("Die GitHub-Version ist noch nicht vollständig hochgeladen.");
    return vorlage.replace(datenBlock, (_, a, alt, e) => a + "\n" + jsonSicher(daten) + "\n" + e)
      .replace(configBlock, (_, a, alt, e) => a + "\n" + jsonSicher(einstellungen) + "\n" + e);
  }
  function base64Text(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }
  function textBase64(text) {
    const binary = atob(text.replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  }
  function apiUrl(c) {
    return "https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo)
      + "/contents/" + c.path.split("/").map(encodeURIComponent).join("/");
  }
  async function anfrage(c, schluessel, methode = "GET", body) {
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" };
    if (schluessel) headers.Authorization = "Bearer " + schluessel;
    if (body) headers["Content-Type"] = "application/json";
    const url = apiUrl(c) + (methode === "GET" ? "?ref=" + encodeURIComponent(c.branch) : "");
    let response;
    try {
      response = await fetch(url, { method: methode, headers, body: body ? JSON.stringify(body) : undefined,
        cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(30000) });
    } catch (error) { throw new Error("GitHub ist gerade nicht erreichbar oder antwortet nicht rechtzeitig. Der Entwurf bleibt in diesem Tab. Bei unklarem Speicherergebnis erneut prüfen; vorher gegebenenfalls eine HTML-Sicherung herunterladen."); }
    if (!response.ok) {
      const error = new Error(({401:"Der GitHub-Token ist ungültig oder abgelaufen.",403:"GitHub verweigert den Zugriff. Token-Rechte, Branch-Schutz und API-Limit prüfen.",404:"Datei oder Branch nicht gefunden. Repository, Branch und Dateipfad prüfen; die neue wochenuebersicht.html muss bereits hochgeladen sein.",409:"Die Datei wurde während des Speicherns geändert. Bitte erneut speichern; der aktuelle Stand wird vorher neu geprüft.",422:"GitHub hat die Änderung abgelehnt. Branch, Dateistand und Repository-Regeln prüfen.",429:"Zu viele Anfragen. Bitte etwas warten und erneut versuchen."})[response.status] || "GitHub konnte die Anfrage nicht ausführen. Bitte später erneut versuchen.");
      error.konflikt = response.status === 409;
      throw error;
    }
    return response.json();
  }
  async function dateiLesen(c, schluessel) {
    const datei = await anfrage(c, schluessel);
    if (datei.type !== "file" || datei.encoding !== "base64" || typeof datei.content !== "string" || !datei.sha) throw new Error("Die Zieldatei ist keine unterstützte HTML-Datei oder zu groß.");
    const html = textBase64(datei.content);
    if (!html.includes('name="wochenplan-id" content="' + appId + '"') || !configBlock.test(html)) throw new Error("Die Datei gehört zu einer anderen Kalender-Version. Bitte zuerst diese neue wochenuebersicht.html im Zielrepository hochladen.");
    return { html, daten: lesenAusHtml(html), sha: datei.sha };
  }
  function wochenZusammenfuehren(remote, lokal, vorher) {
    const result = structuredClone(remote);
    const wochen = new Set([...Object.keys(vorher), ...Object.keys(lokal)]);
    for (const kw of wochen) {
      if (gleich(lokal[kw], vorher[kw])) continue;
      if (!gleich(remote[kw], vorher[kw]) && !gleich(remote[kw], lokal[kw])) throw new Error("Konflikt in " + kw + ": Diese Woche wurde auf einem anderen Gerät geändert. Bitte erst eine HTML-Sicherung deines Entwurfs herunterladen und dann ‚GitHub-Stand laden‘ wählen. Unterschiede anschließend manuell übernehmen.");
      if (lokal[kw] === undefined) delete result[kw]; else result[kw] = structuredClone(lokal[kw]);
    }
    return result;
  }
  async function verbinden(event) {
    if (event) event.preventDefault();
    if (beschaeftigt) return;
    let candidate;
    const eingegeben = el("github-token").value.trim();
    el("github-token").value = "";
    try {
      candidate = ausFormular();
      // Ein Token wird niemals automatisch auf ein anderes Repository übertragen.
      const gleichesZiel = gleich(candidate, config);
      const kandidatToken = eingegeben || (gleichesZiel ? token : "");
      beschaeftigtSetzen(true);
      status("Aktueller Stand wird von GitHub gelesen …");
      const remote = await dateiLesen(candidate, kandidatToken);
      const lokalGeaendert = ungespeichert();
      const remoteGeaendert = !gleich(remote.daten, basis);
      if (!gleichesZiel && lokalGeaendert) throw new Error("Vor dem Wechsel des Repositorys bitte den lokalen Entwurf sichern und die neue Seite öffnen.");
      if (!lokalGeaendert && remoteGeaendert && document.getElementById("eintrag-text")?.value.trim()) throw new Error("Bitte den begonnenen Stichpunkt zuerst hinzufügen oder abbrechen und danach erneut verbinden.");
      config = candidate;
      token = kandidatToken;
      verbunden = true;
      original = remote.html;
      if (!lokalGeaendert) {
        alleWochen = structuredClone(remote.daten);
        basis = structuredClone(remote.daten);
        if (remoteGeaendert && typeof kalenderAnzeigen === "function") await kalenderAnzeigen(aktuelleWoche);
      }
      el("github-einstellungen").open = false;
      status(token ? "Mit " + config.owner + "/" + config.repo + " verbunden. Änderungen erst mit ‚Auf GitHub speichern‘ veröffentlichen."
        : "GitHub-Stand geladen. Zum Speichern in den Einstellungen einen Token eingeben und erneut verbinden.");
    } catch (error) { status(error.message); }
    finally { beschaeftigtSetzen(false); }
  }
  async function speichern() {
    if (beschaeftigt) return;
    if (!verbunden || !token) {
      el("github-einstellungen").open = true;
      el("github-token").focus();
      status("Bitte zuerst die Verbindung prüfen und einen GitHub-Token mit Contents-Schreibrecht eingeben. Er bleibt nur im geöffneten Tab.");
      return;
    }
    if (document.getElementById("eintrag-text")?.value.trim()) {
      status("Bitte den begonnenen Stichpunkt zuerst hinzufügen oder abbrechen und danach auf GitHub speichern.");
      return;
    }
    beschaeftigtSetzen(true);
    const snapshot = structuredClone(alleWochen);
    const basisSnapshot = structuredClone(basis);
    try {
      status("GitHub-Stand wird geprüft …");
      const remote = await dateiLesen(config, token);
      const vereinigt = wochenZusammenfuehren(remote.daten, snapshot, basisSnapshot);
      const neu = htmlErstellen(remote.html, vereinigt, config);
      if (neu === remote.html || (gleich(vereinigt, remote.daten) && gleich(JSON.parse(configBlock.exec(remote.html)[2]), config))) {
        original = remote.html;
        basis = structuredClone(remote.daten);
        alleWochen = wochenZusammenfuehren(remote.daten, alleWochen, snapshot);
        if (!gleich(snapshot[woche], alleWochen[woche]) && typeof kalenderAnzeigen === "function") await kalenderAnzeigen(aktuelleWoche);
        status("Der aktuelle Stand ist bereits bei GitHub gespeichert.");
        return;
      }
      if (new TextEncoder().encode(neu).length > 950000) throw new Error("Die HTML-Datei wird zu groß für diese einfache GitHub-Anbindung. Bitte eine Sicherung erstellen.");
      status("HTML-Datei wird bei GitHub gespeichert …");
      const result = await anfrage(config, token, "PUT", { message: "Wochenplan aktualisieren", content: base64Text(neu), sha: remote.sha, branch: config.branch });
      if (!result.commit?.sha || !result.content?.sha) throw new Error("GitHub hat das Speichern nicht eindeutig bestätigt. Vor einem erneuten Versuch den Entwurf sichern.");
      original = neu;
      basis = structuredClone(vereinigt);
      alleWochen = wochenZusammenfuehren(vereinigt, alleWochen, snapshot);
      if (!gleich(snapshot[woche], alleWochen[woche]) && typeof kalenderAnzeigen === "function") await kalenderAnzeigen(aktuelleWoche);
      status(ungespeichert() ? "GitHub hat den Stand gespeichert. Weitere Änderungen in diesem Tab sind noch offen."
        : "Bei GitHub gespeichert. GitHub Pages veröffentlicht den neuen Stand anschließend; das kann einige Minuten dauern.");
    } catch (error) { status(error.message); }
    finally { beschaeftigtSetzen(false); }
  }
  async function standLaden() {
    if (beschaeftigt) return;
    if ((ungespeichert() || document.getElementById("eintrag-text")?.value.trim()) && !window.confirm("Lokale Änderungen und begonnene Eingaben verwerfen und den aktuellen Stand von GitHub laden? Bitte vorher eine HTML-Sicherung herunterladen, wenn du sie behalten möchtest.")) return;
    beschaeftigtSetzen(true);
    try {
      const c = verbunden ? config : ausFormular();
      const remote = await dateiLesen(c, verbunden ? token : "");
      config = c;
      original = remote.html;
      alleWochen = structuredClone(remote.daten);
      basis = structuredClone(remote.daten);
      verbunden = true;
      formularFuellen();
      if (typeof kalenderAnzeigen === "function") await kalenderAnzeigen(aktuelleWoche);
      status("Aktuellen Stand direkt von GitHub geladen.");
    } catch (error) { status(error.message); }
    finally { beschaeftigtSetzen(false); }
  }
  function schreiben(key, text) {
    if (beschaeftigt) throw new Error("Bitte warten, bis die GitHub-Anfrage abgeschlossen ist.");
    if (!Object.hasOwn(felder, key)) throw new Error("Unbekannter Datenbereich.");
    const stand = alleWochen[woche] ||= { version: 1, eintraege: [], status: {}, zuordnungen: {}, reihenfolge: {} };
    stand[felder[key]] = JSON.parse(text);
    status("Änderungen nur in diesem Tab – zum Veröffentlichen ‚Auf GitHub speichern‘ wählen.");
  }
  function herunterladen() {
    const neu = htmlErstellen(original, alleWochen, config);
    const url = URL.createObjectURL(new Blob([neu], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "wochenuebersicht.html";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("HTML-Sicherung heruntergeladen. Sie enthält die Termine und öffentliche Repository-Einstellungen, keinen Token. GitHub wurde dadurch nicht geändert.");
  }
  function trennen() {
    token = "";
    verbunden = false;
    el("github-token").value = "";
    status("GitHub-Verbindung getrennt und Token aus dem Arbeitsspeicher entfernt. Dein Entwurf bleibt in diesem Tab.");
  }
  formularFuellen();
  el("github-formular").addEventListener("submit", verbinden);
  el("github-speichern").addEventListener("click", speichern);
  el("github-neuladen").addEventListener("click", standLaden);
  el("github-download").addEventListener("click", herunterladen);
  el("github-trennen").addEventListener("click", trennen);
  window.addEventListener("beforeunload", function (event) {
    if (ungespeichert() || beschaeftigt) { event.preventDefault(); event.returnValue = ""; }
  });
  status("Angezeigt wird der veröffentlichte Stand. Unter ‚GitHub-Einstellungen‘ verbinden, um direkt im Repository zu speichern.");
  return { async laden(kw) { woche = kw; }, lesen(key, fallback) {
    const wert = alleWochen[woche]?.[felder[key]]; return wert === undefined ? fallback : JSON.stringify(wert);
  }, schreiben, async flush() {}, ungespeichert, trennen };
})();


// Kalender-Oberfläche. Alle bisherigen Bearbeitungsfunktionen bleiben erhalten.
let aktuelleWoche;
let renderNummer = 0;
async function kalenderAnzeigen(gewuenschteWoche) {
  const meinRender = ++renderNummer;
  await htmlSpeicher.flush();
  if (meinRender !== renderNummer) return;
  const spalten = document.querySelector(".journal")?.classList.contains("spaltenansicht");
  const kalenderBereich = document.getElementById("kalender-bereich");
  kalenderBereich.innerHTML = document.getElementById("kalender-vorlage").innerHTML;
  kalenderBereich.onpointerdown = function (event) {
    if (event.target.closest(".tag-dropdown, .tag-pfeil")) return;
    kalenderBereich.querySelectorAll(".tag-dropdown").forEach(menu => { menu.hidden = true; });
    kalenderBereich.querySelectorAll(".tag-pfeil").forEach(button => button.setAttribute("aria-expanded", "false"));
  };

// 4. Wochenplan: zwischen Liste und Spalten wechseln.
const ansichtKnopf = document.getElementById("ansicht-wechseln");
if (ansichtKnopf) {
  ansichtKnopf.addEventListener("click", function () {
    const spalten = document.querySelector(".journal").classList.toggle("spaltenansicht");
    ansichtKnopf.textContent = spalten ? "Listenansicht" : "Spaltenansicht";
    ansichtKnopf.setAttribute("aria-pressed", String(spalten));
  });

  // Kalenderwochen nach ISO: Montag ist der erste Tag der Woche.
  const bisherigeWoche = "2026-W45";
  function wochenMontag(jahr, woche) {
    const vierterJanuar = new Date(Date.UTC(jahr, 0, 4));
    const tag = vierterJanuar.getUTCDay() || 7;
    vierterJanuar.setUTCDate(4 - tag + 1 + (woche - 1) * 7);
    return vierterJanuar;
  }
  function wochenAnzahl(jahr) {
    return Math.round((wochenMontag(jahr + 1, 1) - wochenMontag(jahr, 1)) / 604800000);
  }
  const seitenUrl = new URL(window.location.href);
  const angefragt = /^(\d{4})-W(\d{2})$/.exec(gewuenschteWoche || seitenUrl.searchParams.get("woche") || bisherigeWoche);
  let jahr = angefragt ? Number(angefragt[1]) : 2026;
  let woche = angefragt ? Number(angefragt[2]) : 45;
  if (jahr < 1900 || jahr > 9998 || woche < 1 || woche > wochenAnzahl(jahr)) {
    jahr = 2026;
    woche = 45;
  }
  const wochenId = jahr + "-W" + String(woche).padStart(2, "0");
  const jahrAuswahl = document.getElementById("kalenderjahr");
  const wochenAuswahl = document.getElementById("kalenderwoche");
  function optionHinzufuegen(auswahl, wert, text) {
    const option = document.createElement("option");
    option.value = String(wert);
    option.textContent = text;
    auswahl.appendChild(option);
  }
  if (wochenAuswahl && jahrAuswahl) {
    const jahre = new Set();
    [2026, new Date().getFullYear(), jahr].forEach(function (mitte) {
      for (let j = mitte - 3; j <= mitte + 3; j++) {
        if (j >= 1900 && j <= 9998) jahre.add(j);
      }
    });
    Array.from(jahre).sort((a, b) => a - b).forEach(j => optionHinzufuegen(jahrAuswahl, j, String(j)));
    jahrAuswahl.value = String(jahr);
    function wochenOptionen(j, gewaehlt) {
      wochenAuswahl.replaceChildren();
      for (let k = 1; k <= wochenAnzahl(j); k++) optionHinzufuegen(wochenAuswahl, k, "KW " + k);
      wochenAuswahl.value = String(Math.min(gewaehlt, wochenAnzahl(j)));
    }
    wochenOptionen(jahr, woche);
    function wocheOeffnen() {
      if (document.getElementById("eintrag-text").value.trim() && !window.confirm("Der neue Stichpunkt wurde noch nicht hinzugefügt. Trotzdem die Woche wechseln?")) return;
      kalenderAnzeigen(jahrAuswahl.value + "-W" + wochenAuswahl.value.padStart(2, "0"));
    }
    wochenAuswahl.addEventListener("change", wocheOeffnen);
    jahrAuswahl.addEventListener("change", function () {
      wochenOptionen(Number(jahrAuswahl.value), Number(wochenAuswahl.value));
      wocheOeffnen();
    });
    const montag = wochenMontag(jahr, woche);
    const sonntag = new Date(montag);
    sonntag.setUTCDate(montag.getUTCDate() + 6);
    const datum = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    document.getElementById("wochen-zeitraum").textContent = datum.format(montag) + " – " + datum.format(sonntag);
    // Die sieben Tagesdaten werden aus dem Montag derselben ISO-Woche berechnet.
    const tagesFormat = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"
    });
    for (let tag = 0; tag < 7; tag++) {
      const tagesDatum = new Date(montag);
      tagesDatum.setUTCDate(montag.getUTCDate() + tag);
      const anzeige = document.createElement("time");
      anzeige.className = "tages-datum";
      anzeige.dateTime = tagesDatum.toISOString().slice(0, 10);
      anzeige.textContent = tagesFormat.format(tagesDatum);
      document.getElementById("titel-" + tag).insertAdjacentElement("afterend", anzeige);
    }
  }

  // Alte Browserdaten gehören zur bisher angezeigten KW 45/2026.
  // Sie bleiben als Sicherung erhalten; Änderungen werden wochenweise gespeichert.
  function wochenDatenLesen(alterKey, standard) {
    return htmlSpeicher.lesen(alterKey, standard);
  }

  await htmlSpeicher.laden(wochenId);
  aktuelleWoche = wochenId;

  // 5. Wochen-To-dos verschieben. Die Auswahl bleibt am Eintrag,
  // damit du ihn später auch zurück auf „Noch kein Tag“ setzen kannst.
  // Eigene Einträge werden getrennt von den HTML-Beispielen gespeichert.
  const eigeneKey = "wochenplan-eintraege-v1";
  let eigeneEintraege = [];
  const personen = Object.fromEntries(Array.from(document.getElementById("eintrag-person").options)
    .map(option => [option.value, option.textContent.replace(/^[○●–]\s*/, "")]));
  const ziele = ["woche", "tag-0", "tag-1", "tag-2", "tag-3", "tag-4", "tag-5", "tag-6"];
  const status = document.getElementById("eintrag-status");

  // Eine unabhängige Vorlage bleibt auch verfügbar, wenn alle Einträge gelöscht sind.
  const auswahlVorlage = document.querySelector(".tag-auswahl").cloneNode(true);
  // Ab jetzt kommen alle Einträge aus dem HTML-Datenblock.
  document.querySelectorAll("[data-aufgabe]").forEach(eintrag => eintrag.remove());

  // Erledigt-/Löschstatus wird für HTML-Beispiele und eigene Einträge gespeichert.
  const zustandKey = "wochenplan-status-v1";
  let zustaende = {};
  try {
    const geladen = JSON.parse(wochenDatenLesen(zustandKey, "{}"));
    if (geladen && typeof geladen === "object" && !Array.isArray(geladen)) zustaende = geladen;
  } catch (error) {
    status.textContent = "Der gespeicherte Erledigt-/Löschstatus konnte nicht geladen werden.";
  }
  function zustandSpeichern(text) {
    try {
      htmlSpeicher.schreiben(zustandKey, JSON.stringify(zustaende));
      status.textContent = text + " Änderung vorgemerkt – GitHub-Status siehe oben.";
    } catch (error) {
      status.textContent = text + " Nicht gespeichert: Die Änderung geht beim Neuladen verloren.";
    }
  }

  // textContent sorgt dafür, dass Beschreibungen immer als Text erscheinen.
  function eintragErstellen(eintrag) {
    const li = document.createElement("li");
    li.dataset.aufgabe = eintrag.id;
    const bullet = document.createElement("span");
    bullet.className = "bullet " + eintrag.person;
    bullet.setAttribute("role", "img");
    bullet.setAttribute("aria-label", personen[eintrag.person]);
    const inhalt = document.createElement("div");
    inhalt.className = "aufgabe-text";
    const text = document.createElement("span");
    text.textContent = eintrag.text;
    // Dieselbe Tagesauswahl wie bei den vorhandenen Wochen-To-dos.
    const auswahl = auswahlVorlage.cloneNode(true);
    auswahl.setAttribute("aria-label", "Tag für " + eintrag.text);
    auswahl.value = eintrag.ziel;
    inhalt.append(text, auswahl);
    li.append(bullet, inhalt);
    document.getElementById(eintrag.ziel).appendChild(li);
    return li;
  }

  try {
    const gespeichert = JSON.parse(wochenDatenLesen(eigeneKey, "[]"));
    if (!Array.isArray(gespeichert)) throw new Error("Ungültige Einträge");
    const ids = new Set();
    eigeneEintraege = gespeichert.filter(e => {
      if (!e || typeof e.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(e.id) ||
          ids.has(e.id) || !Object.hasOwn(personen, e.person) ||
          !ziele.includes(e.ziel) || typeof e.text !== "string" ||
          !e.text.trim() || e.text.length > 300) return false;
      ids.add(e.id);
      return true;
    });
    eigeneEintraege.forEach(eintragErstellen);
  } catch (error) {
    status.textContent = "Eigene Einträge konnten nicht geladen werden. Prüfe den Datenblock der HTML-Datei, bevor du neue speicherst.";
  }

  const aufgaben = document.querySelectorAll("[data-aufgabe]");
  const zuordnungen = {};
  const speicherKey = "wochenplan-zuordnungen-v1";
  const hinweis = document.getElementById("speicher-hinweis");

  function leerHinweisAktualisieren() {
    document.getElementById("todos-leer").hidden =
      document.getElementById("woche").children.length > 0;
  }

  // Nur die Tageszuordnung wird lokal vorgemerkt – GitHub-Status siehe oben.
  try {
    const gespeichert = JSON.parse(wochenDatenLesen(speicherKey, "{}"));
    if (gespeichert && typeof gespeichert === "object") {
      Object.assign(zuordnungen, gespeichert);
    }
  } catch (error) {
    hinweis.textContent = "Gespeicherte Zuordnungen konnten nicht geladen werden.";
  }

  // Reihenfolge: pro Liste werden nur die IDs der Einträge gespeichert.
  const reihenfolgeKey = "wochenplan-reihenfolge-v1";
  function reihenfolgeSpeichern() {
    const reihenfolge = {};
    ziele.forEach(function (ziel) {
      reihenfolge[ziel] = Array.from(document.getElementById(ziel).children)
        .map(eintrag => eintrag.dataset.aufgabe);
    });
    try {
      htmlSpeicher.schreiben(reihenfolgeKey, JSON.stringify(reihenfolge));
      status.textContent = "Reihenfolge vorgemerkt – GitHub-Status siehe oben.";
    } catch (error) {
      status.textContent = "Reihenfolge geändert, aber nicht gespeichert. Sie geht beim Neuladen verloren.";
    }
  }

  function reihenfolgeLaden() {
    try {
      const gespeichert = JSON.parse(wochenDatenLesen(reihenfolgeKey, "{}"));
      if (!gespeichert || typeof gespeichert !== "object") return;
      ziele.forEach(function (ziel) {
        const liste = document.getElementById(ziel);
        if (!Array.isArray(gespeichert[ziel])) return;
        const eintraege = Array.from(liste.children);
        // Nur Einträge dieses Tages sortieren; die Tageszuordnung bleibt erhalten.
        const bekannt = new Set(gespeichert[ziel]);
        gespeichert[ziel].forEach(function (id) {
          const eintrag = eintraege.find(e => e.dataset.aufgabe === id);
          if (eintrag) liste.appendChild(eintrag);
        });
        eintraege.filter(e => !bekannt.has(e.dataset.aufgabe))
          .forEach(e => liste.appendChild(e));
      });
    } catch (error) {
      status.textContent = "Die gespeicherte Reihenfolge konnte nicht geladen werden.";
    }
  }

  function sortiergriffHinzufuegen(aufgabe) {
    const griff = document.createElement("button");
    griff.type = "button";
    griff.className = "sortiergriff";
    griff.textContent = "☰";
    const text = aufgabe.querySelector(".aufgabe-text > span").textContent;
    griff.setAttribute("aria-label", "„" + text + "“ innerhalb der Liste verschieben");
    griff.title = "Ziehen zum Sortieren. Mit der Tastatur: Pfeil hoch / runter.";
    aufgabe.prepend(griff);

    // Pointer-Ereignisse funktionieren sowohl mit Maus als auch mit Touch.
    // Während des Ziehens zeigt eine Linie die neue Position an.
    let ziehen = null;
    function markierungenEntfernen() {
      if (!ziehen) return;
      Array.from(ziehen.liste.children).forEach(function (eintrag) {
        eintrag.classList.remove("sortierziel-vor", "sortierziel-nach");
      });
    }
    function positionBestimmen(event) {
      markierungenEntfernen();
      const rahmen = ziehen.liste.getBoundingClientRect();
      ziehen.gueltig = event.clientX >= rahmen.left && event.clientX <= rahmen.right &&
        event.clientY >= rahmen.top - 25 && event.clientY <= rahmen.bottom + 25;
      if (!ziehen.gueltig) return;
      const andere = Array.from(ziehen.liste.children).filter(e => e !== aufgabe);
      ziehen.vor = andere.find(function (eintrag) {
        const box = eintrag.getBoundingClientRect();
        return event.clientY < box.top + box.height / 2;
      }) || null;
      if (ziehen.vor) ziehen.vor.classList.add("sortierziel-vor");
      else if (andere.length) andere[andere.length - 1].classList.add("sortierziel-nach");
    }
    griff.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || ziehen) return;
      event.preventDefault();
      ziehen = { liste: aufgabe.parentElement, pointer: event.pointerId,
        startX: event.clientX, startY: event.clientY, bewegt: false, gueltig: false };
      griff.setPointerCapture(event.pointerId);
      aufgabe.classList.add("wird-sortiert");
      positionBestimmen(event);
    });
    griff.addEventListener("pointermove", function (event) {
      if (ziehen && event.pointerId === ziehen.pointer) {
        if (Math.hypot(event.clientX - ziehen.startX, event.clientY - ziehen.startY) > 5) ziehen.bewegt = true;
        positionBestimmen(event);
      }
    });
    function ziehenBeenden(event, abbrechen) {
      if (!ziehen || event.pointerId !== ziehen.pointer) return;
      if (!abbrechen) positionBestimmen(event);
      markierungenEntfernen();
      const ziel = ziehen;
      ziehen = null;
      aufgabe.classList.remove("wird-sortiert");
      if (griff.hasPointerCapture(event.pointerId)) griff.releasePointerCapture(event.pointerId);
      if (!abbrechen && ziel.gueltig && ziel.bewegt) {
        ziel.liste.insertBefore(aufgabe, ziel.vor);
        reihenfolgeSpeichern();
        griff.focus({ preventScroll: true });
      }
    }
    griff.addEventListener("pointerup", event => ziehenBeenden(event, false));
    griff.addEventListener("pointercancel", event => ziehenBeenden(event, true));
    griff.addEventListener("lostpointercapture", event => ziehenBeenden(event, true));
    griff.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && ziehen) {
        ziehenBeenden({ pointerId: ziehen.pointer }, true);
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const liste = aufgabe.parentElement;
      const nachbar = event.key === "ArrowUp" ? aufgabe.previousElementSibling : aufgabe.nextElementSibling;
      if (!nachbar) return;
      liste.insertBefore(aufgabe, event.key === "ArrowUp" ? nachbar : nachbar.nextElementSibling);
      reihenfolgeSpeichern();
      griff.focus({ preventScroll: true });
    });
    return griff;
  }

  function aufgabeVerbinden(aufgabe) {
    const auswahl = aufgabe.querySelector("select");
    const id = aufgabe.dataset.aufgabe;
    if (zustaende[id]?.geloescht === true) {
      aufgabe.remove();
      return;
    }
    const textElement = aufgabe.querySelector(".aufgabe-text > span");
    const gespeicherterText = zustaende[id]?.beschreibung;
    if (typeof gespeicherterText === "string" && gespeicherterText.trim() && gespeicherterText.length <= 300) {
      textElement.textContent = gespeicherterText;
    }
    const sortiergriff = sortiergriffHinzufuegen(aufgabe);
    const ziel = zuordnungen[id];
    // Nur Ziele aus der Tagesauswahl zulassen.
    if (Array.from(auswahl.options).some(option => option.value === ziel)) {
      auswahl.value = ziel;
      document.getElementById(ziel).appendChild(aufgabe);
    }

    // Die ursprüngliche Auswahl bleibt als Datenquelle unsichtbar.
    // Der Pfeil öffnet stattdessen direkt eine kleine Liste mit Zielen.
    auswahl.hidden = true;
    const pfeil = document.createElement("button");
    pfeil.type = "button";
    pfeil.className = "tag-pfeil";
    pfeil.textContent = "↪";
    const dropdown = document.createElement("div");
    dropdown.className = "tag-dropdown";
    dropdown.id = "ziele-" + id;
    dropdown.hidden = true;
    dropdown.setAttribute("role", "group");
    dropdown.setAttribute("aria-label", "Aktionen für den Stichpunkt");
    pfeil.setAttribute("aria-controls", dropdown.id);
    pfeil.setAttribute("aria-expanded", "false");
    let beschreibung = textElement.textContent;
    const zielKnopfe = [];

    function pfeilBeschriften() {
      const tag = auswahl.options[auswahl.selectedIndex].textContent;
      const label = "Aktionen für „" + beschreibung + "“ (" + tag + ")";
      pfeil.setAttribute("aria-label", label);
      pfeil.title = label;
      zielKnopfe.forEach(function (knopf) {
        knopf.setAttribute("aria-pressed", String(knopf.dataset.ziel === auswahl.value));
      });
    }
    function auswahlSchliessen(fokus = true) {
      dropdown.hidden = true;
      pfeil.setAttribute("aria-expanded", "false");
      if (fokus) pfeil.focus();
    }

    Array.from(auswahl.options).forEach(function (option) {
      const knopf = document.createElement("button");
      knopf.type = "button";
      knopf.dataset.ziel = option.value;
      knopf.textContent = option.value === "woche" ? "To Do" : option.textContent;
      knopf.addEventListener("click", function () {
        auswahl.value = option.value;
        auswahl.dispatchEvent(new Event("change"));
      });
      zielKnopfe.push(knopf);
      dropdown.appendChild(knopf);
    });
    // Erledigte Einträge bleiben sichtbar und lassen sich wieder öffnen.
    const erledigtKnopf = document.createElement("button");
    erledigtKnopf.type = "button";
    erledigtKnopf.className = "eintrag-aktion";
    function erledigtAnzeigen() {
      const erledigt = zustaende[id]?.erledigt === true;
      aufgabe.classList.toggle("ist-erledigt", erledigt);
      erledigtKnopf.textContent = erledigt ? "Wieder öffnen" : "Erledigt";
      erledigtKnopf.setAttribute("aria-pressed", String(erledigt));
    }
    erledigtKnopf.addEventListener("click", function () {
      zustaende[id] = { ...zustaende[id], erledigt: !zustaende[id]?.erledigt };
      erledigtAnzeigen();
      zustandSpeichern(zustaende[id].erledigt ? "Stichpunkt erledigt." : "Stichpunkt wieder geöffnet.");
      auswahlSchliessen();
    });
    const loeschKnopf = document.createElement("button");
    loeschKnopf.type = "button";
    loeschKnopf.className = "eintrag-loeschen";
    loeschKnopf.textContent = "Löschen …";
    loeschKnopf.addEventListener("click", function () {
      if (!window.confirm("Möchtest du diesen Stichpunkt wirklich löschen?\n\n„" + beschreibung + "“")) return;
      zustaende[id] = { ...zustaende[id], geloescht: true };
      auswahlSchliessen(false);
      aufgabe.remove();
      leerHinweisAktualisieren();
      zustandSpeichern("Stichpunkt gelöscht.");
      document.getElementById("eintrag-oeffnen").focus();
    });
    dropdown.append(erledigtKnopf, loeschKnopf);
    erledigtAnzeigen();
    pfeilBeschriften();
    auswahl.parentElement.append(pfeil, dropdown);

    // Nur der Beschreibungstext reagiert auf Doppelklick.
    textElement.title = "Doppelklick zum Bearbeiten";
    textElement.addEventListener("dblclick", function () {
      const eingabe = window.prompt("Beschreibung bearbeiten:", beschreibung);
      if (eingabe === null) return; // Abbrechen verändert nichts.
      const neuerText = eingabe.trim();
      if (!neuerText || neuerText.length > 300) {
        status.textContent = "Bitte gib eine Beschreibung mit 1 bis 300 Zeichen ein. Der bisherige Text bleibt erhalten.";
        return;
      }
      if (neuerText === beschreibung) return;
      beschreibung = neuerText;
      textElement.textContent = neuerText;
      zustaende[id] = { ...zustaende[id], beschreibung: neuerText };
      auswahl.setAttribute("aria-label", "Tag für " + neuerText);
      sortiergriff.setAttribute("aria-label", "„" + neuerText + "“ innerhalb der Liste verschieben");
      pfeilBeschriften();
      zustandSpeichern("Beschreibung geändert.");
    });

    pfeil.addEventListener("click", function () {
      const oeffnen = dropdown.hidden;
      // Es bleibt immer nur ein Dropdown geöffnet.
      document.querySelectorAll(".tag-dropdown").forEach(function (anderes) {
        anderes.hidden = true;
      });
      document.querySelectorAll(".tag-pfeil").forEach(function (anderer) {
        anderer.setAttribute("aria-expanded", "false");
      });
      dropdown.hidden = !oeffnen;
      pfeil.setAttribute("aria-expanded", String(oeffnen));
      if (oeffnen) zielKnopfe.find(k => k.dataset.ziel === auswahl.value).focus();
    });
    dropdown.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        auswahlSchliessen();
      }
    });

    // Ein Fokuswechsel (auch durch Bestätigungsdialoge) darf die Aktion nicht abbrechen.
    // Das Menü wird per Außenklick, Escape oder nach einer ausgeführten Aktion geschlossen.

    auswahl.addEventListener("change", function () {
      document.getElementById(auswahl.value).appendChild(aufgabe);
      zuordnungen[id] = auswahl.value;
      reihenfolgeSpeichern();
      leerHinweisAktualisieren();
      try {
        htmlSpeicher.schreiben(speicherKey, JSON.stringify(zuordnungen));
        hinweis.textContent = "Zuordnung vorgemerkt – GitHub-Status siehe oben.";
      } catch (error) {
        hinweis.textContent = "Zuordnung gilt nur bis zum Neuladen: Speichern ist in diesem Browser blockiert.";
      }
      pfeilBeschriften();
      auswahlSchliessen();
    });
  }
  aufgaben.forEach(aufgabeVerbinden);
  reihenfolgeLaden();
  leerHinweisAktualisieren();

  // 6. Das kleine Eingabeformular öffnen, schließen und absenden.
  const eintragFormular = document.getElementById("eintrag-formular");
  const oeffnen = document.getElementById("eintrag-oeffnen");
  const beschreibung = document.getElementById("eintrag-text");
  const fehler = document.getElementById("eintrag-fehler");

  function formularSchliessen() {
    eintragFormular.hidden = true;
    oeffnen.setAttribute("aria-expanded", "false");
    eintragFormular.reset();
    fehler.textContent = "";
    oeffnen.focus();
  }

  oeffnen.addEventListener("click", function () {
    if (!eintragFormular.hidden) {
      formularSchliessen();
      return;
    }
    eintragFormular.hidden = false;
    oeffnen.setAttribute("aria-expanded", "true");
    document.getElementById("eintrag-person").focus();
  });
  document.getElementById("eintrag-abbrechen").addEventListener("click", formularSchliessen);
  eintragFormular.addEventListener("keydown", function (event) {
    if (event.key === "Escape") formularSchliessen();
  });

  eintragFormular.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = beschreibung.value.trim();
    if (!text) {
      fehler.textContent = "Bitte gib eine Beschreibung ein.";
      beschreibung.focus();
      return;
    }
    const eintrag = {
      id: "eigen-" + crypto.randomUUID(),
      person: document.getElementById("eintrag-person").value,
      ziel: document.getElementById("eintrag-ziel").value,
      text: text
    };
    eigeneEintraege.push(eintrag);
    aufgabeVerbinden(eintragErstellen(eintrag));
    reihenfolgeSpeichern();
    leerHinweisAktualisieren();
    try {
      htmlSpeicher.schreiben(eigeneKey, JSON.stringify(eigeneEintraege));
      status.textContent = "Stichpunkt hinzugefügt und vorgemerkt – GitHub-Status siehe oben.";
    } catch (error) {
      status.textContent = "Stichpunkt hinzugefügt, aber nicht gespeichert. Er geht beim Neuladen verloren, weil der Browserspeicher nicht verfügbar ist.";
    }
    formularSchliessen();
  });
}

  if (spalten) {
    document.querySelector(".journal").classList.add("spaltenansicht");
    document.getElementById("ansicht-wechseln").textContent = "Listenansicht";
    document.getElementById("ansicht-wechseln").setAttribute("aria-pressed", "true");
  }
  document.getElementById("abmelden").addEventListener("click", function () {
    if (htmlSpeicher.ungespeichert() && !window.confirm("Es gibt Änderungen, die noch nicht bei GitHub gespeichert sind. Trotzdem zur Anmeldung wechseln?")) return;
    htmlSpeicher.trennen();
    sessionStorage.removeItem("wochenplan-angemeldet");
    window.location.href = "index.html";
  });
}


kalenderAnzeigen().then(function () {
  document.getElementById("datei-leiste").hidden = false;
  document.getElementById("kalender-bereich").hidden = false;
}).catch(function (error) {
  document.getElementById("datei-leiste").hidden = false;
  document.getElementById("github-status").textContent = "Der Kalender konnte nicht geladen werden: " + error.message;
});
window.addEventListener("pageshow", event => { if (event.persisted) window.location.reload(); });
})();

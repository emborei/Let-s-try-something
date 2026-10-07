# KneipenCheck 🟡✅

**Der gelbe Ordner 2.0 – Hygienedokumentation für Eckkneipen, Imbisse, Cafés und kleine Restaurants.**

KneipenCheck ist eine Progressive Web App, mit der ein Wirt in **zwei Berührungen** eine
Temperaturkontrolle einträgt – offline, mit unverfälschbarem Zeitstempel und mit
**Ein-Klick-PDF** für den Lebensmittelkontrolleur. Keine Fachbegriffe, keine Schulung,
kein Papierordner.

```
Heute:  3 von 11 Kontrollen erledigt
        Kühlschrank Küche      [ jetzt eintragen ]     ← rot, bleibt rot
        Toilette reinigen      [ erledigt abhaken ]
```

---

## Inhalt

1. [Was drin ist (Funktionen)](#was-drin-ist)
2. [Sofort ausprobieren](#sofort-ausprobieren)
3. [Auf dem Handy/Tablet installieren (PWA)](#als-app-installieren-pwa)
4. [Wie es funktioniert (Technik in 90 Sekunden)](#wie-es-funktioniert)
5. [Rechtliche Anforderungen & wie sie erfüllt werden](#rechtliche-anforderungen)
6. [Projektstruktur](#projektstruktur)
7. [Tests](#tests)
8. [Nächste Schritte: Backend, Play Store, Preise](#nächste-schritte)
9. [Dokumentation im Detail](#dokumentation-im-detail)

---

## Was drin ist

| Pflichtfunktion | Umsetzung |
|---|---|
| **Temperatur-Checks** | Beliebig viele Kühlschränke/Tiefkühler/Warmhaltegeräte, frei benennbar, eigener Sollbereich, zwei Schichten pro Tag |
| **Reinigungs-Checks** | Küche, Theke, Toilette … frei konfigurierbar, Rhythmus täglich/wöchentlich/monatlich |
| **Wareneingang + Foto** | Lieferant, Temperatur, MHD/Verpackung/Geruch, Foto vom Lieferschein, „Lieferung zurückweisen“ |
| **Erinnerungen, die bleiben** | Rote Kachel + rote Leiste oben, Zähler im Titel, Zahlen-Badge in der Navigation, Vibration, optional Geräte-Mitteilung. Wegdrücken nur 15 Minuten – und es wird dabei dokumentiert |
| **Zeitstempel + Person** | Zeit kommt von einer **Serverzeit-Quelle**, nicht aus der Geräteuhr. Bei jeder Kontrolle steht, **wer** sie gemacht hat |
| **„Was ist heute noch offen?“** | Startseite mit Ampel (rot = offen, orange = wird knapp, grün = erledigt) und Fortschrittsbalken |
| **Monats-PDF** | Ein-Klick-PDF, auch **offline im Browser erzeugt**: Übersicht, Abweichungen mit Maßnahmen, ehrlich ausgewiesene Lücken, vollständiges Protokoll, Integritätsnachweis |
| **Verwaltung** | Geräte/Bereiche hinzufügen, umbenennen, löschen · Team mit PIN · Schichten · Darstellung · Server · Sicherung |

**Zusätzlich:** Korrekturen ohne Datenverlust (Kapitel „Rechtssicherheit“), Sicherungsdatei,
Aushang für die Wand, Tageszettel, Arbeitsliste „was ist noch offen“, Küchen-Schriftgröße,
Nachtmodus für die Spätschicht, demo-Daten zum Ausprobieren.

---

## Sofort ausprobieren

Voraussetzung: **Node.js 18 oder neuer** (kein npm install nötig – null Laufzeit-Abhängigkeiten).

```bash
cd Let-s-try-something
npm start                # startet App + Sync-Server
# → http://localhost:4173
```

Beim ersten Start führt die App durch die Einrichtung (4 Schritte, ~2 Minuten):

1. **Betrieb** – Name und Ort
2. **Kontrollen** – Vorlage wählen: Eckkneipe / Imbiss / Café / leer
3. **Team** – dein Name + PIN für den Chef-Bereich (optional)
4. **Fertig** – Beispiel-Daten der letzten 34 Tage einschalten, eigener Server optional

Danach: **Bericht → „Beweis für den Prüfer“** antippen und das Monats-PDF aufmachen. 🙂
Die Beispieldaten lassen sich unter *Verwalten → Daten & Notfall* löschen.

**Eine Kiste, keine Cloud.** `npm start` reicht. Kein Docker, keine Datenbank, keine
npm-Pakete im Betrieb – ein Node-Prozess und zwei Dateien. Alles Betriebsrelevante liegt
im Ordner `server/data/` und ist mit `tar` gesichert.

Nur die App ohne Server ausliefern? Geht auch mit jedem statischen Webserver:

```bash
npx serve app          # oder: python3 -m http.server -d app 8080
```

Dann fehlen allerdings die zwei Dinge, die den Server brauchen: **Serverzeit** (die App
läuft dann auf Gerätezeit und markiert das entsprechend) und **automatische Monatsberichte**.

### Als App installieren (PWA)

**Android (Chrome):** Seite öffnen → Menü ⋮ → *„App installieren“* / *„Zum Startbildschirm“*.
**iPhone/iPad (Safari):** *Teilen* → *„Zum Home-Bildschirm“*.
**Windows/Mac (Chrome/Edge):** Symbol rechts in der Adressleiste.

Danach startet KneipenCheck ohne Browserleiste im Vollbild, funktioniert ohne Internet
und liegt wie eine echte App auf dem Startbildschirm.

> ⚠️ Service Worker und „Installieren“ verlangen **HTTPS oder localhost**. Für ein altes
> Kneipen-Tablet im WLAN bräuchtest du entweder ein HTTPS-Zertifikat oder du nutzt den
> Browser normal weiter – die App funktioniert trotzdem, nur das Installieren und die
> Serverzeit-Prüfung sind dann eingeschränkt (die App sagt es dir ehrlich im Kopfbereich an).

---

## Wie es funktioniert

```
┌──────────────────────────── Tablet/Handy in der Kneipe ───────────────────────────┐
│  PWA (Vanilla JS, keine Bibliothek, ~120 kB)                                      │
│                                                                                    │
│  IndexedDB  ──► Eintrag wird SOFORT lokal gespeichert (funktioniert offline)        │
│      │                                                                             │
│      ├─► Hash-Kette (SHA-256)  ──► nachträgliche Änderung ist erkennbar             │
│      ├─► Warteschlange (outbox)                                                     │
│      └─► PDF-Erzeugung im Browser (auch offline, für den Notfall)                   │
└───────────────────────────────────┬───────────────────────────────────────────────┘
                                    │  wenn Internet da ist (POST /api/sync)
                                    ▼
┌──────────────────────── KneipenCheck Sync-Server (Node, 0 Abhängigkeiten) ─────────┐
│  /api/time      → echte Serverzeit (die App rechnet den Versatz ein)               │
│  /api/sync      → setzt den maßgeblichen Zeitstempel, prüft Duplikate,             │
│                   führt eine eigene Hash-Kette über alle Einträge                 │
│  /api/export/…  → Monats-PDF, Tagesnachweis, offene Kontrollen                     │
│  /api/verify    → Integritätsprüfung                                               │
│                                                                                    │
│  Speicher: data/db.json  +  data/journal.jsonl (nur anhängen, nie ändern)          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Warum diese Einfachheit?**

* **Kein npm-Paket im Betrieb.** Läuft auf jedem Webhoster, Raspberry Pi oder alten Rechner.
* **Keine Datenbank.** Eine JSON-Datei plus ein Journal – für einen Betrieb mit ein paar
  tausend Einträgen im Jahr völlig ausreichend, und im Zweifel mit einem Texteditor lesbar.
* **Offline-First.** Ohne Netz geht alles weiter. Sobald Netz da ist, wird übertragen.
* **Manipulationssicher.** Jeder Eintrag enthält einen SHA-256-Hash über seinen Inhalt
  **und** den Hash des vorherigen Eintrags. Wer einen alten Wert nachträglich ändert,
  bricht die Kette – das fällt bei der Prüfung auf.

### Die Zeitstempel-Frage (wichtig für die Rechtssicherheit)

Ein Gerät kann man falsch stellen. Deshalb:

1. Beim Start holt die App **Serverzeit vom eigenen KneipenCheck-Server** (`/api/time`).
   Ersatzweise von einer Zeit-API, als letzte Möglichkeit aus dem `Date`-Kopf einer
   HTTP-Antwort.
2. Die Differenz zur Geräteuhr wird gespeichert und **monoton weitergezählt** – ein
   Verstellen der Uhr während der Schicht bringt also nichts.
3. Beim Übertragen bekommt jeder Eintrag zusätzlich `tsServer`: den **Server-Zeitstempel**.
   Weicht die Gerätezeit um mehr als 10 Minuten ab, verwendet der Server seine eigene Zeit
   und vermerkt die Abweichung im Eintrag.
4. In der App steht ehrlich dran, welche Quelle gerade gilt: „Serverzeit“ oder „Gerätezeit
   (offline)“. Im PDF taucht das ebenfalls auf.

---

## Rechtliche Anforderungen

Kurzfassung der Recherche (Details mit Quellen: [`docs/01-rechtliche-anforderungen.md`](docs/01-rechtliche-anforderungen.md)):

| Anforderung | Rechtsgrundlage | Umsetzung in KneipenCheck |
|---|---|---|
| Aufzeichnungen anlegen und aufbewahren | **Art. 5 Abs. 2 VO (EG) 852/2004**, **§ 4 LMHV** | Alle Kontrollen werden gespeichert; Aufbewahrungshinweis „mindestens 24 Monate“ im Bericht und in der Verwaltung |
| Datum und Uhrzeit der Kontrolle | Aufzeichnungs-Mindestinhalt (u. a. HACCP-Leitlinien der Länder) | Zeitstempel automatisch, Serverzeit-geprüft, **nicht** händisch eingebbar |
| Messwert bzw. Ergebnis | ebd. | Zahlwert + Pflichtfeld-Bewertung „in Ordnung / Abweichung“ |
| Name bzw. Kürzel der prüfenden Person | ebd. | Person wird beim Startschuss gewählt, jeder Eintrag trägt den Namen |
| Abweichung mit Korrekturmaßnahme | **Art. 5 Abs. 2 lit. d/e**, Art. 7 | Speichern ist ohne dokumentierte Maßnahme **nicht möglich** |
| Digitale Dokumentation zulässig | VO 852/2004 schreibt keine Papierform vor | Revisionssicher umgesetzt: Hash-Kette, unveränderbare Einträge, Korrekturen als eigener Eintrag |
| Vorlage bei der Kontrolle | Art. 5, § 4 LMHV | „Beweis für den Prüfer“ → PDF in Sekunden, auch offline |
| Nachweise der Belehrung / Schulung | **§ 43 Abs. 4 IfSG** (alle zwei Jahre, Arbeitgeber) | *bewusst nicht enthalten* – die App dokumentiert die täglichen Kontrollen; Schulungsnachweise bleiben (vorerst) Papier/Akte (Roadmap) |
| Temperatur-Sollwerte | DIN 10508 / Tier-LMHV / Fachrecht | Vorschläge im Einrichtungsdialog: Kühlung 2–7 °C, Fleisch 0–2 °C, TK ≤ −18 °C, Warmhalten ≥ 65 °C, Kerntemperatur ≥ 72 °C (2 Min.) |

> **Kein Rechtsrat.** KneipenCheck ist eine Dokumentationshilfe. Das betriebliche
> HACCP-Konzept (Gefahrenanalyse, eigene Grenzwerte) bleibt Aufgabe des Betriebs – die App
> unterstützt dabei, ersetzt aber keine Beratung. Die Sollwerte sind Vorschläge und müssen
> im Betrieb geprüft werden.

---

## Projektstruktur

```
app/                          Die Progressive Web App (läuft komplett im Browser)
├── index.html                App-Hülle
├── manifest.webmanifest      Installierbar als App (PWA)
├── sw.js                     Service Worker → funktioniert offline
├── css/app.css               Design-System (große Tap-Flächen, hoher Kontrast, Dunkelmodus)
├── icons/                    App-Symbol: gelber Ordner mit Haken
└── js/
    ├── app.js                Start, Navigation, Erinnerungsdienst
    ├── core/
    │   ├── db.js             IndexedDB → LocalStorage → Speicher (automatischer Fallback)
    │   ├── model.js          Datenmodell, Vorlagen, Demo-Daten, PIN-Hashing
    │   ├── logic.js          Regeln: Was ist fällig? Was fehlt? Was ist eine Abweichung?
    │   ├── server-time.js    Serverzeit holen und ehrlich anzeigen
    │   ├── sync.js           Offline-Warteschlange, Übertragen, Hash-Kette, Korrekturen
    │   ├── pdf-lite.js       Mini-PDF-Erzeuger (Browser + Node, ohne Bibliothek)
    │   ├── report.js         Monatsbericht, Tageszettel, Arbeitsliste, Aushang
    │   └── util.js           Datum, Text, SHA-256 (mit reinem JS-Fallback für alte Geräte)
    └── ui/
        ├── components.js     Blätter, Toasts, Zähl-Eingabe, Ja/Nein-Schalter
        ├── store.js          Gemeinsamer Zustand + alle Aktionen
        └── views/            heute · liste · entry · bericht · verwalten · einrichten

server/                       Sync-Server (Node, ohne Abhängigkeiten)
├── index.mjs                 HTTP-Server: /api/time, /api/sync, /api/export, /api/verify
└── lib/store.mjs             Speicher + Hash-Kette des Servers

tests/
├── run.mjs                   52 Tests: Logik, Hash-Kette, PDF, Offline, HTTP-Server
└── ui-dom.mjs                18 Tests: Einrichtung, Eintragen, Abweichung, alle Bildschirme

docs/                         Recht, Produkt/IA/Flows, Datenmodell, Freemium, Roadmap
```

---

## Tests

```bash
npm test         # 52 Tests: Rechenlogik, Manipulationserkennung, PDF, Freemium, Server (HTTP)
npm run test:ui  # 18 Tests: Oberfläche im DOM (braucht einmalig: npm install)
npm run test:all # beides
```

Beispiele dessen, was die Tests wirklich prüfen:

* Ein nachträglich veränderter Eintrag **muss** bei der Kettenprüfung auffallen.
* Eine Abweichung darf **nicht** ohne Korrekturmaßnahme speicherbar sein.
* Ohne Server darf **nichts** verloren gehen (Warteschlange bleibt erhalten).
* Doppeltes Übertragen erzeugt **keine** Doppeleinträge.
* Der Monatsbericht muss bei vollständiger Dokumentation 100 % ergeben.
* Umlaute müssen korrekt im PDF landen.
* Vergessene Kontrollen müssen als **Lücke** im Bericht auftauchen (nicht als „noch offen“ verschwinden).
* Ein ungültiger Zeitstempel darf keinen Unsinn („NaN-NaN-NaN“) in den Nachweis schreiben.

---

## Nächste Schritte

### 1. Echter Betrieb (Multi-Standort)

* **Supabase oder PocketBase** statt JSON-Datei, wenn mehrere Standorte zentral verwaltet
  werden sollen. Die Schnittstelle ist klein (siehe `docs/03-datenmodell.md`), ein Wechsel
  betrifft nur `server/`.
* **Auth**: Magic-Link für die Chefin, Betriebscode + Gerätetoken fürs Tablet
  (Gerätetoken existiert bereits).
* **Automatischer Monatsbericht**: Cron auf dem Server → PDF per E-Mail am 1. des Monats.

### 2. In den Play Store / App Store

Die App ist bereits eine PWA. Für die Stores:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://deine-domain.de/manifest.webmanifest
bubblewrap build          # erzeugt eine signierte AAB für Google Play
```

* **Google Play**: 25 $ einmalig, Bezahlung über Play Billing (PWA = TWA).
* **Apple**: keine TWA – hier entweder WebView-Verpackung oder (besser) Verweis auf die
  installierbare PWA; Abo abschließen via Stripe im Web, in der App nur „Konto verwalten“.
* Alternative ohne Stores: einfach die PWA-Installation empfehlen (kostet nichts).

### 3. Hardware (der eigentliche Mehrwert)

* **Bluetooth-Thermometer** (GATT) auslesen → Temperatur ohne Abtippen.
* **Funk-Sensoren** (z. B. ESP32 → HTTP) → automatische Messung alle 10 Minuten.
  Der Server kann dafür eine schlanke Route `/api/sensors` bekommen.

### 4. Offene Punkte, die bewusst noch nicht gebaut sind

| Punkt | Warum noch nicht | Vorschlag |
|---|---|---|
| Externe Zeitverankerung (RFC 3161 Zeitstempel-Server, Blockchain) | Für Kneipen überzogen; Hash-Kette + Serverzeit reichen praktisch aus | Als „Plus Pro“-Option für Ketten/Audits nachrüsten |
| Fotos in der Cloud | Kosten + Datenschutz | Plus-Tarif mit EU-Speicher |
| Schulungs-/Belehrungsnachweise (§ 43 IfSG) | Nicht tägliche Routine | Eigener Bereich „Personal“ in Phase 2 |
| Mehrsprachig (PL/TR/RO/EN) | Zielgruppe deutschsprachig, Team oft nicht | Ab Phase 2, Oberfläche ist darauf vorbereitet |
| Rechtliche Prüfung der PDF-Formulierung | Braucht Anwalt/Behördenfeedback | Vor dem Verkauf einholen |

### 5. Preise

Details und Marktvergleich: [`docs/04-freemium-und-preise.md`](docs/04-freemium-und-preise.md)

| | Kostenlos | Plus – 9,90 €/Monat pro Standort |
|---|---|---|
| Standorte | 1 | unbegrenzt |
| Personen | 3 | unbegrenzt |
| Bericht/Export | letzte 30 Tage | volle Historie (24 Monate +) |
| Monats-PDF automatisch per E-Mail | – | ✓ |
| Fotos | 2 als Test | unbegrenzt |
| Support | E-Mail | Priorität, auch Wochenende |

Zum Vergleich: Wettbewerber liegen typisch bei **14,90 € pro Nutzer/Monat** bis
**50–150 € pro Betrieb/Monat** – ein Wirt mit vier Aushilfen zahlt dort schnell 60 €.
KneipenCheck positioniert sich bewusst darunter und rechnet **pro Standort, nicht pro Kopf**.

---

## Dokumentation im Detail

| Datei | Inhalt |
|---|---|
| [`docs/01-rechtliche-anforderungen.md`](docs/01-rechtliche-anforderungen.md) | EU 852/2004, LMHV, IfSG, Aufbewahrung, Grenzwerte, Anforderungen an digitale Nachweise, offene Rechtsfragen |
| [`docs/02-produkt-namen-ia-userflows.md`](docs/02-produkt-namen-ia-userflows.md) | 5 Namensvorschläge mit Empfehlung, Personas, Informationsarchitektur, detaillierte User Flows inkl. Sonderfälle |
| [`docs/03-datenmodell.md`](docs/03-datenmodell.md) | Sammlungen, Felder, Sync-Protokoll, Hash-Kette, Zeitvertrauen, Aufbewahrung, Sicherung |
| [`docs/04-freemium-und-preise.md`](docs/04-freemium-und-preise.md) | Freemium-Grenzen, Preislogik, Marktvergleich, Bezahlwege, was Wirtinnen wirklich konvertiert |
| [`docs/05-betrieb-und-roadmap.md`](docs/05-betrieb-und-roadmap.md) | Hosting (Pi, Docker, VPS), HTTPS, Backup, DSGVO, Play-Store-Weg, Roadmap, Open-Source-Hinweise |

---

## Lizenz & Ton

MIT-Lizenz für den Code – der Wirt bleibt Herr seiner Daten. Der Prototyp ist bewusst
kommentarreich auf Deutsch geschrieben, damit auch eine Nachfolgerin im Betrieb (oder ein
anderer Entwickler) versteht, was passiert. Kein Fachjargon ohne Erklärung, keine
versteckten Cloud-Abhängigkeiten, kein Tracking.

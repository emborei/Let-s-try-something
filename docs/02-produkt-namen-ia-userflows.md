# 02 · Produktname, Zielgruppe, Informationsarchitektur und User Flows

---

## 1. Namensvorschläge

Bewertungskriterien: **sofort verständlich**, **ohne Fachbegriff**, im Kneipenmilieu
aussprechbar, im Telefonat buchstabierbar, markenfähig, Domain plausibel.

| # | Vorschlag | Warum | Schwäche |
|---|---|---|---|
| 1 | **SauberBuch** | „Ins SauberBuch eintragen“ – klingt wie eine Selbstverständlichkeit, funktioniert für Kneipe, Imbiss und Café, kein Fachbegriff, warm und untechnisch | Sehr weich; allein nicht selbsterklärend, dass es um Vorschriften geht → Untertitel „Der digitale Hygiene-Ordner“ |
| 2 | **ThekenCheck** | Sympathisch, bodenständig, beschreibt den Ort des Geschehens; „Check“ kennt jeder | Klingt nach nur Theke; Café/Küche weniger mitgemeint |
| 3 | **KneipenCheck** *(Arbeitstitel des Prototyps)* | Trifft die Kernzielgruppe punktgenau, selbsterklärend, eingängig | „Kneipe“ schließt Café/Bäckerei aus und ist rechtlich ein Getränke-Ausschank-Begriff |
| 4 | **Haken dran** | Umgangssprachlich, fröhlich, beschreibt die Tätigkeit („abgehakt“); gut für Werbung/App-Store | Zu generisch, kaum schutzfähig, kein Bezug zur Hygiene |
| 5 | **Kontrollbuch** | Seriös, behördennah, sofort verstanden, gute Karten bei der Vorlage beim Amt | Trocken, ununterscheidbar von Wettbewerbern, schwer als Marke zu schützen |

### Empfehlung

**Produktname: „SauberBuch“**, Untertitel *„Der digitale Hygiene-Ordner“*.
Die App-interne Bezeichnung bleibt technisch `kneipencheck` (Repo, Datenbankname,
Service-Worker-Cache), damit ein Umbenennen später nur Marketing/Manifest betrifft.

Begründung: Bei dieser Zielgruppe verkauft nicht „HACCP“, sondern **„nicht mehr Ärger mit
dem Amt“**. „SauberBuch“ klingt nach Hausordnung und Handschrift – also nach etwas, das man
ohnehin tun sollte, nicht nach einer neuen Pflicht. Der Zusatz „Der digitale Hygiene-Ordner“
übersetzt es für alle, die den gelben Ordner kennen.

**Vor dem Launch zwingend:**

* Markenrecherche beim DPMA (und ggf. EUIPO) für die gewählte Klasse (9, 42, 35).
* Domain-/Handle-Prüfung (`sauberbuch.de`, `.app`, `@sauberbuch`).
* Regionaler Dialekt-/Slangtest (Nord/Süd), um Peinlichkeiten zu vermeiden.

---

## 2. Zielgruppe

### Primär: Die Wirtin (Persona „Marlene“, 54)

* Eckkneipe in Dortmund, 1 Theke, 2 Kühlschränke, 1 TK-Truhe, 1 Gefrierer, 2 Toiletten.
* Führt seit 12 Jahren den gelben Ordner. Oder nicht mehr.
* 2 Aushilfen (19 und 61 Jahre), eine davon „kann mit Technik nicht“.
* Handy: 6 Jahre altes Android. Tablet gibt es nicht.
* **Schmerz:** Der Kontrolleur stand vor drei Jahren unangemeldet in der Tür, und sie
  brauchte 20 Minuten, um die Zettel zu finden. Das will sie nie wieder.
* **Angst:** „Ich lade mir eine App, die ich dann nicht bedienen kann und die im Kongo
  meine Daten speichert.“
* **Wunsch:** Knopf drücken, fertig. Und wenn das Amt kommt: zücken, zeigen.

### Sekundär: Der Imbiss mit 8 Mitarbeitern, Lohn ~11 €/Std

* Fritteuse, Kühltheke, Arbeitsflächen, Wareneingang täglich mit Metzgerei-Lieferung.
* Wechselnde Personen (Aushilfen, Familienangehörige, Sprachbarrieren).
* **Braucht:** dass *jeder* es bedienen kann, ohne Erklärung. Foto-Belege beim Wareneingang.
* **Zahlt:** 10–15 €/Monat, weil Nachweis im Streitfall (Reklamation, Amt) Zeit und Geld spart.

### Tertiär: Das kleine Café / die Bäckerei-Filiale

* Kuchentheke, Milchkühlung, Kaffeemaschine entkalken, Theke/Tische.
* Filialketten brauchen **Mehrstandort-Verwaltung** und Auswertung → Plus-Tarif.

### Anti-Persona (bewusst nicht Zielgruppe)

* Großküchen/Kantinen mit QM-Abteilung und Audit-Anforderungen (IFS/ISO 22000) – dort
  braucht es Sensorik, Chargenverfolgung und Reporting. KneipenCheck wäre zu einfach.
* Fleischverarbeitung mit HACCP-Pflicht nach VO 853/2004 – zusätzlicher Umfang nötig.

---

## 3. Designprinzipien (verbindlich für alle Weiterentwicklungen)

1. **Keine Fachbegriffe im sichtbaren Bereich.** Kein „HACCP“, „CCP“, „Monitoring“,
   „Verifizierung“. Stattdessen „Kontrolle“, „Kühlschrank“, „abhaken“, „Prüfer“.
2. **Alles, was täglich passiert, ist maximal zwei Berührungen entfernt.**
   Kachel antippen → Speichern. Rechnende Nutzer müssen nichts lesen.
3. **Ampelfarben statt Text.** Rot = muss noch. Orange = wird knapp / Abweichung.
   Grün = erledigt. Immer zusätzlich ein Wort, nie nur Farbe.
4. **Rote Kacheln bleiben rot.** Erinnerungen werden angezeigt, nicht weggeklickt.
   Aufschieben ist möglich, aber sichtbar („erinnert in 15 Minuten“) und wird protokolliert.
5. **Tap-Ziele ≥ 60 × 60 px** (Küchen-Schriftgröße: 76 px), Kontrast groß, kein Hover nötig.
6. **Erst speichern, dann Fragen.** Ein Eintrag ist lokal gesichert, bevor irgendein
   Network-Call passiert. Nie ein Fortschrittsbalken, der den Nutzer am Speichern hindert.
7. **Ehrlichkeit statt schöner Statistik.** Lücken werden gezeigt. Fehlende Maßnahmen
   werden gezeigt. Offline-Zeitstempel werden als solche gekennzeichnet.
8. **Handschuh- und Nasse-Hände-Bedienung.** Große Zifferntasten, wenige, klar getrennte
   Flächen, kein versehentliches Speichern durch Wischen.

---

## 4. Informationsarchitektur

```
┌─ Kopfzeile (immer) ────────────────────────────────────────────────────────┐
│ Betriebsname · Datum · Uhrzeit · Zeitquelle | Speicher-/Sync-Status · Person │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Erinnerungsleiste (nur wenn offen) - klebt oben, rot ────────────────────┐
│ ⚠ 3 Kontrollen offen – 1 über der Zeit   [ Jetzt erledigen ] [15 Min später]│
└───────────────────────────────────────────────────────────────────────────┘

▶ Heute            Was heute ansteht: offene zuerst (rot), dann erledigt (grün)
│                  + „Lücke von gestern" + Zeitquellen-/Speicher-Zeile
▶ Temperatur       Alle Kühl-/Tiefkühl-/Warmgeräte, Verlauf 14 Tage, Lückenliste
▶ Putzen           Reinigungsbereiche mit Rhythmus, Verlauf, Lückenliste
▶ Ware             Wareneingang prüfen (Lieferant, Temp., MHD, Foto, Zurückweisen)
▶ Bericht          Kennzahlen, PDF-Knöpfe (Monat/Tag/Arbeitsliste/Aushang),
│                  Integritätsprüfung, Aufbewahrung, Sicherung
▶ Verwalten        Betrieb · Kontrollen & Geräte · Team · Schichten · Erinnerungen ·
                   Darstellung · Server & Sicherung · Tarif · Daten & Notfall · Über

Erzwungener Sonderweg: Einrichten (4 Schritte) – erscheint, solange nichts eingerichtet ist.
Blätter (von unten, jederzeit schließbar): Eintragen · Eintrag ansehen · Korrigieren ·
Person wechseln · Kontrolle anlegen/bearbeiten · Zeitraum wählen · Plus-Info · PIN-Eingabe.
```

**Warum nur fünf Hauptbereiche?** Weil die Zielgruppe genau drei Dinge täglich tut
(Temperatur, Putzen, Ware) und eine Sache monatlich (Bericht). Alles andere ist
„Chef-Sache“ und liegt hinten rechts im Zahnrad.

---

## 5. User Flows (detailliert)

### 5.1 Erster Start / Einrichtung (Ziel: < 3 Minuten, ohne Nachdenken)

```
App öffnen
└─ Schritt 1/4 „Wie heißt dein Betrieb?"
   ├─ Feld „Name" (Pflicht) + „Ort" (optional)
   └─ [ Weiter ]  → leer? Hinweis-Toast, bleibt stehen
└─ Schritt 2/4 „Was kontrolliert ihr?"
   ├─ Kacheln: Eckkneipe/Bar · Imbiss/Döner/Pommes · Café/Bäckerei · selbst anlegen
   ├─ Schichten: „Eine Schicht" oder „Früh & Spät"
   └─ [ Weiter ]
└─ Schritt 3/4 „Wer trägt ein?"
   ├─ „Dein Name" (Pflicht)
   ├─ „PIN für Chef-Bereich" (optional; Hinweis: schützt nur Verwalten)
   └─ [ Weiter ]
└─ Schritt 4/4 „Fast fertig"
   ├─ Schalter „Beispiel-Daten zeigen" (Standard: an) → 34 Tage Musterbericht
   ├─ Server-Adresse (optional, z. B. http://192.168.1.20:4173)
   └─ [ Los geht's! ]  → legt Kontrollen an, erzeugt Person, seidet Demo, holt Serverzeit
Ziel: Startseite „Heute" mit roten Kacheln und Fortschrittsbalken.
Fehlerfall: Kein Netz → alles wird lokal angelegt; Kopfzeile zeigt „Gerätezeit".
```

### 5.2 Temperatur eintragen – der wichtigste Flow (Ziel: 2 Berührungen, 5 Sekunden)

```
Start
└─ Kachel „Kühlschrank Küche" (rot) antippen
   └─ Blatt öffnet: Titel, Sollbereich „2 bis 7 °C", Hinweis
      ├─ Vorbelegung: letzter Wert (z. B. 4,5) → für „Tür zu, alles wie immer"
      ├─ Große Anzeige + [−] [+]  · Schnellwahl −1 / −0,5 / +0,5 / +1
      ├─ Tastatur direkt offen (Ziffernblock), Komma und Punkt beide erlaubt
      ├─ optional: „4,5° übernehmen" (Wert vom letzten Mal), Notiz, Foto
      └─ Zeitzeile: „Serverzeit 07.10.2026, 08:12 Uhr" · Personenzeile „Wird eingetragen von: Marlene"
   └─ [ Speichern ]   ← eine Berührung, fertig. Toast „4,5 °C gespeichert ✓", kurze Vibration
      └─ Kachel wird grün, Badge im Menü zählt runter

Wenn Wert außerhalb Soll:
   ├─ Sofort rot: „Außerhalb vom Sollbereich! 11,4 °C gemessen – erlaubt: 2 bis 7 °C"
   ├─ Pflichtfeld „Was hast du gemacht?" (Chips: Tür/Dichtung geprüft · Ware umgeräumt ·
   │  Gerät kälter gestellt · Technik angerufen · Ware entsorgt · Chef informiert …)
   ├─ Knopf wird rot: „Abweichung speichern (mit Maßnahme)"
   ├─ Vorher speichern = Toast „Bitte antippen, was du gemacht hast – das verlangt die Kontrolle."
   └─ Nach dem Speichern: Kachel orange „Abweichung dokumentiert", erscheint im PDF-Abschnitt 2
```

Sonderfälle:

* **Gerät aus / Ware schon umgeräumt?** Notizfeld nutzen, keine Sonderfunktion – weniger
  Zustände = weniger Verwirrung.
* **Wert vergessen?** Speichern ohne Wert ist gesperrt („Bitte erst die Temperatur eintragen").
* **Aus Versehen falsch gespeichert?** Eintrag antippen → „Korrigieren" → neuer Eintrag mit
  Grund, alter bleibt sichtbar.

### 5.3 Reinigung abhaken (Ziel: 1 Berührung)

```
Kachel „Toilette reinigen" antippen
└─ Blatt mit zwei großen Knöpfen
   ├─ [ ✓ Erledigt ]            → gespeichert (grün), Toast, fertig
   └─ [ Nicht geschafft ]        → Pflichtfeld „Warum nicht?" (Chips + freier Grund)
                                  → gespeichert als Abweichung mit Maßnahme,
                                    erscheint ehrlich im Bericht, bleibt als Aufgabe offen
```

### 5.4 Wareneingang (Ziel: 20 Sekunden pro Lieferung)

```
Kachel „Wareneingang kontrollieren" → Blatt
├─ Lieferant (Textfeld mit Vorschlagsliste der letzten Lieferanten → meist 1 Tipp)
├─ Temperatur der gekühlten Ware (Zahl, optional)
├─ Ja/Nein groß: „Haltbarkeitsdatum in Ordnung?" · „Verpackung in Ordnung?" · „Aussehen & Geruch?"
├─ Foto vom Lieferschein (Kamera öffnet direkt; Foto wird verkleinert + mit Hash gespeichert)
├─ Notiz („2 Kisten Bier")
└─ [ Lieferung zurückweisen ]  (rot) → Begründung + Maßnahmen-Chips
Ergebnis: grün „Wareneingang von Getränke Meier gespeichert ✓"
          oder rot „Problem dokumentiert ✓" inklusive Lieferant und Grund im PDF.
```

### 5.5 Übersicht „Was ist heute noch offen?" (5-mal täglich, 3 Sekunden)

```
Startseite
├─ Fortschrittsbalken „7 von 11 erledigt" + Prozent
├─ Abschnitt „Noch offen (4)"    → rote Kacheln zuerst
├─ Abschnitt „Dokumentierte Abweichungen (1)"
├─ Abschnitt „Erledigt (6)"      → grün, zum Nachsehen/Antippen
├─ Karte „Achtung: Lücke von gestern" (falls vorhanden) → [ Gestern nachtragen ]
└─ Fußzeile: Zeitquelle · Speicherstatus · lückenlose Tage in Folge
```

### 5.6 Erinnerungen, die nicht weggehen (Kern der Verhaltensänderung)

```
Auslöser: Kontrolle fällig, Zeitfenster läuft / ist abgelaufen
├─ Kachel bleibt rot (auch nach Schichtende) – sie verschwindet nur durch Erledigen
├─ Klebende rote Leiste oben: „⚠ 4 Kontrollen offen – 2 über der Zeit"
│   ├─ [ Jetzt erledigen ]  → springt zur Liste
│   └─ [ 15 Min später ]    → Leiste verschwindet 15 Minuten, kommt dann wieder
├─ Badge in der Navigation (roter Zähler), Tab-Titel „(4) KneipenCheck"
├─ Vibration + Toast alle 30 Minuten (einstellbar 5–120 Minuten)
├─ Geräte-Mitteilung, wenn App im Hintergrund (Opt-in in Verwalten)
└─ Ruhezeit (Standard 23:30–07:00): keine Töne/Mitteilungen, aber die Kachel bleibt rot
```

Bewusste Entscheidung: **kein endgültiges „Wegklicken“.** Ein Wirt, der eine Kontrolle
überspringt, soll das *sehen* – nicht wegdrücken können. Was nicht erledigt wurde, steht
als Lücke im Monatsbericht.

### 5.7 Korrigieren ohne Datenverlust

```
Eintrag antippen → Blatt „Eintrag ansehen" (Zeitstempel Gerät + Server, Person, Messwert,
Maßnahme, Prüfsumme lokal/Server)
└─ [ Korrigieren ]
   ├─ „Bisher eingetragen: 07.10., 08:12 · 12,5 °C · Marlene"
   ├─ Neuer Wert (Zahl-Eingabe)
   ├─ Grund (Pflicht): Zahlendreher · falsches Gerät · Nachtrag · Gerät defekt · eigener Text
   └─ [ Korrektur speichern ]
Ergebnis: ZWEI Einträge – der alte mit Hinweis „korrigiert", der neue mit „(Korrektur)"
im Protokoll. Ein PDF wird dadurch nie nachträglich „schöner", sondern nur ergänzt.
```

### 5.8 Monatsbericht für die Kontrolle (Ziel: unter 10 Sekunden vom Klingeln bis PDF)

```
Bericht antippen
├─ Kennzahlen: Erfüllungsquote · Abweichungen · Tage mit Lücken · lückenlose Serie
├─ [ Beweis für den Prüfer ]      → Monats-PDF des laufenden Monats
├─ [ Letzter Monat ]              → PDF des Vormonats
├─ [ Anderer Zeitraum ]           → Monat antippen oder Von/Bis eingeben
├─ [ Heutiger Tageszettel ]       → alle Kontrollen von heute (klassischer Zettel)
├─ [ Arbeitsliste „noch offen" ]  → für die Schicht zum Ausdrucken
├─ [ Aushang für die Wand ]       → wer macht heute was (Küchenaushang)
├─ „Unverändert seit der Erfassung?" → [ Jetzt prüfen ] → Hash-Kette wird geprüft
└─ Aufbewahrung + [ Sicherung herunterladen ]
Auf dem Handy: Teilen-Dialog (E-Mail, WhatsApp, Drucken). Am Tablet/PC: Download.
Offline: PDF wird trotzdem erzeugt, Kopfzeile vermerkt „Gerätezeit (offline erzeugt)".
```

**Aufbau des PDFs (5 Abschnitte):**

1. Kopfdaten Betrieb/Zeitraum/Erstellt von/Erstellt am/Aufbewahrungshinweis
2. Kennzahlen-Kasten (geplant, durchgeführt, Quote, Abweichungen, Tage ohne Eintrag)
3. Kontrollen im Überblick (je Kontrolle: Art, Sollbereich, geplant/erledigt/Abweichungen)
4. Abweichungen mit Maßnahmen und Person
5. Fehlende Einträge (ehrlich ausgewiesen)
6. Vollständiges Protokoll (Datum, Zeit, Kontrolle, Wert/Ergebnis, Bewertung, Person)
7. Hinweis zur Revisionssicherheit (Zeitquelle, Hash-Kopf, Erzeugungszeit) + Unterschriftszeile

### 5.9 Verwaltung durch die Chefin

```
Zahnrad → (bei gesetzter PIN: PIN-Abfrage) → Verwalten
├─ Betrieb: Name, Anschrift, verantwortliche Person, Telefon, Gesundheitsamt
├─ Kontrollen & Geräte: Liste mit [Ändern], Schnellwahl „+ Kühlgerät / + Reinigungsbereich
│  / + eigene Kontrolle" → Blatt mit Vorschlägen (Schnellauswahl), Name, Sollbereich,
│  Rhythmus (täglich/wöchentlich/monatlich), Schichtzuordnung, Hinweis
├─ Team: Name, Rolle, PIN · [Person] · Entfernen (Einträge behalten den Namen)
├─ Schichten: Bezeichnung + Von/Bis, Schichten hinzufügen/entfernen
├─ Erinnerungen: an/aus · Mitteilungen erlauben · Intervall · Ruhezeit
├─ Darstellung: Schriftgröße (Normal/Groß/Sehr groß) · Hell/Dunkel/Automatisch
├─ Server & Sicherung: Adresse, [Verbindung testen], [Jetzt übertragen], [Nachweis prüfen]
├─ Tarif: aktueller Plan, [Plus ansehen], Foto-Kontingent
└─ Daten & Notfall: Sicherung herunterladen/einlesen · Demodaten · ALLES LÖSCHEN
```

### 5.10 Person wechseln (Schichtwechsel, 10 Sekunden)

```
Kopfzeile → [Vorname] → Blatt „Wer bist du?"
├─ Liste der Personen, aktive markiert
└─ [ Neue Person anlegen ] → Name, Rolle, PIN (optional)
Ergebnis: Name erscheint in Kopfzeile und auf allen neuen Einträgen.
Bewusst KEIN Login pro Eintrag: Am Thekentablet würde das niemand durchhalten.
```

---

## 6. Zugänglichkeit (über die Pflicht hinaus)

* **Lesbarkeit:** Alle Zahlen tabellarisch, Mindestschriftgröße 18 px, Küchenmodus 24 px.
* **Kontrast:** Ampelfarben immer mit Symbol/Wort (nicht nur Farbe) → farbenblind-tauglich.
* **Bewegung:** keine Animationen außer Toast-Einblendung und Fortschrittsbalken.
* **Screenreader:** `<dialog>`-Elemente (echter Fokus-Fang), `aria-current` in der
  Navigation, `aria-live` auf dem Hauptbereich und Toasts, `aria-pressed` auf Chips.
* **Trefferflächen:** ≥ 60 × 60 px, Küchenmodus ≥ 76 px; Zifferneingabe über Chips,
  damit man kein Tastenfeld treffen muss.
* **Sprache:** kurze Sätze, aktive Verben („Trag die Temperatur ein"), keine Passivformen,
  keine Anglizismen.
* **Offline:** vollständig funktionsfähig außer PDF-Teilen und Serverzeit.

---

## 7. Was absichtlich NICHT in der App ist

| Nicht gebaut | Grund |
|---|---|
| Freitext-Notizen, Tags, Suche | Zielgruppe braucht sie nicht; erhöhen Fehlerquote |
| Diagramme/Trends | In der Studie hübsch, am Tresen nutzlos; Bericht zeigt Lücken |
| Login mit Passwort | Schichtwechsel am Thekentablet funktioniert so nicht |
| Fachbegriffe wie „CCP“, „Verifizierung“ | Verwirrt und verschreckt die Zielgruppe |
| Push-Benachrichtigungen ohne Opt-in | Respekt vor dem Nutzer; die In-App-Erinnerung reicht |
| Automatisches Löschen alter Daten | Aufbewahrungspflicht; Löschen nur manuell, mit Warnung |

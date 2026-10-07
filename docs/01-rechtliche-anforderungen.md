# 01 · Rechtliche Anforderungen an digitale HACCP-Dokumentation in Deutschland

**Zweck dieses Dokuments:** Prüfen, welche Anforderungen ein digitales Dokumentationssystem
für Gastronomiebetriebe erfüllen muss – und belegen, wie der Prototyp sie erfüllt.
**Kein Rechtsrat.** Vor dem Verkauf sollte ein Lebensmittelrechtler oder eine IHK-Beratung
drüberschauen; die Praxisauslegung unterscheidet sich zwischen Bundesländern und
Überwachungsbehörden.

---

## 1. Rechtsrahmen in Kurzform

| Norm | Inhalt | Bedeutung für die App |
|---|---|---|
| **VO (EG) Nr. 852/2004**, Art. 5 Abs. 1 | Jeder Lebensmittelunternehmer richtet ein auf HACCP-Grundsätzen beruhendes Verfahren ein, führt es durch und hält es aufrecht | Nur der Betrieb selbst kann das leisten – die App unterstützt die Durchführung |
| **VO (EG) Nr. 852/2004**, Art. 5 Abs. 2 | „…und **angemessen dokumentieren**“; Dokumentation angepasst an Art und Größe des Betriebs | Kernzweck der App |
| **VO (EG) Nr. 852/2004**, Art. 5 Abs. 2 lit. d/e | Überwachung, Korrekturmaßnahmen, Verifizierung | Abweichung ist ohne dokumentierte Maßnahme nicht speicherbar |
| **VO (EG) Nr. 852/2004**, Anhang II | Allgemeine Hygienevorschriften inkl. Kühlkette, Reinigung | Reinigungs- und Temperaturchecklisten des Prototyps |
| **LMHV** (Lebensmittelhygiene-Verordnung), § 4 | Konkretisiert das HACCP-Verfahren im deutschen Recht, Schulungspflichten | Temperatur-/Reinigungskontrollen bildet die App ab |
| **LFGB** § 60 | Bußgeldvorschriften | Risiko fehlender/unklarer Dokumentation – Argument für die App |
| **VO (EG) Nr. 853/2004** | Zusatzanforderungen für Lebensmittel tierischen Ursprungs | Relevanter für Metzgereien/Imbisse mit eigenem Fleisch; Grenzwerte im Vorschlagskatalog berücksichtigt |
| **IfSG § 43 Abs. 4** | Arbeitgeber belehrt Beschäftigte **alle zwei Jahre** zur Infektionsschutzbelehrung, Teilnahme dokumentieren | Bewusst nicht im MVP (eigener Personal-Bereich in Phase 2) |
| **DIN 10508** | Temperaturen für Lebensmittel (Warmhalten/Heißhalten etc.) | Sollwert-Vorschläge |
| **Tier-LMHV / TKV** | Frischfleisch-/Geflügel-/TK-Grenzwerte | Vorschläge im Einrichtungsdialog (0–2 °C, ≤ −18 °C) |
| **DSGVO** | Personenbezug (Namen der Mitarbeiter) | Datensparsamkeit: Name, Rolle, PIN-Hash – sonst nichts; lokale Speicherung als Standard |

### Aufbewahrungsdauer

* Die VO 852/2004 nennt **keine feste Frist**, verlangt aber eine angemessene Dauer.
* In der Praxis etabliert und behördlich akzeptiert: **mindestens zwei Jahre**; bei Produkten
  mit definierter Haltbarkeit „Haltbarkeitsdauer + 6 Monate“; Kontrollen empfehlen häufig
  drei Jahre, Lieferscheine/Vermerke können unter § 257 HGB (6 Jahre) fallen.
* **Umsetzung im Prototyp:** Hinweis „mindestens 24 Monate“ im PDF, in der Verwaltung
  einstellbare Aufbewahrungsfrist (Standard 24 Monate, einstellbar), kein automatisches
  Löschen von Einträgen.

---

## 2. Was muss eine Aufzeichnung mindestens enthalten?

Aus HACCP-Leitlinien, Behördenpraxis und Fachliteratur ergeben sich sechs Mindestangaben.
Alle sind im Prototyp Pflicht:

| Anforderung | Umsetzung | Prüfbar durch |
|---|---|---|
| **Datum und Uhrzeit** der Kontrolle | automatischer Zeitstempel aus geprüfter Zeitquelle (Kapitel 4) | Feld `tsClient` + `tsServer` im Eintrag, Spalten „Datum/Zeit“ im PDF |
| **Messwert bzw. Ergebnis** | Zahlwert (°C) oder Zustand „erledigt/in Ordnung“ | Feld `value` + `ok` (abgeleitet aus Sollbereich) |
| **Verantwortliche Person** (Name oder Kürzel) | Person wird beim Start gewählt, steht auf jedem Eintrag | Feld `userName` (als Kopie, damit Umbenennungen die Vergangenheit nicht verändern) |
| **Abweichung eindeutig gekennzeichnet** | rote Kennzeichnung sofort beim Eintragen, eigener Abschnitt im PDF | `ok: false`, Abschnitt „2. Abweichungen“ |
| **Ergriffene Korrekturmaßnahme** | Speichern erst nach Auswahl mindestens einer Maßnahme möglich | `corrective.actions[]`, `corrective.note` |
| **Unterschrift oder digitale Bestätigung** der prüfenden Person | Personenzuordnung + unveränderbarer Eintrag. Für die formal strenge Auslegung: unterschriebener PDF-Ausdruck (Abschnitt „Unterschrift der verantwortlichen Person“) | im PDF vorgesehen |

Zusätzlich in `taskSnapshot` gespeichert: Name, Art und Sollbereich der Kontrolle **zum
Zeitpunkt der Messung**. Wer später „Kühlschrank Theke“ in „Kühlschrank Bar“ umbenennt,
verändert damit nicht den Nachweis von vorletzter Woche.

---

## 3. Was prüft der Kontrolleur wirklich?

Aus der Praxis der Lebensmittelüberwachung (Zusammenfassung der Recherche):

1. **Vorlage der Aufzeichnungen** – „Wir machen das immer so“ genügt nicht.
2. **Lückenlosigkeit** – fehlende Tage/Werte sind der häufigste Beanstandungsgrund, auch
   wenn die Temperaturen in Ordnung waren. Deshalb weist KneipenCheck Lücken **selbst**
   aus (Abschnitt 3 des Berichts), statt sie zu verschweigen. Ein System, das Lücken
   kaschiert, wäre im Zweifel ein größeres Risiko als eine ehrliche Lücke.
3. **Plausibilität der Zeitstempel** – Handschriftliche Listen werden auf nachträgliches
   Ausfüllen geprüft (gleiche Stiftfarbe, gleiche Handschrift). Genau hier ist die digitale
   Dokumentation im Vorteil.
4. **Korrekturmaßnahmen** – fehlen sie, gilt die Kontrolle als nicht durchgeführt.
5. **Digitale Unterlagen** werden akzeptiert, wenn sie **unveränderlich, mit Zeitstempel,
   sofort verfügbar und nachvollziehbar** sind (wer hat wann was eingetragen/geändert).
   Behörden verlangen in der Regel zusätzlich eine **ausdruckbare Fassung**.

---

## 4. Wie der Prototyp „digital = beweiswert“ herstellt

**a) Zeitvertrauen**

* Start fragt `/api/time` des eigenen Servers ab (oder eine öffentliche Zeit-API bzw. den
  `Date`-HTTP-Kopf als Rückfallebene).
* Der Versatz zur Geräteuhr wird gespeichert und monoton weitergezählt; ein Verstellen der
  Uhr während der Schicht ändert die App-Zeit nicht.
* Jeder Eintrag erhält zusätzlich den **Server-Zeitstempel** `tsServer`, wenn übertragen.
* Abweichung > 10 Minuten zwischen Geräte- und Serverzeit: Server verwendet seine eigene
  Zeit und markiert den Eintrag (`clockAnomaly`).
* Die App **zeigt an**, ob sie Server- oder Gerätezeit verwendet – keine stille Lüge.

**b) Unveränderbarkeit**

* Einträge haben keine Löschfunktion. Korrekturen erzeugen **einen neuen Eintrag** mit
  `action: 'correct'`, `correctionOf` und `reason`; der alte Eintrag bleibt sichtbar und
  erhält den Hinweis `replacedBy`.
* Jeder Eintrag trägt einen SHA-256-Hash über seinen kanonischen Inhalt **und den Hash des
  Vorgängers** (Hash-Kette). Änderungen an einzelnen Feldern oder Entfernen von Einträgen
  machen die Kette/Verzweigung nachweisbar kaputt – `npm test` prüft genau das.
* Der Server führt eine **zweite, eigene Kette** über dieselben Einträge mit eigenen
  Zeitstempeln. Lokale und serverseitige Kette sind getrennt überprüfbar (`/api/verify`).

**c) Nachvollziehbarkeit**

* `audit`-Sammlung: Anlegen/Ändern/Löschen von Kontrollen und Personen.
* Jeder Eintrag speichert Person (ID + Name), Zeitquelle und Gerätebezug.

**d) Verfügbarkeit**

* PDF jederzeit erzeugbar – **auch offline im Browser** (die gleiche PDF-Engine wie am Server).
* Wöchentliche Sicherungsdatei (JSON) möglich; Server speichert zusätzlich ein
  append-only-Journal (`data/journal.jsonl`).

**e) Wo die Grenzen liegen (ehrlich benannt)**

* Eine reine Gerätespeicherung ohne Server ist gegen einen entschlossenen Angreifer mit
  Root-Zugriff auf das Tablet **nicht** absolut fälschungssicher: Er könnte Datenbank und
  Hash-Kette gemeinsam neu schreiben. Dagegen hilft nur eine **externe Verankerung**:
  * Server-Zeitstempel + Server-Kette (im Prototyp vorhanden),
  * wöchentliches Journal/Backup auf einem zweiten System (in der Roadmap),
  * optional qualifizierter Zeitstempel nach RFC 3161 für Ketten/Audits (Phase 3).
* Für das Zielsegment – Eckkneipe mit einem Tablet – liegt das Schutzniveau damit deutlich
  über dem gelben Ordner und über Excel. Das ist die ehrliche Aussage gegenüber Kunden.

---

## 5. Fachliche Grenzwerte, die die App vorschlägt

| Bereich | Sollbereich | Quelle/Praxis |
|---|---|---|
| Kühlschrank allgemein | 2 bis 7 °C | gängige HACCP-Praxis, DIN-10508-Umfeld |
| Kühlung Fleisch/Fisch | −1 bis 2 °C (Hackfleisch/Geflügel möglichst ≤ 2 °C) | Tier-LMHV-Praxis |
| Getränkekühlung | 4 bis 8 °C | Praxiswert (Bier/Gastro) |
| Tiefkühlung | ≤ −18 °C (vorgeschlagen −24 bis −18 °C) | TKV |
| Warmhalten/Heißhalten | ≥ 65 °C (vorgeschlagen 65–95 °C) | DIN 10508/Gastro-Praxis |
| Garen/Kerntemperatur | ≥ 72 °C für 2 Minuten | HACCP-Standard (Codex Alimentarius) |
| Wareneingang gekühlt | ≤ 7 °C, Frischfleisch ≤ 7 °C, Geflügel ≤ 4 °C, TK ≤ −18 °C | Behördenpraxis |

Diese Werte sind **Vorschläge** im Einrichtungsdialog und im Betrieb änderbar; das
betriebliche HACCP-Konzept kann strengere Werte verlangen.

---

## 6. Offene Rechtsfragen, die wir nicht selbst entscheiden sollten

1. **Unterschrift**: Reicht die Personen-Zuordnung + PDF-Ausdruck mit Unterschrift der
   verantwortlichen Person? In der Praxis ja; für IFS-/Audit-Ketten empfehlen sich
   fortgeschrittene/qualifizierte Signaturen (eIDAS).
2. **Aufbewahrungsdauer**: „mindestens 2 Jahre“ ist etabliert, aber nicht überall gleich
   gefordert (Bundesland-Praxis). Deshalb als Einstellung statt hart kodiert.
3. **Digitale Archivierung ohne ausdruckbare Fassung**: Manche Prüfer verlangen Papier.
   Empfehlung für Kunden: Monats-PDF zusätzlich im Ordner abheften – die App erzeugt es
   ohnehin in Sekunden.
4. **Datenschutz der Mitarbeiternamen** (DSGVO Art. 6 Abs. 1 lit. c/f, Verarbeitung zur
   Erfüllung lebensmittelrechtlicher Pflichten): Betriebscode + Gerätebindung statt
   persönlicher Konten ist datensparsam; Löschkonzept für ehemalige Mitarbeiter nötig
   (Name bleibt in Einträgen, Person wird deaktiviert).
5. **Belehrung nach § 43 IfSG**: Frist ist gesetzlich „alle zwei Jahre“; viele Standards
   (IFS/FSSC/DIN 10514) verlangen jährlich. Die App wird beide Rhythmen anbieten.

# -*- coding: utf-8 -*-
"""Dokumente 06, 07, 08 – Tagesprotokoll, Verkostungsprotokoll, Abweichungsprotokoll"""

# ---------------------------------------------------------------- 06
DOK_06 = {
    "key": "06 · Tagesprotokoll",
    "file": "06-Tagesprotokoll-Temperatur-Reinigung",
    "title": "Tagesprotokoll · Temperatur, Wareneingang, Reinigung",
    "subtitle": "Laufende Aufzeichnung nach Art. 5 VO (EG) Nr. 852/2004 – ein Blatt je Einsatztag",
    "foot": "Ausgefüllt aufbewahren: mindestens 2 Jahre, empfohlen 3 Jahre. Bei Kontrollen vorlegen.",
    "blocks": [
        ("row", [
            {"name": "k_betrieb", "label": "Betrieb", "w": 1.3},
            {"name": "k_datum", "label": "Datum", "w": 0.7},
            {"name": "k_tag", "label": "Wochentag", "w": 0.6},
        ]),
        ("row", [
            {"name": "k_ort", "label": "Einsatzort / Veranstaltung", "w": 1.4},
            {"name": "k_person", "label": "Verantwortliche Person", "w": 0.9},
            {"name": "k_von", "label": "Beginn", "w": 0.4},
            {"name": "k_bis", "label": "Ende", "w": 0.4},
        ]),

        ("h", "A · Temperaturen"),
        ("p", "Grenzwerte: Kühlware ≤ 7 °C (Fleisch/Fisch 0–2 °C), Tiefkühlware ≤ −18 °C, Weißwein/Schaumwein 6–12 °C, Rotwein 14–18 °C, Heißhalten ≥ 65 °C. Messung mit geeignetem Thermometer, Sonde vor und nach der Messung reinigen."),
        ("table", {
            "headers": ["Gerät / Produkt", "Sollbereich", "Messung 1 (Zeit / °C)", "Messung 2 (Zeit / °C)", "Maßnahme bei Abweichung", "Kürzel"],
            "widths": [0.26, 0.16, 0.16, 0.16, 0.18, 0.08],
            "rows": [["Kühlschrank / Kühlzelle", "2 – 7 °C", "", "", "", ""],
                     ["Gefrierschrank / -truhe", "≤ −18 °C", "", "", "", ""],
                     ["Thermobox / Kühlakku", "≤ 7 °C", "", "", "", ""],
                     ["Weißwein / Schaumwein", "6 – 12 °C", "", "", "", ""],
                     ["Rotwein", "14 – 18 °C", "", "", "", ""],
                     ["offene Getränke / Säfte", "≤ 7 °C", "", "", "", ""],
                     ["Warmhaltegerät (falls Speisen)", "≥ 65 °C", "", "", "", ""]],
            "row_h": 19,
            "fillable": True,
        }),

        ("h", "B · Wareneingang"),
        ("table", {
            "headers": ["Lieferant", "Produkt", "Charge / MHD", "Temperatur", "Verpackung / Geruch / Zustand", "angenommen", "zurückgewiesen"],
            "widths": [0.20, 0.20, 0.14, 0.10, 0.20, 0.08, 0.08],
            "rows": [],
            "empty": 5,
            "row_h": 19,
            "fillable": True,
        }),
        ("hint", "Zurückgewiesene Lieferungen zusätzlich im Abweichungsprotokoll (Dokument 08) festhalten und den Lieferanten informieren. Der Lieferschein bleibt als Beleg in der Ablage."),

        ("pagebreak",),
        ("h", "C · Reinigung und Desinfektion"),
        ("table", {
            "headers": ["Bereich / Gegenstand", "erledigt (Uhrzeit)", "Mittel / Dosierung", "Sichtprüfung ok", "Kürzel"],
            "widths": [0.32, 0.18, 0.26, 0.14, 0.10],
            "rows": [["Arbeitsfläche / Theke", "", "", "", ""],
                     ["Gläser / Spülmaschine", "", "", "", ""],
                     ["Flaschenöffner, Ausgießer", "", "", "", ""],
                     ["Kühlschrank / Thermobox", "", "", "", ""],
                     ["Fußboden / Abfallbereich", "", "", "", ""],
                     ["Toiletten (falls Gäste)", "", "", "", ""],
                     ["Fahrzeug / Transportkisten", "", "", "", ""]],
            "row_h": 19,
            "fillable": True,
        }),

        ("h", "D · Hygienekontrolle am Stand"),
        ("checktable", {"headers": ["Punkt", "ok", "nicht ok", "Bemerkung"],
                        "widths": [0.56, 0.10, 0.12, 0.22],
                        "rows": ["Hände gewaschen / desinfiziert", "saubere Arbeitskleidung",
                                 "Gläser sauber und trocken", "Flaschen verschlossen und kühl",
                                 "Allergen- und Preisinformation sichtbar", "Abfallbehälter vorhanden und geschlossen",
                                 "Jugendschutz-Aushang vorhanden", "keine Glasbruchreste im Arbeitsbereich"],
                        "checkbox_cols": [1, 2], "row_h": 16}),

        ("h", "E · Abweichungen und Maßnahmen am Tag"),
        ("table", {
            "headers": ["Zeit", "was ist passiert", "Sofortmaßnahme", "erledigt", "Kürzel"],
            "widths": [0.10, 0.36, 0.34, 0.10, 0.10],
            "rows": [],
            "empty": 4,
            "row_h": 20,
            "fillable": True,
        }),
        ("row", [
            {"name": "f_ort", "label": "Ort, Datum", "w": 1.0},
            {"name": "f_unt", "label": "Unterschrift verantwortliche Person", "w": 1.6},
        ]),
        ("hint", "Lücken sind ehrlicher als Lückenlosigkeit: Wenn eine Messung nicht erfolgt ist, Feld leer lassen und unter E den Grund notieren. Nachträgliche Einträge mit Zeit und Kürzel versehen, nicht rückdatieren."),
    ],
}

# ---------------------------------------------------------------- 07
DOK_07 = {
    "key": "07 · Verkostungsprotokoll",
    "file": "07-Verkostungsprotokoll",
    "title": "Verkostungsprotokoll",
    "subtitle": "Ein Blatt je Einsatz – Nachweis für Auftraggeber, Lebensmittelaufsicht und Abrechnung",
    "foot": "Kopie beim Auftraggeber, Original in der Betriebsmappe. Aufbewahrung mindestens 2 Jahre.",
    "blocks": [
        ("row", [
            {"name": "a_kunde", "label": "Auftraggeber / Veranstalter", "w": 1.4},
            {"name": "a_ansprech", "label": "Ansprechpartner, Telefon", "w": 1.0},
        ]),
        ("row", [
            {"name": "a_ort", "label": "Ort / Veranstaltung / Stand", "w": 1.4},
            {"name": "a_datum", "label": "Datum", "w": 0.6},
            {"name": "a_zeit", "label": "Zeit von – bis", "w": 0.6},
        ]),
        ("row", [
            {"name": "a_person", "label": "Durchführende Person(en)", "w": 1.4},
            {"name": "a_besucher", "label": "geschätzte Besucherzahl", "w": 0.7},
        ]),
        ("checks", {"name": "a_art", "options": ["Verkostung", "Verkauf", "Ausschank", "Schulung", "Promotion"],
                    "cols": 5, "label": "Art des Einsatzes"}),

        ("h", "A · Produkte"),
        ("table", {
            "headers": ["Produkt / Jahrgang", "Charge oder Los", "Alkohol %", "Sulfite / Allergene", "Ausgabetemperatur", "Menge (Flaschen / Proben)"],
            "widths": [0.26, 0.16, 0.10, 0.18, 0.14, 0.16],
            "rows": [],
            "empty": 5,
            "row_h": 19,
            "fillable": True,
        }),
        ("hint", "Sulfite sind ab 10 mg/l SO2 kennzeichnungspflichtig („enthält Sulfite“). Bei Wein können außerdem Spuren von Milch- oder Eiproteinen aus der Klärung enthalten sein. Angaben stammen aus dem Produktdatenblatt des Lieferanten."),

        ("h", "B · Hygiene und Sicherheit vor Ort"),
        ("checktable", {"headers": ["Kontrolle", "ok", "nicht ok", "Maßnahme"],
                        "widths": [0.55, 0.10, 0.12, 0.23],
                        "rows": ["Standfläche gereinigt und desinfiziert",
                                 "frische Gläser je Gast, keine Rückgabe",
                                 "Kühlkette eingehalten (Temperatur gemessen)",
                                 "Handwaschgelegenheit oder Handdesinfektion",
                                 "Abfall und Glasbruch entsorgt",
                                 "Allergen-/Preisinformation sichtbar",
                                 "Altersprüfung bei Alkohol durchgeführt",
                                 "Sicherheitsglas oder Kunststoff im Außenbereich"],
                        "checkbox_cols": [1, 2], "row_h": 16}),

        ("h", "C · Vorfälle und Rückmeldungen"),
        ("table", {
            "headers": ["Zeit", "Vorfall / Rückmeldung", "Maßnahme", "an Auftraggeber gemeldet"],
            "widths": [0.10, 0.40, 0.30, 0.20],
            "rows": [],
            "empty": 3,
            "row_h": 20,
            "fillable": True,
        }),
        ("row", [
            {"name": "c_abweichung", "label": "Verweis auf Abweichungsprotokoll Nr.", "w": 1.2},
            {"name": "c_rueck", "label": "Ware zurückgenommen / gesperrt (Menge)", "w": 1.2},
        ]),

        ("h", "D · Ergebnis und Abnahme"),
        ("row", [
            {"name": "d_ergebnis", "label": "Ergebnis (z. B. Anzahl Verkostungen, verkaufte Einheiten, Reklamationen)", "w": 2.0},
        ]),
        ("row", [
            {"name": "d_ort", "label": "Ort, Datum", "w": 1.0},
            {"name": "d_person", "label": "Unterschrift durchführende Person", "w": 1.3},
        ]),
        ("row", [
            {"name": "d_kunde", "label": "Unterschrift Auftraggeber / Veranstalter (Abnahme)", "w": 2.0},
        ]),
    ],
}

# ---------------------------------------------------------------- 08
DOK_08 = {
    "key": "08 · Abweichung",
    "file": "08-Abweichungsprotokoll",
    "title": "Abweichungs- und Korrekturprotokoll",
    "subtitle": "Jeder Vorfall mit Ursache, Sofortmaßnahme und Abschluss – der Nachweis, dass du reagiert hast",
    "foot": "Aufbewahrung mindestens 2 Jahre. Bei Gesundheitsgefahr zusätzlich die Lebensmittelaufsicht informieren.",
    "blocks": [
        ("p", "Eine Abweichung ist jede Situation, in der ein Grenzwert oder eine Regel nicht eingehalten wurde: zu warme Ware, zerbrochenes Glas, fehlende Allergenangabe, Abgabe an Minderjährige, beschädigte Verpackung, Schädlingsfund. **Nicht schönreden, sondern aufschreiben und abschließen.**"),
        ("h", "1 · Abweichung"),
        ("row", [
            {"name": "n_nr", "label": "Nr.", "w": 0.35},
            {"name": "n_datum", "label": "Datum", "w": 0.6},
            {"name": "n_zeit", "label": "Uhrzeit", "w": 0.5},
            {"name": "n_ort", "label": "Ort / Einsatz", "w": 1.3},
            {"name": "n_person", "label": "festgestellt von", "w": 0.9},
        ]),
        ("checks", {"name": "n_art", "options": ["Temperatur", "Hygiene / Reinigung", "Wareneingang", "Allergene / Kennzeichnung",
                                                "Jugendschutz", "Glasbruch / Fremdkörper", "Schädlinge", "Personal / Schulung", "Sonstiges"],
                    "cols": 3, "label": "Art der Abweichung"}),
        ("field", {"name": "n_besch", "label": "Beschreibung: was ist konkret passiert? (Produkt, Charge, Menge, Grenzwert, Messwert)",
                   "h": 48, "type": "multi", "box": True}),
        ("row", [
            {"name": "n_produkt", "label": "betroffenes Produkt / Charge", "w": 1.2},
            {"name": "n_menge", "label": "Menge", "w": 0.5},
            {"name": "n_lieferant", "label": "Lieferant / Hersteller", "w": 1.0},
        ]),

        ("h", "2 · Ursache und Sofortmaßnahme"),
        ("field", {"name": "n_ursache", "label": "Ursache (z. B. Kühlung ausgefallen, Messung nicht erfolgt, Verpackung beschädigt)",
                   "h": 34, "type": "multi"}),
        ("field", {"name": "n_sofort", "label": "Sofortmaßnahme (Ware gesperrt, verworfen, zurückgegeben, Kunde informiert, Fläche gereinigt …)",
                   "h": 40, "type": "multi"}),
        ("checks", {"name": "n_status", "options": ["Ware gesperrt", "Ware verworfen", "an Lieferanten zurück", "Kunde informiert",
                                                    "Behörde informiert", "Rückruf eingeleitet"],
                    "cols": 3, "label": "Status"}),
        ("row", [
            {"name": "n_behoerde", "label": "Behörde informiert am / Aktenzeichen", "w": 1.4},
            {"name": "n_kunde", "label": "Kunden informiert am / wie", "w": 1.2},
        ]),

        ("h", "3 · Vorbeugung und Abschluss"),
        ("field", {"name": "n_vorbeug", "label": "Was wird geändert, damit es nicht wieder passiert? (Schulung, anderes Gerät, Checkliste, Lieferant)",
                   "h": 40, "type": "multi"}),
        ("row", [
            {"name": "n_verant", "label": "verantwortlich für die Umsetzung", "w": 1.0},
            {"name": "n_frist", "label": "Frist", "w": 0.5},
            {"name": "n_erledigt", "label": "erledigt am", "w": 0.6},
            {"name": "n_pruef", "label": "Wirksamkeit geprüft am", "w": 0.8},
        ]),
        ("row", [
            {"name": "n_unt", "label": "Unterschrift (Ort, Datum)", "w": 1.6},
            {"name": "n_gegen", "label": "Kenntnisnahme Leitung", "w": 1.2},
        ]),

        ("h", "4 · Rückruf-Checkliste (nur bei Gesundheitsgefahr)"),
        ("checktable", {"headers": ["Schritt", "erledigt", "Zeit", "wer"],
                        "widths": [0.64, 0.10, 0.12, 0.14],
                        "rows": ["Ware gesperrt und gekennzeichnet",
                                 "Bestand und bereits abgegebene Mengen ermittelt",
                                 "Kunden und Veranstalter informiert (schriftlich)",
                                 "Lebensmittelaufsicht informiert",
                                 "Rückgabe, Ersatz oder Erstattung geregelt",
                                 "Ursache mit Lieferant geklärt",
                                 "Maßnahme im Hygienekonzept ergänzt"],
                        "checkbox_cols": [1], "row_h": 16}),
        ("hint", "Bei Verdacht auf eine lebensmittelbedingte Erkrankung: betroffene Ware aufbewahren (nicht entsorgen), Probe kühlen, Gesundheitsamt und Lebensmittelaufsicht informieren. Adressen und Telefonnummern vorab in die Betriebsmappe eintragen."),
    ],
}

DOKS = [DOK_06, DOK_07, DOK_08]

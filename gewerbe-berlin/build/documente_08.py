# -*- coding: utf-8 -*-
"""Dokumente 11 (Verkostungsvertrag), 12 (Rechnung/Quittung), 13 (Rechtstexte)"""

DOK_11 = {
    "key": "11 · Verkostungsvertrag",
    "file": "11-Verkostungsvertrag",
    "title": "Verkostungs- und Verkaufsauftrag",
    "subtitle": "Vertrag zwischen Auftraggeber und selbständiger Verkostungskraft – Honorar, Abgrenzung, Hygiene, Haftung, Datenschutz",
    "foot": "Mustertext zur Anpassung. Kein Rechtsrat – bei hohen Auftragssummen oder Rahmenverträgen anwaltlich prüfen lassen.",
    "blocks": [
        ("h", "1 · Vertragsparteien"),
        ("row", [
            {"name": "v1_name", "label": "Auftragnehmer (Name / Firma, Anschrift)", "w": 1.5},
            {"name": "v1_tel", "label": "Telefon / E-Mail", "w": 1.1},
        ]),
        ("row", [
            {"name": "v1_st", "label": "Steuernummer / USt-IdNr.", "w": 1.1},
            {"name": "v1_gew", "label": "Gewerbeanmeldung vom", "w": 0.8},
            {"name": "v1_bank", "label": "Bankverbindung (IBAN)", "w": 1.3},
        ]),
        ("row", [
            {"name": "v2_name", "label": "Auftraggeber (Firma, Anschrift, vertreten durch)", "w": 1.7},
            {"name": "v2_tel", "label": "Telefon / E-Mail", "w": 1.0},
        ]),
        ("row", [
            {"name": "v2_hr", "label": "Handelsregister / USt-IdNr. des Auftraggebers", "w": 1.4},
            {"name": "v2_ansprech", "label": "fachliche Ansprechperson vor Ort", "w": 1.2},
        ]),

        ("h", "2 · Vertragsgegenstand"),
        ("p", "Der Auftragnehmer erbringt als selbständiger Unternehmer folgende Leistungen:"),
        ("checks", {"name": "v3", "options": ["Durchführung von Produktverkostungen", "Aufbau und Betrieb eines Verkostungsstands",
                                              "Beratung und Verkauf an Endkunden", "Promotion und Produktpräsentation",
                                              "Schulung von Verkaufspersonal", "Erstellung von Verkostungsprotokollen",
                                              "Transport und Lagerung der Ware", "Sonstiges – siehe Zusatz"],
                    "cols": 2, "label": "Leistungen"}),
        ("field", {"name": "v3a", "label": "Zusatz / nähere Leistungsbeschreibung oder Verweis auf Anlage 1", "h": 34, "type": "multi"}),
        ("row", [
            {"name": "v4_prod", "label": "Produkte (Marke, Sortiment)", "w": 1.5},
            {"name": "v4_ziel", "label": "Zielgruppe / Ort der Verkostung", "w": 1.2},
        ]),
        ("row", [
            {"name": "v5_von", "label": "Einsatzzeitraum von", "w": 0.8},
            {"name": "v5_bis", "label": "bis", "w": 0.8},
            {"name": "v5_tage", "label": "Anzahl Einsatztage", "w": 0.7},
            {"name": "v5_zeit", "label": "tägliche Arbeitszeit von – bis", "w": 1.0},
        ]),
        ("row", [
            {"name": "v6_ort", "label": "Einsatzort(e) mit Anschrift", "w": 1.7},
            {"name": "v6_flaeche", "label": "Fläche / Standplatz", "w": 0.8},
        ]),

        ("h", "3 · Material, Ware und Schwund"),
        ("checks", {"name": "v7", "options": ["Ware wird vom Auftraggeber gestellt", "Ware wird vom Auftragnehmer gestellt und abgerechnet",
                                               "Verkostungsgläser / Material stellt der Auftraggeber", "Material stellt der Auftragnehmer"],
                    "cols": 2, "label": "Wer stellt was?"}),
        ("row", [
            {"name": "v7_wert", "label": "Warenwert je Einsatz (Schätzung)", "w": 1.0},
            {"name": "v7_schwund", "label": "vereinbarter Schwund / Bruch in % oder Betrag", "w": 1.2},
            {"name": "v7_rueck", "label": "Rückgabe der Restware am / wie", "w": 1.2},
        ]),
        ("p", "Der Auftraggeber übergibt die Ware mit den erforderlichen Produktinformationen (Zutaten, Allergene, Sulfitgehalt, Alkoholgehalt, Haltbarkeit, Lagerhinweise). Der Auftragnehmer lagert und behandelt die Ware nach den Vorgaben und dokumentiert Temperaturen."),

        ("h", "4 · Vergütung"),
        ("row", [
            {"name": "v8_form", "label": "Vergütungsform", "w": 0.9},
            {"name": "v8_honorar", "label": "Honorar je Tag / je Einsatz (netto)", "w": 1.0},
            {"name": "v8_pausch", "label": "Pauschale je verkaufter Einheit (netto)", "w": 1.0},
        ]),
        ("checks", {"name": "v8a", "options": ["Tagessatz", "Stundensatz", "Pauschal je Einsatz", "Provision je Einheit", "Kombination"],
                    "cols": 3, "label": "Vergütungsform (bitte eine Variante wählen)"}),
        ("row", [
            {"name": "v9_fahrt", "label": "Fahrtkosten (0,30 €/km oder Pauschale)", "w": 1.2},
            {"name": "v9_spesen", "label": "Spesen / Übernachtung", "w": 1.0},
            {"name": "v9_material", "label": "Materialpauschale", "w": 0.9},
        ]),
        ("checks", {"name": "v10_ust", "options": ["19 % Umsatzsteuer", "7 % Umsatzsteuer (nur bei bestimmten Leistungen)",
                                                   "Kleinunternehmer nach § 19 UStG – keine USt"],
                    "cols": 3, "label": "Umsatzsteuer"}),
        ("row", [
            {"name": "v10_zahl", "label": "Zahlungsziel (Tage nach Rechnungseingang)", "w": 1.0},
            {"name": "v10_faellig", "label": "Fälligkeit spätestens", "w": 0.9},
            {"name": "v10_abzug", "label": "Skonto / Abzug vereinbart", "w": 1.0},
        ]),
        ("p", "Die Rechnung wird nach Abschluss des Einsatzes gestellt, spätestens zum Monatsende. Rechnungen sind prüffähig und enthalten die gesetzlichen Pflichtangaben (§ 14 UStG). Bei Zahlungsverzug gelten die gesetzlichen Regelungen (§§ 286, 288 BGB)."),

        ("pagebreak",),
        ("h", "5 · Selbständigkeit und Weisungsfreiheit"),
        ("p", "Der Auftragnehmer ist **selbständiger Unternehmer** und nicht Arbeitnehmer des Auftraggebers. Er trägt das unternehmerische Risiko, unterhält eine eigene Betriebsstätte, eigene Betriebsmittel und eine eigene Betriebshaftpflichtversicherung, ist für mehrere Auftraggeber tätig und rechnet seine Leistungen mit Umsatzsteuer oder als Kleinunternehmer ab. Der Auftragnehmer bestimmt Ort und Zeit der Leistungserbringung im Rahmen der vereinbarten Termine selbst und ist nicht in die Arbeitsorganisation des Auftraggebers eingegliedert."),
        ("p", "Der Auftragnehmer ist berechtigt, mit Zustimmung des Auftraggebers Erfüllungsgehilfen einzusetzen. Diese sind fachlich geeignet, belehrt und bei Bedarf nach § 43 IfSG geschult; der Auftragnehmer bleibt für ihre Leistung verantwortlich."),
        ("hint", "Diese Klausel beschreibt die gewünschte Rechtslage – sie schafft sie nicht. Entscheidend ist die Praxis: Wer feste Schichten nach Dienstplan läuft, nur für einen Auftraggeber arbeitet, dessen Kleidung trägt und wie Personal behandelt wird, kann trotz Vertrag als scheinselbständig eingestuft werden (Folgen: Sozialversicherungsbeiträge, Steuernachzahlungen). Bei dauerhaften Einsätzen im Wochenrhythmus: Statusfeststellungsverfahren bei der Clearingstelle der Deutschen Rentenversicherung nutzen."),

        ("h", "6 · Hygiene, Jugendschutz und Weisungen"),
        ("bullets", [
            "Der Auftragnehmer hält die Vorgaben der VO (EG) 852/2004, des IfSG und des JuSchG ein und führt die Aufzeichnungen nach seinem Hygienekonzept.",
            "Der Auftragnehmer stellt sicher, dass alle Mitwirkenden eine gültige IfSG-Bescheinigung (§ 43) haben, soweit die Tätigkeit sie erfordert.",
            "Der Auftraggeber sorgt für Information über Allergene, Sulfite, Alkoholgehalt und Kennzeichnung; ohne diese Angaben darf das Produkt nicht ausgegeben werden.",
            "Alkohol wird nur an Personen ab 16 (Wein, Sekt, Bier) bzw. ab 18 Jahren (Spirituosen) abgegeben; bei Zweifeln wird der Ausweis verlangt.",
            "Der Auftragnehmer ist verpflichtet, erkennbare Gesundheitsgefahren sofort zu melden und die Ware zu sperren.",
            "Weisungen des Auftraggebers zu Markenauftritt, Kleidung und Ansprache sind zulässig, soweit sie die Selbständigkeit nicht in Frage stellen.",
        ]),
        ("field", {"name": "v11", "label": "Ergänzende Hygienevorgaben des Auftraggebers / besondere Produktvorgaben", "h": 34, "type": "multi"}),

        ("h", "7 · Haftung und Versicherung"),
        ("p", "Der Auftragnehmer unterhält eine Betriebshaftpflichtversicherung mit einer Deckungssumme von mindestens 3.000.000 € für Personenschäden und 300.000 € für Sachschäden und weist sie auf Verlangen nach. Der Auftraggeber stellt die Ware frei von Rechts- und Sachmängeln und informiert über Gefahren. Für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit haften beide Parteien nach den gesetzlichen Vorschriften; im Übrigen ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt."),
        ("row", [
            {"name": "v12_vers", "label": "Versicherer / Police-Nr. des Auftragnehmers", "w": 1.5},
            {"name": "v12_deckung", "label": "Deckungssumme", "w": 0.8},
            {"name": "v12_bis", "label": "gültig bis", "w": 0.7},
        ]),

        ("h", "8 · Bild- und Tonaufnahmen"),
        ("checks", {"name": "v13", "options": ["keine Aufnahmen geplant", "Aufnahmen nur ohne erkennbare Personen", "Aufnahmen mit Einwilligung der Abgebildeten",
                                               "Nutzung durch Auftraggeber erlaubt (Social Media, Website)", "Nutzung nur nach Freigabe"],
                    "cols": 2, "label": "Vereinbarung zu Fotos und Videos"}),
        ("p", "Für Aufnahmen, auf denen Personen erkennbar sind, holt der Aufnehmende vor Veröffentlichung eine Einwilligung ein. Die Nutzung von Aufnahmen des Auftragnehmers zu Werbezwecken ist nur im vereinbarten Umfang zulässig."),

        ("h", "9 · Datenschutz"),
        ("p", "Beide Parteien verarbeiten personenbezogene Daten (Ansprechpartner, durchführende Personen, ggf. Gästedaten) nur zur Vertragsdurchführung nach Art. 6 Abs. 1 lit. b DSGVO. Werden im Auftrag Gästedaten verarbeitet (z. B. Gewinnspiel, Anmeldelisten), schließen die Parteien zusätzlich eine Vereinbarung nach Art. 28 DSGVO."),
        ("row", [
            {"name": "v14_avv", "label": "Auftragsverarbeitung erforderlich?", "w": 0.9},
            {"name": "v14_verant", "label": "Verantwortlicher für Gästedaten", "w": 1.2},
            {"name": "v14_ds", "label": "Datenschutzbeauftragter / Kontakt", "w": 1.2},
        ]),

        ("h", "10 · Laufzeit, Kündigung, höhere Gewalt"),
        ("row", [
            {"name": "v15_begin", "label": "Vertragsbeginn", "w": 0.8},
            {"name": "v15_ende", "label": "Vertragsende / Laufzeit", "w": 1.0},
            {"name": "v15_frist", "label": "Kündigungsfrist", "w": 0.9},
        ]),
        ("checks", {"name": "v15a", "options": ["einmaliger Auftrag", "Rahmenvertrag mit Einzelabrufen"],
                    "cols": 2, "label": "Vertragsart"}),
        ("p", "Absagen des Auftraggebers innerhalb von 7 Tagen vor dem Einsatz werden mit 50 % des Honorars, innerhalb von 48 Stunden mit 100 % vergütet, soweit die Absage nicht aus von ihm nicht zu vertretenden Gründen erfolgt. Bei höherer Gewalt (behördliche Untersagung, extremes Wetter, Krankheit mit Attest) entfallen die Leistungspflichten; bereits entstandene Kosten werden erstattet."),

        ("h", "11 · Schlussbestimmungen"),
        ("p", "Änderungen und Ergänzungen bedürfen der Textform. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam. Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Auftragnehmers, soweit gesetzlich zulässig."),
        ("row", [
            {"name": "v16_ort", "label": "Ort, Datum (Auftragnehmer)", "w": 1.0},
            {"name": "v16_unt", "label": "Unterschrift Auftragnehmer", "w": 1.3},
        ]),
        ("row", [
            {"name": "v17_ort", "label": "Ort, Datum (Auftraggeber)", "w": 1.0},
            {"name": "v17_unt", "label": "Unterschrift Auftraggeber", "w": 1.3},
        ]),
        ("hint", "Anlagen: 1 Leistungsbeschreibung · 2 Produktliste mit Allergenen · 3 Terminplan · 4 Hygienekonzept (Auszug) · 5 Versicherungsnachweis · 6 Einwilligungen Foto."),

        ("pagebreak",),
        ("h", "Kurzcheck vor der Unterschrift"),
        ("table", {
            "headers": ["Punkt", "worauf achten"],
            "widths": [0.28, 0.72],
            "rows": [
                ["Vergütung", "Netto/Brutto, USt-Hinweis, Fahrtkosten, Material, Zahlungsziel, Absagehonorar konkret benennen"],
                ["Leistungsumfang", "Was genau, wie viele Stunden, Auf- und Abbau inklusive? Wer stellt Gläser, Strom, Wasser?"],
                ["Ware und Schwund", "Wert, Bruch, Rückgabe, Entsorgung – ohne Regelung bleibt der Verlust am Auftragnehmer hängen"],
                ["Hygiene", "Wer liefert Allergen- und Sulfitangaben, wer belehrt Personal, wer führt die Protokolle?"],
                ["Gaststättenrecht", "Ausschank gegen Geld: Gestattung liegt beim Veranstalter oder bei dir? Schriftlich festhalten"],
                ["Selbständigkeit", "Keine feste Eingliederung, mehrere Auftraggeber, eigene Betriebsmittel, eigene Versicherung"],
                ["Haftung", "Betriebshaftpflicht mit Nachweis, Deckungssummen, Haftungsbegrenzung"],
                ["Bilder", "Wer darf Fotos nutzen, Einwilligungen der Abgebildeten"],
                ["Kündigung", "Fristen, Ausfallhonorar, höhere Gewalt"],
                ["Datenschutz", "Gästedaten und Auftragsverarbeitung klären"],
            ],
            "size": 8.0,
            "row_h": 24}),
    ],
}

# ---------------------------------------------------------------- 12
DOK_12 = {
    "key": "12 · Rechnung",
    "file": "12-Rechnung-und-Quittung",
    "title": "Rechnung und Quittung",
    "subtitle": "Rechnungsvorlage mit allen Pflichtangaben nach § 14 UStG · Quittung für Barzahlung",
    "boxes": True,
    "foot": "Rechnungen 8 Jahre aufbewahren (§ 147 AO). Bei Kleinunternehmerregelung Hinweis nach § 19 UStG eintragen.",
    "blocks": [
        ("h", "Rechnung"),
        ("row", [
            {"name": "r1_abs", "label": "Rechnungsaussteller (Name, Anschrift, Telefon, E-Mail)", "w": 1.6},
            {"name": "r1_nr", "label": "Rechnungsnummer", "w": 0.8},
            {"name": "r1_datum", "label": "Rechnungsdatum", "w": 0.7},
        ]),
        ("row", [
            {"name": "r2_name", "label": "Rechnungsempfänger (Firma, Anschrift)", "w": 1.6},
            {"name": "r2_ust", "label": "USt-IdNr. des Empfängers (falls vorhanden)", "w": 0.9},
        ]),
        ("row", [
            {"name": "r3_leistung", "label": "Leistungszeitraum / Lieferdatum", "w": 1.1},
            {"name": "r3_auftrag", "label": "Auftrags- oder Bestellnummer", "w": 1.0},
            {"name": "r3_ust", "label": "Steuernummer / USt-IdNr. des Ausstellers", "w": 1.1},
        ]),
        ("table", {
            "headers": ["Pos.", "Leistung / Artikel (Art, Menge, Beschreibung)", "Menge", "Einzelpreis netto", "Gesamt netto"],
            "widths": [0.06, 0.50, 0.10, 0.16, 0.18],
            "rows": [],
            "empty": 6,
            "row_h": 19,
            "fillable": True,
        }),
        ("row", [
            {"name": "r4_netto", "label": "Summe netto", "w": 1.0},
            {"name": "r4_ustsatz", "label": "Umsatzsteuer (19 % / 7 %)", "w": 1.0},
            {"name": "r4_brutto", "label": "Rechnungsbetrag brutto", "w": 1.0},
        ]),
        ("checks", {"name": "r5", "options": ["19 % USt enthalten", "7 % USt enthalten", "Kleinunternehmer nach § 19 UStG – keine Umsatzsteuer"],
                    "cols": 3, "label": "Umsatzsteuer"}),
        ("field", {"name": "r5a", "label": "Hinweis bei Kleinunternehmerregelung: „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“",
                   "h": 16}),
        ("row", [
            {"name": "r6_frist", "label": "Zahlungsziel / Fälligkeit", "w": 1.0},
            {"name": "r6_bank", "label": "Bankverbindung (IBAN, BIC, Institut)", "w": 1.6},
        ]),
        ("row", [
            {"name": "r7_skonto", "label": "Skonto / Hinweis", "w": 1.4},
            {"name": "r7_unt", "label": "Unterschrift / Stempel (bei Papierrechnung)", "w": 1.2},
        ]),

        ("pagebreak",),
        ("h", "Quittung über Barzahlung"),
        ("row", [
            {"name": "q1", "label": "Aussteller (Name, Anschrift)", "w": 1.5},
            {"name": "q2", "label": "Quittungsnummer", "w": 0.7},
            {"name": "q3", "label": "Datum", "w": 0.6},
        ]),
        ("row", [
            {"name": "q4", "label": "Zahlender (Name, Anschrift)", "w": 1.6},
            {"name": "q5", "label": "Betrag in Euro", "w": 0.7},
        ]),
        ("field", {"name": "q6", "label": "Wofür wurde gezahlt? (Leistung, Zeitraum, Veranstaltung)", "h": 30, "type": "multi"}),
        ("checks", {"name": "q7", "options": ["Barzahlung", "EC-Karte", "Überweisung", "Sonstiges"],
                    "cols": 4, "label": "Zahlungsart"}),
        ("p", "Der Betrag wurde in voller Höhe bezahlt. Die Umsatzsteuer ist im Betrag enthalten, soweit nicht anders vermerkt."),
        ("row", [
            {"name": "q8", "label": "Ort, Datum", "w": 1.0},
            {"name": "q9", "label": "Unterschrift Aussteller", "w": 1.6},
        ]),
        ("hint", "Quittungen ersetzen keine Rechnung: Wer als Unternehmer an einen anderen Unternehmer leistet, muss eine Rechnung mit allen Pflichtangaben stellen. Für Privatkunden genügt ein Beleg; auf Verlangen ist eine Rechnung zu erteilen (§ 33 UStDV)."),

        ("h", "Pflichtangaben nach § 14 UStG – Selbstkontrolle"),
        ("checktable", {"headers": ["Angabe", "vorhanden", "Bemerkung"],
                        "widths": [0.66, 0.12, 0.22],
                        "rows": ["Vollständiger Name und Anschrift des leistenden Unternehmers",
                                 "Vollständiger Name und Anschrift des Leistungsempfängers",
                                 "Steuernummer oder USt-IdNr. des Ausstellers",
                                 "Ausstellungsdatum",
                                 "Fortlaufende Rechnungsnummer (einmalig vergeben)",
                                 "Menge und Art der Leistung, handelsübliche Bezeichnung",
                                 "Entgelt aufgeschlüsselt nach Steuersätzen und Steuerbetrag",
                                 "Bei Befreiung: Grund der Steuerbefreiung (z. B. § 19 UStG)",
                                 "Bei Anzahlungen: Hinweis auf die Vereinnahmung",
                                 "Gegebenenfalls USt-IdNr. des Empfängers bei Reverse Charge"],
                        "checkbox_cols": [1], "row_h": 16}),
        ("h", "Hinweise zur Abrechnung von Verkostungen"),
        ("bullets", [
            "**Tagessatz oder Pauschale:** Leistung genau benennen (Datum, Ort, Anzahl Einsatztage, Stunden). Sammelrechnung über mehrere Einsätze mit Einzelaufstellung ist zulässig.",
            "**Verkaufte Ware:** Warenverkauf und Dienstleistung getrennt ausweisen – unterschiedliche Steuersätze und Belegpflichten möglich.",
            "**Kleinunternehmer:** keine USt in der Rechnung, Hinweis nach § 19 UStG, keine Vorsteuer abziehbar. Grenzen: 25.000 € Vorjahr und 100.000 € laufendes Jahr.",
            "**Anzahlungen:** Anzahlungsrechnung mit USt ausweisen; Schlussrechnung mit Abzug der Anzahlung.",
            "**GoBD:** Rechnungen unverändert speichern, Nummernkreis lückenlos, keine Doppelnummern, Änderungen nur per Storno.",
            "**Aufbewahrung:** 8 Jahre für Rechnungen, 10 Jahre für Bücher und Abschlüsse (§ 147 AO), bei Grundstücken längere Fristen.",
        ]),
    ],
}

# ---------------------------------------------------------------- 13
DOK_13 = {
    "key": "13 · Rechtstexte",
    "file": "13-Datenschutz-und-Impressum",
    "title": "Impressum, Datenschutz und Verarbeitungsverzeichnis",
    "subtitle": "Bausteine für Website, Rechnungen und Aushänge · Einwilligung für Fotos · Pflichten nach DSGVO",
    "foot": "Mustertexte – an die eigene Praxis anpassen. Bei Website und Online-Buchung datenschutzrechtlich prüfen lassen.",
    "blocks": [
        ("h", "1 · Impressum (Website, Social Media, Angebote)"),
        ("p", "Pflichtangaben nach § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag (MStV)."),
        ("row", [
            {"name": "i1", "label": "Name und Anschrift (Straße, Hausnummer, PLZ, Ort)", "w": 1.7},
            {"name": "i2", "label": "Rechtsform / Zusatz", "w": 0.7},
        ]),
        ("row", [
            {"name": "i3", "label": "Telefon", "w": 0.8},
            {"name": "i4", "label": "E-Mail", "w": 1.2},
            {"name": "i5", "label": "USt-IdNr. oder Steuernummer", "w": 1.0},
        ]),
        ("row", [
            {"name": "i6", "label": "Vertretungsberechtigte Person", "w": 1.0},
            {"name": "i7", "label": "Registereintrag / Registernummer (falls vorhanden)", "w": 1.2},
        ]),
        ("row", [
            {"name": "i8", "label": "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", "w": 1.4},
            {"name": "i9", "label": "Aufsichtsbehörde (falls erlaubnispflichtig)", "w": 1.0},
        ]),
        ("row", [
            {"name": "i10", "label": "Berufsbezeichnung / Kammer (z. B. IHK Berlin)", "w": 1.4},
            {"name": "i11", "label": "Berufsrechtliche Regelungen", "w": 1.0},
        ]),
        ("field", {"name": "i12", "label": "Streitschlichtung / Verbraucherinformation (OS-Plattform-Hinweis, Teilnahme an Schlichtungsverfahren)", "h": 16}),
        ("hint", "Pflicht: Das Impressum muss leicht erkennbar, unmittelbar erreichbar und ständig verfügbar sein („Impressum“ in der Navigation). Bei Kleinunternehmern ohne USt-IdNr. genügt die Steuernummer; bei rein privater Website ohne geschäftliche Tätigkeit entfällt die Pflicht – bei Verkostungsaufträgen bist du geschäftlich unterwegs."),

        ("h", "2 · Datenschutzerklärung – Bausteine"),
        ("p", "Nach Art. 13 DSGVO ist bei der Erhebung personenbezogener Daten zu informieren. Diese Bausteine decken die typischen Fälle einer Verkostungstätigkeit ab; streiche, was nicht zutrifft, und ergänze Anbieter, Serverstandort und Speicherdauer."),
        ("table", {
            "headers": ["Zweck", "Daten", "Rechtsgrundlage", "Speicherdauer", "Empfänger"],
            "widths": [0.20, 0.24, 0.20, 0.18, 0.18],
            "rows": [["Vertrag und Abrechnung", "Name, Anschrift, Kontakt, Bankverbindung, Rechnungsdaten",
                      "Art. 6 Abs. 1 lit. b, c DSGVO", "10 Jahre (steuerlich)", "Steuerberatung, Finanzamt"],
                     ["Anfragen und Angebote", "Name, E-Mail, Telefon, Inhalt", "Art. 6 Abs. 1 lit. b, f DSGVO", "6 Monate nach Abschluss", "E-Mail-Anbieter"],
                     ["Website-Aufruf", "IP-Adresse, Zeit, abgerufene Seite", "Art. 6 Abs. 1 lit. f DSGVO", "7 Tage (Logfiles)", "Hosting-Anbieter"],
                     ["Fotos und Videos", "Bild, Name, ggf. Funktion", "Art. 6 Abs. 1 lit. a DSGVO", "bis Widerruf", "Social-Media-Plattformen"],
                     ["Verkostungsprotokolle", "durchführende Person, ggf. Gästedaten", "Art. 6 Abs. 1 lit. c, f DSGVO", "2–3 Jahre", "Lebensmittelaufsicht auf Verlangen"],
                     ["Bewerbungen / Aushilfen", "Bewerbungsdaten", "Art. 6 Abs. 1 lit. b DSGVO", "6 Monate", "keine"]],
            "size": 7.6,
            "row_h": 26}),
        ("field", {"name": "d1", "label": "Verantwortliche Stelle (Name, Anschrift, E-Mail) und Datenschutzbeauftragter, falls benannt", "h": 24, "type": "multi"}),
        ("p", "**Betroffenenrechte:** Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Widerruf einer Einwilligung (Art. 7 Abs. 3) sowie Beschwerde bei einer Aufsichtsbehörde (Art. 77). Zuständig in Berlin: Berliner Beauftragte für Datenschutz und Informationsfreiheit."),
        ("p", "**Hosting und Dienste:** Nenne Hosting-Anbieter, E-Mail-Anbieter, Buchhaltungs- oder Buchungstools sowie Newsletter-Dienste mit Anbieter, Sitz und Auftragsverarbeitungsvertrag. Bei Diensten außerhalb der EU: Grundlage und Garantien (Art. 44 ff. DSGVO) angeben."),

        ("pagebreak",),
        ("h", "3 · Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)"),
        ("p", "Pflicht für Unternehmen mit mehr als 250 Mitarbeitenden – und für alle anderen, wenn die Verarbeitung nicht nur gelegentlich erfolgt. Als Selbständiger mit Kunden, Rechnungen und Protokollen solltest du es führen; es ist bei Kontrollen vorzulegen."),
        ("table", {
            "headers": ["Verarbeitung", "betroffene Personen", "Datenkategorien", "Zweck", "Rechtsgrundlage", "Löschfrist", "Empfänger / Drittland"],
            "widths": [0.18, 0.14, 0.20, 0.16, 0.12, 0.10, 0.10],
            "rows": [["", "", "", "", "", "", ""], ["", "", "", "", "", "", ""], ["", "", "", "", "", "", ""], ["", "", "", "", "", "", ""]],
            "row_h": 30,
            "fillable": True,
        }),
        ("row", [
            {"name": "v3_verant", "label": "Verantwortlicher / Datenschutzbeauftragter", "w": 1.6},
            {"name": "v3_stand", "label": "Stand / letzte Prüfung", "w": 0.8},
        ]),
        ("h", "4 · Technische und organisatorische Maßnahmen (TOM) – Kurzfassung"),
        ("checktable", {"headers": ["Maßnahme", "umgesetzt", "Bemerkung"],
                        "widths": [0.66, 0.12, 0.22],
                        "rows": ["Zugriff auf Kunden- und Rechnungsdaten nur mit Passwort und Zwei-Faktor",
                                 "Geräte verschlüsselt, Bildschirmsperre, automatische Updates",
                                 "Backup der Buchhaltung und Protokolle (monatlich, extern)",
                                 "Papierunterlagen in verschließbarem Schrank",
                                 "E-Mail-Anbieter mit Auftragsverarbeitungsvertrag",
                                 "Löschkonzept für alte Anfragen und Protokolle",
                                 "Einwilligungen für Fotos dokumentiert",
                                 "Bei Verlust eines Geräts: Meldeprozess an die Aufsicht geklärt"],
                        "checkbox_cols": [1], "row_h": 16}),

        ("h", "5 · Einwilligung für Foto- und Videoaufnahmen"),
        ("row", [
            {"name": "f1", "label": "Name der abgebildeten Person", "w": 1.5},
            {"name": "f2", "label": "Veranstaltung / Ort / Datum", "w": 1.3},
        ]),
        ("p", "Ich willige ein, dass Foto- und Videoaufnahmen von mir, die im Rahmen von [Veranstaltung] am [Datum] entstanden sind, durch [Name des Verantwortlichen] zu folgenden Zwecken veröffentlicht werden: Website, Social-Media-Kanäle, Presseberichte, Referenzen und Angebotsunterlagen. Die Einwilligung umfasst die Aufnahme, Speicherung und Veröffentlichung in gedruckter und digitaler Form."),
        ("p", "Mir ist bekannt, dass ich diese Einwilligung jederzeit ohne Angabe von Gründen mit Wirkung für die Zukunft widerrufen kann; die Rechtmäßigkeit der bis dahin erfolgten Veröffentlichung bleibt unberührt. Nach Widerruf werden die Aufnahmen nicht weiter verwendet und aus Online-Angeboten entfernt, soweit technisch möglich."),
        ("row", [
            {"name": "f3", "label": "Ort, Datum", "w": 1.0},
            {"name": "f4", "label": "Unterschrift der abgebildeten Person (bei Minderjährigen: Erziehungsberechtigte)", "w": 1.8},
        ]),
        ("hint", "Bei Gruppenaufnahmen ohne erkennbare Einzelpersonen (Menge, Hände, Gläser) ist die Einwilligung in der Regel nicht erforderlich. Bei erkennbaren Personen immer – und bei Kindern zusätzlich die Erziehungsberechtigten."),
    ],
}

DOKS = [DOK_11, DOK_12, DOK_13]

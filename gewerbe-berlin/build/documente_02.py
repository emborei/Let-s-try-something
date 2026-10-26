# -*- coding: utf-8 -*-
"""Dokument 02 – Gewerbeanmeldung nach § 14 GewO (Vordruck GewA 1) + Ausfüllhilfe"""

DOK_02 = {
    "key": "02 · GewA 1",
    "file": "02-Gewerbeanmeldung-GewA1",
    "boxes": True,
    "title": "Gewerbe-Anmeldung nach § 14 oder § 55c der Gewerbeordnung",
    "subtitle": "Vordruck nach Anlage 1 der Gewerbeanzeigeverordnung (GewA 1) – Bezirk Berlin",
    "foot": "Vordruck nachgebildet nach der Anlage 1 GewAnzV. Amtliches Original: Formularverzeichnis Berlin bzw. Online-Verfahren des Einheitlichen Ansprechpartners.",
    "blocks": [
        ("row", [
            {"label": "Name der entgegennehmenden Stelle", "w": 2.1,
             "hint": "Bezirksamt von Berlin – Ordnungsamt, Fachbereich Gewerbe"},
            {"label": "Gemeindekennzahl der Gemeinde des Sitzes der Betriebsstätte", "w": 0.9,
             "hint": "11 0 0 0 0 0 0 (Stadt Berlin)"},
        ]),
        ("row", [
            {"label": "Vordruck", "w": 0.35, "hint": "GewA 1"},
            {"label": "Vorgangszeichen der Behörde (nicht ausfüllen)", "w": 1.0},
            {"label": "Eingangsdatum / Stempel", "w": 1.0},
        ]),
        ("p", "**Hinweis:** Bitte die nachfolgenden Felder vollständig und gut lesbar ausfüllen und die zutreffenden Kästchen ankreuzen. Bei Personengesellschaften ist für jeden geschäftsführenden Gesellschafter ein eigener Vordruck auszufüllen. Bei juristischen Personen sind in den Feldern 4 bis 11, 30 und 31 die Angaben zum gesetzlichen Vertreter einzutragen; für weitere gesetzliche Vertreter sind Beiblätter zu verwenden."),
        ("p", "Die Anmeldung ist **gleichzeitig mit dem Beginn des Betriebs** vorzunehmen (§ 14 GewO). Sie ist keine Genehmigung: Erlaubnisse, Handwerkskarte, Bau- oder Sondernutzungsrecht müssen gesondert vorliegen."),

        ("h", "Angaben zum Betriebsinhaber"),
        ("field", {"name": "01", "label": "1  Im Handels-, Genossenschafts- oder Vereinsregister, ggf. im Stiftungsverzeichnis eingetragen – Name mit Rechtsform (bei GbR: Angabe der weiteren Gesellschafter)",
                   "hint": "Einzelunternehmen ohne Registereintrag: Feld leer lassen."}),
        ("field", {"name": "02", "label": "2  Ort und Nummer des Eintrags im Handels-, Genossenschafts- oder Vereinsregister, ggf. Nummer im Stiftungsverzeichnis",
                   "hint": "z. B. Amtsgericht Berlin-Charlottenburg, HRB 000000 B"}),
        ("field", {"name": "03", "label": "3  Name des Geschäfts, wenn er vom eingetragenen Namen in Feld 1 abweicht (Geschäftsbezeichnung)",
                   "hint": "z. B. „Weinverkostung Nord“, „Tasting Studio Kreuzberg“ – ohne Rechtsformzusatz"}),

        ("h", "Angaben zur Person"),
        ("row", [
            {"name": "04", "label": "4  Name (Familienname)", "w": 1.1},
            {"name": "05", "label": "5  Vornamen", "w": 1.3},
            {"name": "07", "label": "7  Geburtsname (nur bei Abweichung)", "w": 1.1},
        ]),
        ("checks", {"name": "06a", "options": ["männlich", "weiblich", "divers", "ohne Angabe"],
                    "cols": 4, "label": "6  Geschlecht (Angabe entsprechend der Eintragung in der Geburtsurkunde)"}),
        ("row", [
            {"name": "08", "label": "8  Geburtsdatum (TT.MM.JJJJ)", "w": 0.8},
            {"name": "09", "label": "9  Geburtsort und -land", "w": 1.4},
        ]),
        ("row", [
            {"name": "10a", "label": "10  Staatsangehörigkeit(en)", "w": 1.0},
            {"name": "10b", "label": "weitere Staatsangehörigkeit", "w": 1.0},
        ]),
        ("field", {"name": "11", "label": "11  Anschrift der Wohnung (Straße, Hausnummer, Postleitzahl, Ort)", "h": 18}),
        ("row", [
            {"name": "11a", "label": "(Mobil-)Telefonnummer", "w": 1.0},
            {"name": "11b", "label": "E-Mail-Adresse", "w": 1.3},
            {"name": "11c", "label": "Internetadresse", "w": 1.0},
        ]),

        ("pagebreak",),
        ("h", "Angaben zum Betrieb"),
        ("row", [
            {"name": "12", "label": "12  Zahl der geschäftsführenden Gesellschafter (Personengesellschaften) / Zahl der gesetzlichen Vertreter (juristische Personen)", "w": 1.6},
            {"name": "14a", "label": "14  Vertretungsberechtigte Person / Betriebsleiter – Name, Vornamen", "w": 1.4},
        ]),
        ("checks", {"name": "13a", "options": ["nein", "ja – Beteiligung der öffentlichen Hand liegt vor"], "cols": 2,
                    "label": "13  Liegt eine Beteiligung der öffentlichen Hand vor?"}),
        ("field", {"name": "14b", "label": "14  Anschrift der vertretungsberechtigten Person / des Betriebsleiters (Straße, Hausnummer, PLZ, Ort)"}),
        ("field", {"name": "15", "label": "15  Betriebsstätte (Straße, Hausnummer, Postleitzahl, Ort)", "h": 18,
                   "hint": "Diese Anschrift bestimmt das zuständige Ordnungsamt. Arbeitszimmer in der Wohnung ist zulässig."}),
        ("row", [
            {"name": "15a", "label": "(Mobil-)Telefonnummer der Betriebsstätte", "w": 1.0},
            {"name": "15b", "label": "E-Mail-Adresse", "w": 1.3},
        ]),
        ("field", {"name": "16", "label": "16  Hauptniederlassung (nur ausfüllen, wenn die Betriebsstätte lediglich Zweigniederlassung oder unselbständige Zweigstelle ist)"}),
        ("field", {"name": "17", "label": "17  Frühere Betriebsstätte (nur bei Verlegung)"}),

        ("h", "Angemeldete Tätigkeit"),
        ("field", {"name": "18", "label": "18  Angemeldete Tätigkeit – bitte genau angeben (bei mehreren Tätigkeiten den Schwerpunkt unterstreichen, ggf. Beiblatt verwenden)",
                   "h": 62, "type": "multi", "box": True,
                   "hint": "Formulierungen für Verkostung/Verkauf: siehe Seite 3, Abschnitt A"}),
        ("checks", {"name": "19", "options": ["ja", "nein"], "cols": 2,
                    "label": "19  Wird die Tätigkeit (vorerst) im Nebenerwerb betrieben?"}),
        ("row", [
            {"name": "20", "label": "20  Datum des Beginns der angemeldeten Tätigkeit (TT.MM.JJJJ)", "w": 1.0},
            {"name": "22", "label": "22  Zahl der bei Geschäftsaufnahme tätigen Personen, ohne Inhaber", "w": 1.0},
        ]),
        ("checks", {"name": "21", "options": ["Industrie", "Handwerk", "Handel", "Sonstiges"],
                    "cols": 4, "label": "21  Art des angemeldeten Betriebes"}),
        ("checks", {"name": "23", "options": ["Hauptniederlassung", "Zweigniederlassung", "unselbständige Zweigstelle", "Reisegewerbe"],
                    "cols": 2, "label": "23/24  Die Anmeldung wird erstattet für"}),
        ("checks", {"name": "25", "options": ["Neugründung", "Wiedereröffnung nach Verlegung", "Übernahme (Erbfolge, Kauf, Pacht)",
                                              "Übergang nach dem Umwandlungsgesetz", "Wechsel der Rechtsform", "Gesellschaftereintritt"],
                    "cols": 3, "label": "25  Grund der Neuerrichtung / der Übernahme"}),
        ("row", [
            {"name": "26", "label": "26  Name des früheren Gewerbetreibenden oder früherer Firmenname", "w": 1.3},
            {"name": "27a", "label": "27  Bisheriger Unfallversicherungsträger", "w": 0.9},
            {"name": "27b", "label": "Bisherige Unternehmensnummer", "w": 0.8},
        ]),

        ("pagebreak",),
        ("h", "Erlaubnisse, Handwerk, Aufenthaltstitel"),
        ("checks", {"name": "28b", "options": ["nein", "ja – Angaben im Feld darunter"],
                    "cols": 2, "label": "28  Liegt für die angemeldete Tätigkeit eine Erlaubnis vor?"}),
        ("field", {"name": "28c", "label": "28  Erlaubnis: Ausstellungsdatum und erteilende Behörde"}),
        ("checks", {"name": "29a", "options": ["nein", "ja – Handwerkskarte liegt vor"], "cols": 2,
                    "label": "29  Nur Handwerksbetriebe der Anlage A der Handwerksordnung: Liegt eine Handwerkskarte vor?"}),
        ("field", {"name": "29b", "label": "29  Ausstellungsdatum und Name der Handwerkskammer"}),
        ("checks", {"name": "30a", "options": ["nein", "ja"], "cols": 2,
                    "label": "30  Nur für Ausländer mit Aufenthaltstitelpflicht: Liegt ein Aufenthaltstitel vor?"}),
        ("field", {"name": "30b", "label": "30  Ausstellungsdatum und erteilende Behörde"}),
        ("checks", {"name": "31a", "options": ["nein", "ja"], "cols": 2,
                    "label": "31  Enthält der Aufenthaltstitel eine die Erwerbstätigkeit betreffende Auflage?"}),
        ("field", {"name": "31b", "label": "31  Angabe der Auflage und/oder Beschränkung"}),

        ("box", {"tone": "warn", "title": "Hinweis der Behörde (Wortlaut des Vordrucks)",
                 "lines": ["Diese Anzeige berechtigt nicht zum Beginn des Gewerbes, wenn noch eine Erlaubnis oder eine Eintragung in die Handwerksrolle notwendig ist. Zuwiderhandlungen können mit Geldbuße, Geldstrafe oder Freiheitsstrafe geahndet werden.",
                           "Diese Anzeige ist keine Genehmigung zur Errichtung einer Betriebsstätte gemäß dem Planungs- und Baurecht."]}),
        ("row", [
            {"name": "32", "label": "32  Datum (TT.MM.JJJJ)", "w": 0.8},
            {"name": "33", "label": "33  Unterschrift des Betriebsinhabers / gesetzlichen Vertreters", "w": 2.0},
        ]),
        ("p", "Mit der Unterschrift wird die Richtigkeit und Vollständigkeit der Angaben versichert. Die Anzeige ist ohne Unterschrift unwirksam."),

        ("pagebreak",),
        ("h", "Ausfüllhilfe A · Feld 18 – Tätigkeit richtig beschreiben"),
        ("p", "Feld 18 ist das Feld, an dem Anmeldungen am häufigsten zurückkommen. Schreibe **was** du **womit** **für wen** tust – nicht nur „Verkostung“. Wähle den Baustein, der zu dir passt, und ergänze Produkte und Ort."),
        ("box", {"tone": "ok", "title": "Baustein 1 · Dienstleistung (typisch: Verkostungsaufträge)",
                 "lines": ["Durchführung von Produktverkostungen und Produktpräsentationen im Auftrag von Herstellern, Händlern und Veranstaltern, einschließlich Aufbau und Betrieb von Verkostungsständen, Warenpräsentation, Kundenberatung, Verbraucherinformation zu Inhalts- und Allergenstoffen sowie Erstellung von Verkostungsprotokollen; Durchführung von Schulungen für Verkaufspersonal. Kein Verkauf von Alkohol zum Verzehr an Ort und Stelle."]}),
        ("box", {"tone": "ok", "title": "Baustein 2 · Handel mit Lebensmitteln",
                 "lines": ["Handel mit und Vertrieb von Wein, Spirituosen, Feinkost und alkoholfreien Getränken, einschließlich Verkauf an Endkunden auf Veranstaltungen, Märkten und über das Internet, Lagerhaltung und Transport der Ware."]}),
        ("box", {"tone": "ok", "title": "Baustein 3 · Ausschank gegen Entgelt (nur mit Gaststättenrecht)",
                 "lines": ["Ausschank von Wein und anderen alkoholischen Getränken zum Verzehr an Ort und Stelle im Rahmen zeitlich begrenzter Veranstaltungen, Abgabe von zubereiteten Speisen und alkoholfreien Getränken."]}),
        ("hint", "Schwerpunkt unterstreichen, wenn du mehrere Bausteine kombinierst. Beispiel: Baustein 1 als Schwerpunkt, Baustein 2 ergänzend. Wenn du nur gegen Honorar verkostest und keine Ware verkaufst, nimm nur Baustein 1 – so bleibt die Anmeldung eindeutig."),
        ("h", "Ausfüllhilfe B · Die übrigen Felder in Kurzform"),
        ("table", {
            "headers": ["Feld", "Was eintragen", "Typisch für Verkostung"],
            "widths": [0.09, 0.56, 0.35],
            "rows": [
                ["1 / 2", "Nur bei Handelsregistereintrag; sonst leer", "leer"],
                ["3", "Geschäftsbezeichnung, falls du einen Namen führst", "z. B. „Tasting Berlin“"],
                ["4–9", "Exakt wie im Personalausweis", "–"],
                ["10", "Staatsangehörigkeit", "deutsch / weitere"],
                ["11", "Wohnanschrift und Kontakt", "für Rückfragen der Behörde"],
                ["12–14", "Nur Gesellschaften, öffentliche Hand, Betriebsleiter", "leer bzw. nein"],
                ["15", "Anschrift der Betriebsstätte = Sitz des Gewerbes", "Wohnung oder Lager möglich"],
                ["16 / 17", "Nur Zweigstelle oder Verlegung", "leer"],
                ["18", "Tätigkeit nach Baustein 1–3", "Baustein 1 (+2)"],
                ["19", "Nebenerwerb ja, wenn du angestellt/Student/Rentner bist", "ehrlich ankreuzen"],
                ["20", "Tag des tatsächlichen Beginns", "nicht in die Vergangenheit"],
                ["21", "Art des Betriebes", "Sonstiges, bei Warenverkauf Handel"],
                ["22", "Personenzahl ohne Inhaber", "0 bzw. „keine“"],
                ["23/24", "Hauptniederlassung (Regelfall)", "Hauptniederlassung"],
                ["25", "Neugründung", "Neugründung"],
                ["26–27", "Nur bei Übernahme oder Umzug", "leer"],
                ["28", "Erlaubnis: nur bei Gaststättenerlaubnis, Makler, Bewachung …", "nur bei Ausschank gegen Geld"],
                ["29", "Handwerkskarte", "nein"],
                ["30/31", "Aufenthaltstitel und Auflagen", "nur Nicht-EU"],
                ["32/33", "Datum und Unterschrift", "Original unterschreiben"],
            ]}),
        ("h", "Ausfüllhilfe C · Unterlagen und Abgabe"),
        ("table", {
            "headers": ["Weg", "Kosten", "Ablauf"],
            "widths": [0.24, 0.24, 0.52],
            "rows": [
                ["Online (eMeldung)", "15,00 €",
                 "gewerbemeldung.berlin.de / service.berlin.de › BundID-Konto › Angaben wie GewA 1 › Zahlung nur per Kreditkarte › Bestätigung ins BundID-Postfach"],
                ["Persönlich / Post", "26,00 €",
                 "Termin beim Ordnungsamt des Bezirks, Ausweis mitbringen, Gebühr per Karte; Vordruck GewA 1 ausfüllen oder vor Ort ausfüllen"],
                ["Juristische Person", "31,00 € (+13 € je weiterem Vertreter)",
                 "Handelsregisterauszug und Beiblätter für alle Vertretungsberechtigten"],
            ]}),
        ("p", "**Nach der Anmeldung:** Das Ordnungsamt leitet die Daten an Finanzamt, IHK, Berufsgenossenschaft, Handwerkskammer und Statistik weiter. Du erhältst den Gewerbeschein („Gewerbeanmeldung“) – kopieren, in die Betriebsmappe, Original zu Hause."),
        ("signature", {"left": "Ort, Datum", "right": "Unterschrift (nur bei eigener Abgabe nötig)"}),
    ],
}

DOKS = [DOK_02]


# ---------------------------------------------------------------- vorausgefüllte Variante
from prefill import make_prefilled  # noqa: E402

TEXT_18 = (
    "Durchführung von Produktverkostungen und Produktpräsentationen im Auftrag von Herstellern, "
    "Händlern und Veranstaltern, einschließlich Aufbau und Betrieb von Verkostungsständen, "
    "Warenpräsentation, Kundenberatung, Verbraucherinformation zu Inhalts- und Allergenstoffen "
    "sowie Erstellung von Verkostungsprotokollen; Durchführung von Schulungen für Verkaufspersonal. "
    "Handel mit Wein, Spirituosen, Feinkost und alkoholfreien Getränken einschließlich Verkauf an "
    "Endkunden auf Veranstaltungen und Märkten sowie über das Internet. "
    "Kein Ausschank von Alkohol zum Verzehr an Ort und Stelle."
)

VOR_WERTE = {"18": TEXT_18,
             "22": "0"}
VOR_CHECKS = {
    "13a": ["nein"],
    "19": ["nein"],
    "21": ["Sonstiges"],
    "23": ["Hauptniederlassung"],
    "25": ["Neugründung"],
    "28b": ["nein"],
    "29a": ["nein"],
    "30a": ["nein"],
    "31a": ["nein"],
}

DOK_02V = make_prefilled(
    DOK_02, values=VOR_WERTE, checks=VOR_CHECKS,
    key="02b · GewA 1 vorausgefüllt",
    file="02b-Gewerbeanmeldung-GewA1-vorausgefuellt",
    title="Gewerbe-Anmeldung nach § 14 GewO · vorausgefüllt",
    subtitle="Vorausgefüllte Fassung für Verkostungs- und Verkaufsaufträge – Personalien und Adressen bleiben leer",
    intro_extra=[
        "Gesetzt sind nur Angaben, die sich aus der Tätigkeit ergeben: Feld 18 (Tätigkeit), Feld 21 (Art des Betriebes), Feld 23 (Hauptniederlassung), Feld 25 (Neugründung), Feld 28–31 (keine Erlaubnis, kein Handwerk, kein Aufenthaltstitel) sowie Feld 22 (0 Beschäftigte).",
        "Bitte prüfen: Feld 19 (Nebenerwerb) nur ankreuzen, wenn du hauptberuflich angestellt, in Ausbildung oder im Ruhestand bist. Feld 20 (Beginn) auf den tatsächlichen Tag setzen. Wenn du auch Alkohol gegen Geld ausschenkst: Feld 28 auf „ja“ ändern und die Gaststätten-Erlaubnis eintragen (Dokument 09).",
        "Der eingedruckte Text ist ein Vorschlag: Kürze ihn handschriftlich (mit Datum und Kürzel) oder nutze die leere Fassung 02, wenn du ihn digital anpassen willst. Wenn du ausschließlich verkostest und keine Ware verkaufst, streiche den Handelssatz.",
    ])

DOKS = [DOK_02, DOK_02V]

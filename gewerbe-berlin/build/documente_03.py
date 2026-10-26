# -*- coding: utf-8 -*-
"""Dokument 03 – Meldung als Lebensmittelunternehmer (Art. 6 VO (EG) 852/2004)"""

DOK_03 = {
    "key": "03 · LMU-Meldung",
    "file": "03-Meldung-Lebensmittelunternehmer",
    "title": "Meldung nach Artikel 6 der Verordnung (EG) Nr. 852/2004 über Lebensmittelhygiene",
    "subtitle": "Registrierung als Lebensmittelunternehmer – Veterinär- und Lebensmittelaufsicht des Bezirks",
    "boxes": True,
    "foot": "Nachgebildet nach dem Berliner Meldevordruck. Die Meldung ist kostenlos und ersetzt keine Erlaubnis (z. B. Gaststättenrecht).",
    "blocks": [
        ("row", [
            {"label": "An: Bezirksamt von Berlin – Veterinär- und Lebensmittelaufsicht", "w": 1.6,
             "hint": "Anschrift des für die Betriebsstätte zuständigen Bezirksamts eintragen"},
            {"label": "Bezirk", "w": 0.7},
            {"label": "Eingangsvermerk der Behörde", "w": 0.8},
        ]),
        ("field", {"label": "Postanschrift / Straße, Hausnummer, PLZ, Ort der Behörde"}),
        ("p", "Lebensmittelunternehmer haben nach Artikel 6 der Verordnung (EG) Nr. 852/2004 der zuständigen Behörde die ihrer Kontrolle unterstehenden Betriebe **zu melden**. Lebensmittelunternehmen sind alle Unternehmen, die eine mit der Produktion, der Verarbeitung und dem Vertrieb von Lebensmitteln zusammenhängende Tätigkeit ausführen – auch ohne Gewinnerzielungsabsicht (Art. 3 Nr. 2 VO (EG) 178/2002)."),
        ("p", "Besteht ein Lebensmittelunternehmen aus mehreren Betriebsstätten, hat die Meldung **für jeden Betrieb gesondert** zu erfolgen. Bei Änderung der Daten ist unverzüglich eine Änderungsmeldung zu senden."),

        ("checks", {"name": "art", "options": ["Anmeldung", "Änderung", "Abmeldung"], "cols": 3,
                    "label": "Art der Meldung"}),
        ("checks", {"name": "zeitweise", "options": ["keine zeitweise Meldung", "zeitweise Meldung (Messe, Markt, Event) – Zeitraum unten"],
                    "cols": 2, "label": "Zeitweise Meldung"}),
        ("field", {"name": "zeitraum", "label": "Zeitraum und Anlass der zeitweisen Meldung (von – bis, Veranstaltung)"}),

        ("h", "Bezeichnung und Adresse der Betriebsstätte"),
        ("p", "Soweit abweichend von den Kontaktdaten des Unternehmers. Bei Tätigkeit von wechselnden Orten: die Betriebsstätte eintragen, von der aus die Tätigkeit organisiert wird (Lager, Büro, Wohnung)."),
        ("row", [
            {"name": "bst_name", "label": "Name der Betriebsstätte", "w": 1.2},
            {"name": "bst_str", "label": "Straße und Hausnummer", "w": 1.2},
            {"name": "bst_hn", "label": "Halle / Stand / Einheit", "w": 0.6},
        ]),
        ("row", [
            {"name": "bst_plz", "label": "Postleitzahl", "w": 0.55},
            {"name": "bst_ort", "label": "Ort", "w": 1.1},
            {"name": "bst_zus", "label": "Ortsteil / Zusatz", "w": 0.8},
        ]),

        ("h", "Kontaktdaten des Lebensmittelunternehmers"),
        ("row", [
            {"name": "firma", "label": "Firmierung / Name (wie in der Gewerbeanmeldung)", "w": 1.4},
            {"name": "gf", "label": "Geschäftsführung / Inhaber (Vorname, Name)", "w": 1.3},
        ]),
        ("row", [
            {"name": "str", "label": "Straße und Hausnummer", "w": 1.2},
            {"name": "plz", "label": "Postleitzahl", "w": 0.55},
            {"name": "ort", "label": "Ort", "w": 1.0},
        ]),
        ("row", [
            {"name": "tel", "label": "Telefon", "w": 0.8},
            {"name": "mail", "label": "E-Mail", "w": 1.2},
            {"name": "fax", "label": "Fax (falls vorhanden)", "w": 0.8},
        ]),
        ("row", [
            {"name": "gewerbe", "label": "Gewerbeanmeldung vom / Aktenzeichen", "w": 1.2},
            {"name": "ustid", "label": "Steuernummer / USt-IdNr.", "w": 1.0},
        ]),

        ("pagebreak",),
        ("h", "Betriebsart / Tätigkeit"),
        ("p", "Zutreffendes ankreuzen – Mehrfachnennung möglich. Für Verkostungs- und Verkaufstätigkeiten sind in der Regel „Einzelhändler“ und „Dienstleistungsbetrieb“ bzw. „Sonstige(s)“ zutreffend."),
        ("checks", {"name": "art1", "options": ["Erzeuger (Urproduktion)", "Hersteller / Abpacker",
                                               "Hersteller, im Wesentlichen Einzelhandel", "Dienstleistungsbetrieb",
                                               "Einzelhändler", "Großhändler / Vertrieb",
                                               "Gaststättenbetrieb / Ausschank", "Sonstige(s) – siehe Feld darunter"],
                    "cols": 3, "label": "Betriebsart"}),
        ("field", {"name": "art2", "label": "Sonstige Tätigkeit / nähere Beschreibung", "h": 30, "type": "multi"}),
        ("field", {"name": "sortiment", "label": "Angaben zum Produktsortiment (z. B. Wein, Schaumwein, Spirituosen, Feinkost, alkoholfreie Getränke, Gläser/Geschenkpackungen)",
                   "h": 42, "type": "multi"}),
        ("field", {"name": "tierisch", "label": "Werden Lebensmittel tierischen Ursprungs (Fleisch, Milch, Fisch, Eiprodukte) behandelt oder abgegeben? Wenn ja: welche?",
                   "h": 26, "type": "multi"}),
        ("checks", {"name": "fern", "options": ["Nein", "Ja – Angaben im Feld darunter"],
                    "cols": 2, "label": "Tätigkeiten im Wege der Fernkommunikation (Onlinehandel, Telefonvertrieb)?"}),
        ("field", {"name": "fern2", "label": "Fernkommunikation: Art, Internetadresse, Versandweg (z. B. Shop, Kühlversand)"}),
        ("checks", {"name": "alkohol", "options": ["nein", "ja, unentgeltliche Kostproben", "ja, Ausschank gegen Entgelt – Gestattung/Erlaubnis siehe Dokument 09"],
                    "cols": 3, "label": "Wird Alkohol an Endverbraucher abgegeben?"}),
        ("checks", {"name": "lager", "options": ["nein", "ja, eigener Lagerraum", "ja, Kühlraum / Kühlzelle"],
                    "cols": 3, "label": "Werden Lebensmittel gelagert?"}),

        ("h", "Unterschrift"),
        ("p", "Ich bestätige die Angaben der Meldung mit meiner Unterschrift."),
        ("row", [
            {"name": "o1", "label": "Ort, Datum", "w": 1.0},
            {"name": "u1", "label": "Unterschrift des Lebensmittelunternehmers", "w": 1.7},
        ]),

        ("pagebreak",),
        ("h", "Hinweise zur Meldung"),
        ("h2", "A · Zuständige Behörde"),
        ("p", "Zuständig ist die Veterinär- und Lebensmittelaufsicht des Bezirksamts, in dessen Bezirk die Betriebsstätte liegt. Berlin hat zwölf Bezirke; ein zentrales Lebensmittelamt gibt es nicht. Die Anschriften und Kontaktdaten stehen auf service.berlin.de und auf den Bezirksseiten."),
        ("table", {
            "headers": ["Bezirk", "zuständig, wenn die Betriebsstätte liegt in"],
            "widths": [0.34, 0.66],
            "rows": [
                ["Mitte", "Mitte, Moabit, Wedding, Tiergarten"],
                ["Friedrichshain-Kreuzberg", "Friedrichshain, Kreuzberg"],
                ["Pankow", "Pankow, Prenzlauer Berg, Weißensee, Buch"],
                ["Charlottenburg-Wilmersdorf", "Charlottenburg, Wilmersdorf, Grunewald"],
                ["Spandau", "Spandau, Haselhorst, Kladow"],
                ["Steglitz-Zehlendorf", "Steglitz, Zehlendorf, Lichterfelde, Wannsee"],
                ["Tempelhof-Schöneberg", "Tempelhof, Schöneberg, Mariendorf, Lichtenrade"],
                ["Neukölln", "Neukölln, Britz, Rudow, Gropiusstadt"],
                ["Treptow-Köpenick", "Treptow, Köpenick, Adlershof, Grünau"],
                ["Marzahn-Hellersdorf", "Marzahn, Hellersdorf, Kaulsdorf"],
                ["Lichtenberg", "Lichtenberg, Friedrichsfelde, Hohenschönhausen"],
                ["Reinickendorf", "Reinickendorf, Tegel, Hermsdorf, Frohnau"],
            ]}),
        ("h2", "B · Was die Meldung ist – und was nicht"),
        ("bullets", [
            "Die Meldung ist eine **Registrierung**, keine Genehmigung. Sie ist kostenlos und wird nicht „bescheinigt“; auf Wunsch bestätigt die Behörde den Eingang.",
            "Die Meldung ersetzt **keine** andere vorgeschriebene Anzeige, Erlaubnis oder Zulassung – insbesondere nicht die Gaststättenerlaubnis oder die Sondernutzungserlaubnis.",
            "Die Meldung muss **vor Aufnahme der Tätigkeit** erfolgen. Wird ein Betrieb ohne Meldung betrieben, ist das eine Ordnungswidrigkeit.",
            "Änderungen (Anschrift, Inhaber, Tätigkeit, Aufgabe) sind **unverzüglich** zu melden; die Abmeldung ist kostenlos.",
            "Wer zusätzlich Bedarfsgegenstände im Sinne der Bedarfsgegenständeverordnung herstellt oder behandelt (z. B. eigene Verpackungen, Gläser mit Lebensmittelkontakt), zeigt das nach § 2a Bedarfsgegenständeverordnung bei derselben Behörde an.",
        ]),
        ("h2", "C · In Berlin üblich: Gewerbeanmeldung allein reicht oft nicht"),
        ("p", "In mehreren Bundesländern gilt die Gewerbeanmeldung zugleich als Meldung nach Art. 6, weil die Gewerbedaten an die Lebensmittelaufsicht weitergeleitet werden. In Berlin ist das nicht zuverlässig: Die Lebensmittelaufsicht sitzt bei den Bezirksämtern, die Gewerbedaten laufen beim Ordnungsamt auf. **Sende die Meldung deshalb zusätzlich** – per E-Mail (Scan) oder Post, und hefte die Sendebestätigung in die Betriebsmappe."),
        ("h2", "D · Unterlagen, die du beilegen kannst"),
        ("checktable", {"headers": ["Unterlage", "liegt bei", "Datum"],
                        "widths": [0.68, 0.14, 0.18],
                        "rows": ["Kopie der Gewerbeanmeldung",
                                 "Kopie der IfSG-Bescheinigung (§ 43)",
                                 "Hygienekonzept (Dokument 05), Kurzfassung",
                                 "Lageplan / Grundriss der Betriebsstätte (bei Lager oder Ausschank)",
                                 "Produktliste / Lieferantenliste",
                                 "Nachweis Hygieneschulung"],
                        "checkbox_cols": [1], "row_h": 17}),
        ("h2", "E · Nach der Meldung"),
        ("numbered", [
            "Eingangsbestätigung oder eigenen Sendebericht ablegen (Datum, Uhrzeit, Empfänger).",
            "Betrieb in die Liste der zuständigen Aufsicht aufnehmen (kommt mit der ersten Kontrolle).",
            "Bei Kontrollen vorlegen: Gewerbeanmeldung, Hygienekonzept, Aufzeichnungen, IfSG-Bescheinigungen.",
        ]),
        ("box", {"tone": "info", "title": "Mustertext für die E-Mail",
                 "lines": ["Betreff: Meldung eines Lebensmittelunternehmens nach Art. 6 VO (EG) 852/2004 – [Name], [Anschrift]",
                           "Sehr geehrte Damen und Herren, hiermit melde ich mein Lebensmittelunternehmen gemäß Artikel 6 der Verordnung (EG) Nr. 852/2004 an. Die ausgefüllte Meldung und die Nachweise sind als PDF beigefügt. Um eine kurze Eingangsbestätigung bitte ich. Mit freundlichen Grüßen, [Name]"]}),
        ("signature", {"left": "Ort, Datum", "right": "Unterschrift"}),
    ],
}

DOKS = [DOK_03]


# ---------------------------------------------------------------- vorausgefüllte Variante
from prefill import make_prefilled  # noqa: E402

SORTIMENT = ("Wein, Schaumwein, Spirituosen, alkoholfreie Getränke, Feinkost und Geschenkpackungen. "
             "Verkostung durch geschultes Personal im Auftrag von Herstellern und Händlern; "
             "Abgabe von Proben in Gläsern.")

DOK_03V = make_prefilled(
    DOK_03,
    values={"sortiment": SORTIMENT,
            "art2": ("Durchführung von Produktverkostungen und Produktpräsentationen im Auftrag von Herstellern, "
                     "Händlern und Veranstaltern; Betrieb von Verkostungsständen; Kundenberatung; "
                     "Verkauf verpackter Ware.")},
    checks={"art": ["Anmeldung"],
            "zeitweise": ["keine zeitweise Meldung"],
            "art1": ["Dienstleistungsbetrieb", "Einzelhändler"],
            "tierisch2": [],
            "fern": ["Nein"],
            "alkohol": ["ja, unentgeltliche Kostproben"],
            "lager": ["ja, eigener Lagerraum"]},
    key="03b · LMU vorausgefüllt",
    file="03b-Meldung-Lebensmittelunternehmer-vorausgefuellt",
    title="Meldung nach Art. 6 VO (EG) 852/2004 · vorausgefüllt",
    subtitle="Vorausgefüllte Fassung für Verkostungs- und Verkaufsaufträge – Adressen und Personalien bleiben leer",
    intro_extra=[
        "Gesetzt sind: Art der Meldung (Anmeldung), keine zeitweise Meldung, Betriebsart (Dienstleistungsbetrieb und Einzelhändler), Produktsortiment und der Hinweis, dass kein Fernabsatz erfolgt. Ohne Fernabsatz bleibt das Feld zur Fernkommunikation auf „Nein“.",
        "Bitte prüfen und anpassen: Bezirk und Anschrift der Behörde, Betriebsstätte, Kontaktdaten, Alkoholabgabe (angekreuzt sind unentgeltliche Kostproben – bei Ausschank gegen Geld das dritte Kästchen wählen) und die Lagerangabe. Die eingedruckten Texte kannst du handschriftlich kürzen (Datum und Kürzel) oder die leere Fassung 03 digital ausfüllen.",
    ])

DOKS = [DOK_03, DOK_03V]

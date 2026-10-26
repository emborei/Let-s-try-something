# -*- coding: utf-8 -*-
"""Dokument 04 – Infektionsschutz: Erstbelehrung, Erklärung, Folgebelehrung"""

DOK_04 = {
    "key": "04 · IfSG-Belehrung",
    "file": "04-IfSG-Belehrung",
    "title": "Belehrung nach § 43 Infektionsschutzgesetz",
    "subtitle": "Erstbelehrung beim Gesundheitsamt vorbereiten · Erklärung in Textform · Folgebelehrung des Arbeitgebers dokumentieren",
    "foot": "Die Bescheinigung stellt ausschließlich das Gesundheitsamt (oder ein beauftragter Arzt) aus. Dieses Blatt bereitet Termin und Nachweise vor.",
    "blocks": [
        ("box", {"tone": "info", "title": "Das Wichtigste in drei Sätzen",
                 "lines": [
                     "Wer gewerbsmäßig mit bestimmten Lebensmitteln umgeht, in Gaststättenküchen arbeitet oder offene Getränke ausgibt, braucht **vor** der ersten Tätigkeit eine Bescheinigung des Gesundheitsamts nach § 43 Abs. 1 IfSG.",
                     "Die Bescheinigung darf bei Aufnahme der Tätigkeit **nicht älter als drei Monate** sein – danach gilt sie lebenslang.",
                     "Der Arbeitgeber (auch: du selbst als Einzelunternehmer mit Personal) belehrt **nach Aufnahme der Tätigkeit und danach alle zwei Jahre** und dokumentiert die Teilnahme (§ 43 Abs. 4 IfSG).",
                 ]}),

        ("h", "Teil A · Termin beim Gesundheitsamt vorbereiten"),
        ("p", "Das Formular ist kein amtlicher Antrag, sondern dein Termin- und Unterlagenblatt: Es enthält alles, was das Gesundheitsamt am Telefon oder im Online-Termin von dir wissen will."),
        ("row", [
            {"name": "a_bezirk", "label": "Zuständiges Gesundheitsamt (Bezirk)", "w": 1.1},
            {"name": "a_termin", "label": "Wunschtermin / Terminbestätigung", "w": 0.9},
            {"name": "a_az", "label": "Aktenzeichen / Buchungsnummer", "w": 0.9},
        ]),
        ("row", [
            {"name": "a_name", "label": "Name, Vornamen (wie im Ausweis)", "w": 1.3},
            {"name": "a_geb", "label": "Geburtsdatum, -ort", "w": 1.0},
        ]),
        ("row", [
            {"name": "a_str", "label": "Anschrift (Straße, Hausnummer)", "w": 1.3},
            {"name": "a_plz", "label": "PLZ", "w": 0.45},
            {"name": "a_ort", "label": "Ort", "w": 0.9},
        ]),
        ("row", [
            {"name": "a_tel", "label": "Telefon", "w": 0.8},
            {"name": "a_mail", "label": "E-Mail", "w": 1.2},
            {"name": "a_staat", "label": "Staatsangehörigkeit", "w": 0.8},
        ]),
        ("field", {"name": "a_taetigkeit", "label": "Ausgeübte / geplante Tätigkeit (z. B. Verkostung von Wein, Ausschank, Verkauf offener Ware, Arbeit in der Küche)",
                   "h": 30, "type": "multi"}),
        ("row", [
            {"name": "a_ag", "label": "Arbeitgeber / Auftraggeber (Name, Anschrift)", "w": 1.5},
            {"name": "a_beginn", "label": "Beginn der Tätigkeit", "w": 0.8},
        ]),
        ("checks", {"name": "a_unterlagen", "options": ["Personalausweis / Pass", "Meldebescheinigung", "Arbeitgeberbescheinigung",
                                                       "Vordruck des Gesundheitsamts", "Gebühr (EC-Karte)"],
                    "cols": 3, "label": "Zum Termin mitbringen"}),
        ("hint", "Gebühr in Berlin: rund 30 € bei Gruppenbelehrung (ab ca. 10 Personen), rund 49 € bei Einzelbelehrung; Zahlung meist nur mit EC-Karte. Termine vergibt das Gesundheitsamt des Bezirks – meist online oder telefonisch, teils mit Wartezeit. Wer die Bescheinigung schon hat: keine neue Belehrung nötig, solange sie gültig ist."),

        ("h", "Teil B · Erklärung nach der Belehrung (§ 43 Abs. 1 Nr. 2 IfSG)"),
        ("p", "Nach der Belehrung erklärst du in Textform, dass dir keine Tatsachen für ein Tätigkeitsverbot bekannt sind. Dieses Blatt kannst du unterschrieben zum Termin mitnehmen, wenn das Gesundheitsamt keine eigene Erklärung aushändigt."),
        ("p", "Ich wurde über die Tätigkeitsverbote nach § 42 Abs. 1 IfSG und über meine Verpflichtungen nach § 43 Abs. 2, 4 und 5 IfSG mündlich und schriftlich belehrt. Mir sind keine Tatsachen bekannt, die ein Tätigkeitsverbot nach § 42 Abs. 1 IfSG begründen. Ich verpflichte mich, das Gesundheitsamt unverzüglich zu informieren, wenn bei mir Tatsachen für ein Tätigkeitsverbot auftreten."),
        ("row", [
            {"name": "b_ort", "label": "Ort, Datum", "w": 1.0},
            {"name": "b_name", "label": "Name in Druckbuchstaben", "w": 1.3},
            {"name": "b_unt", "label": "Unterschrift", "w": 1.3},
        ]),

        ("pagebreak",),
        ("h", "Teil C · Merkblatt: Tätigkeitsverbote nach § 42 IfSG"),
        ("p", "Die folgenden Personen dürfen nicht tätig sein oder beschäftigt werden beim Herstellen, Behandeln oder Inverkehrbringen der in § 42 Abs. 2 IfSG genannten Lebensmittel, wenn sie dabei mit diesen in Berührung kommen – und nicht in Küchen von Gaststätten und Einrichtungen mit Gemeinschaftsverpflegung:"),
        ("numbered", [
            "Personen, die an Typhus abdominalis, Paratyphus, Cholera, Shigellenruhr, Salmonellose, einer anderen infektiösen Gastroenteritis oder Virushepatitis A oder E erkrankt oder dessen verdächtig sind.",
            "Personen, die an infizierten Wunden oder an Hautkrankheiten erkrankt sind, bei denen die Möglichkeit besteht, dass die Krankheitserreger über Lebensmittel übertragen werden können.",
            "Personen, die die Krankheitserreger Shigellen, Salmonellen, enterohämorrhagische Escherichia coli oder Choleravibrionen ausscheiden.",
        ]),
        ("p", "Betroffene Lebensmittel nach § 42 Abs. 2 IfSG: Fleisch, Geflügelfleisch und Erzeugnisse daraus; Milch und Milcherzeugnisse; Fische, Krebse, Weichtiere und Erzeugnisse daraus; Eiprodukte; Säuglings- und Kleinkindernahrung; Speiseeis und Speiseeishalberzeugnisse; Backwaren mit nicht durchgebackener Füllung oder Auflage; Feinkost-, Rohkost- und Kartoffelsalate, Marinaden, Mayonnaisen, emulgierte Soßen, Nahrungshefen; Sprossen und Keimlinge zum Rohverzehr."),
        ("hint", "Für reine Weinverkostung und Ausschank steht das Thema Infektionsschutz nicht im Vordergrund – die Bescheinigung wird von den Behörden aber im gastronomischen Umfeld regelmäßig verlangt, insbesondere wenn Gläser, offene Ware oder Speisen im Spiel sind. Wer ausschließlich original verschlossene, abgepackte Flaschen abgibt und keine Gläser verwendet, sollte die Notwendigkeit mit dem Gesundheitsamt kurz abstimmen und das Ergebnis notieren."),

        ("h", "Teil D · Folgebelehrung des Arbeitgebers (§ 43 Abs. 4 IfSG)"),
        ("p", "Diese Belehrung erfolgt durch dich als Unternehmer bzw. Arbeitgeber: **nach Aufnahme der Tätigkeit und danach alle zwei Jahre**. Die Teilnahme ist zu dokumentieren. Belehrungsthemen: Tätigkeitsverbote nach § 42, Verhalten bei Krankheit, Meldepflicht an das Gesundheitsamt, Hygieneregeln, Händewaschen, Wundabdeckung, Arbeitskleidung."),
        ("table", {
            "headers": ["Name, Vorname", "Tätigkeit", "Erstbelehrung am (Bescheinigung)", "Folgebelehrung am", "Unterschrift"],
            "widths": [0.26, 0.18, 0.20, 0.16, 0.20],
            "rows": [],
            "empty": 7,
            "row_h": 18,
            "fillable": True,
        }),
        ("row", [
            {"name": "d_ort", "label": "Ort, Datum der Belehrung", "w": 1.0},
            {"name": "d_wer", "label": "Belehrt durch (Name, Funktion)", "w": 1.3},
            {"name": "d_unt", "label": "Unterschrift Belehrender", "w": 1.2},
        ]),
        ("hint", "Aufbewahrung: Die Bescheinigung nach § 43 Abs. 1 IfSG und die Dokumentation der letzten Folgebelehrung sind an der Arbeitsstätte verfügbar zu halten und bei Kontrollen vorzulegen. Kopie in die Betriebsmappe, Original beim Inhaber."),
    ],
}

DOKS = [DOK_04]

# -*- coding: utf-8 -*-
"""prefill.py – erzeugt aus einem leeren Formular eine vorausgefüllte Variante.

Nur nicht-personenbezogene Angaben werden gesetzt: Tätigkeitstext, Betriebsart,
Neugründung, Häkchen, die für Verkostungs-/Verkaufsaufträge in Berlin passen.
Personalien, Adressen, Daten und Unterschriften bleiben leer.
"""

import copy


def _apply(spec, values, checks):
    name = spec.get("name")
    if name in values:
        spec["value"] = values[name]
    if name in checks:
        opts = spec.get("options", [])
        wanted = checks[name]
        spec["checked"] = [opt in wanted for opt in opts]


def make_prefilled(doc, values=None, checks=None, key=None, file=None, title=None,
                   subtitle=None, note=None, intro_extra=None):
    values = values or {}
    checks = checks or {}
    new = copy.deepcopy(doc)
    for block in new["blocks"]:
        if block[0] in ("field", "checks"):
            _apply(block[1], values, checks)
        elif block[0] == "row":
            for spec in block[1]:
                _apply(spec, values, checks)
        elif block[0] == "checktable":
            pass
    if key:
        new["key"] = key
    if file:
        new["file"] = file
    if title:
        new["title"] = title
    if subtitle:
        new["subtitle"] = subtitle
    if intro_extra:
        # Hinweis direkt nach dem Untertitel einfügen
        new["blocks"] = [("box", {"tone": "ok", "title": "Vorausgefüllt – Personalien selbst ergänzen",
                                  "lines": intro_extra})] + new["blocks"]
    return new

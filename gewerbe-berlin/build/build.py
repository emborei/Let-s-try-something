#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py – erzeugt alle Formblätter als einzelne PDFs und als Gesamtpaket.

Aufruf:
    /tmp/pdfenv/bin/python build.py            # nur neu bauen
    /tmp/pdfenv/bin/python build.py --preview  # zusätzlich PNG-Vorschauen

Voraussetzung: reportlab (pip install reportlab)
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "formulare")

from engine import Builder  # noqa: E402

import documente_00  # noqa: E402
import documente_02  # noqa: E402
import documente_03  # noqa: E402
import documente_04  # noqa: E402
import documente_05  # noqa: E402
import documente_06  # noqa: E402
import documente_07  # noqa: E402
import documente_08  # noqa: E402

# Reihenfolge im Paket
GROUPS = [
    documente_00.DOKS,
    documente_02.DOKS,
    documente_03.DOKS,
    documente_04.DOKS,
    documente_05.DOKS,
    documente_06.DOKS,
    documente_07.DOKS,
    documente_08.DOKS,
]

DOCS = [d for g in GROUPS for d in g]


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for d in DOCS:
        path = os.path.join(OUT, d["file"] + ".pdf")
        pages = Builder(path).render([d])
        total += pages
        print(f"  {d['file']}.pdf  ({pages} S.)")

    path = os.path.join(OUT, "Startpaket-Verkostung-Berlin-komplett.pdf")
    pages = Builder(path).render(DOCS)
    print(f"\nGesamtpaket: {len(DOCS)} Dokumente, {pages} Seiten")
    print(f"Ausgabe: {os.path.normpath(OUT)}")

    if "--preview" in sys.argv:
        make_previews()


def make_previews():
    import pypdfium2 as pdfium
    prev = os.path.join(HERE, "..", ".preview")
    os.makedirs(prev, exist_ok=True)
    for d in DOCS:
        pdf = pdfium.PdfDocument(os.path.join(OUT, d["file"] + ".pdf"))
        for i in range(min(len(pdf), 6)):
            page = pdf[i]
            img = page.render(scale=1.6).to_pil()
            img.save(os.path.join(prev, f"{d['file'][:2]}-p{i + 1}.png"))
        pdf.close()
    print("Vorschauen in", os.path.normpath(prev))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
engine.py – kleiner Formular-Renderer für A4-Formblätter (reportlab).

Erzeugt PDFs mit echten AcroForm-Feldern: am Bildschirm ausfüllbar,
ausgedruckt eine leere Papierform mit Schreiblinien.

Blöcke (siehe documente*.py):
    ("title", text)                     Dokumenttitel (nur Seitenanfang)
    ("h", text)                         Abschnittsüberschrift
    ("h2", text)                        Unterüberschrift
    ("p", text)                         Absatz, **fett** wird unterstützt
    ("bullets", [..])                   Aufzählung
    ("numbered", [..])                  numerierte Liste
    ("hint", text)                      kleiner grauer Hinweis
    ("box", {tone,title,lines})         farbige Info-Box
    ("label", text)                     Feldgruppen-Überschrift
    ("field", {...})                    ein Feld über volle Breite
    ("row", [{...}, {...}])             Felder nebeneinander
    ("checks", {label, options, cols})  Ankreuzgruppe
    ("table", {headers, widths, rows, empty, row_h, fillable})
    ("signature", {left, right})
    ("spacer", pts)
    ("pagebreak",)
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, black
from reportlab.pdfbase.pdfmetrics import stringWidth

PAGE_W, PAGE_H = A4
M_LEFT = 42
M_RIGHT = 42
TOP_Y = PAGE_H - 62
BOTTOM_Y = 58
CONTENT_W = PAGE_W - M_LEFT - M_RIGHT

INK = Color(0.09, 0.11, 0.15)
GREY = Color(0.42, 0.45, 0.50)
LIGHT = Color(0.62, 0.65, 0.70)
GRID = Color(0.72, 0.74, 0.78)
SOFT = Color(0.93, 0.94, 0.96)
BLUE = Color(0.11, 0.34, 0.58)
GREEN = Color(0.08, 0.42, 0.29)
AMBER = Color(0.62, 0.34, 0.02)
RED = Color(0.62, 0.16, 0.12)
WHITE = Color(1, 1, 1)

FONT = "Helvetica"
FONT_B = "Helvetica-Bold"
FONT_I = "Helvetica-Oblique"

BODY = 9.0
LEAD = 12.4


# ---------------------------------------------------------------- Text-Helfer
def _segments(text):
    """**fett** → Segmente [(text, bold), ...]"""
    out = []
    for i, part in enumerate(str(text).split("**")):
        if part:
            out.append((part, i % 2 == 1))
    return out or [("", False)]


def _wrap(text, font, size, maxw):
    words = str(text).split()
    if not words:
        return [""]
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if stringWidth(cand, font, size) <= maxw or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _plain(text):
    return str(text).replace("**", "")


class NumberedCanvas(canvas.Canvas):
    """Merkt sich Seitenzustände, um 'Seite x von y' und Kopf/Fuß zu zeichnen."""

    def __init__(self, *a, **kw):
        canvas.Canvas.__init__(self, *a, **kw)
        self._saved = []
        self.page_meta = {}      # page_index -> {"head":..., "foot":...}
        self._count = 0

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._count += 1
        self._startPage()

    def save(self):
        total = len(self._saved)
        for i, state in enumerate(self._saved):
            self.__dict__.update(state)
            meta = self.page_meta.get(i, {})
            self._chrome(meta, i + 1, total)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _chrome(self, meta, n, total):
        if meta.get("head"):
            head = meta["head"]
            self.setFillColor(GREY)
            self.setFont(FONT_B, 6.6)
            self.drawString(M_LEFT, PAGE_H - 34, head.upper())
            self.setStrokeColor(GRID)
            self.setLineWidth(0.6)
            self.line(M_LEFT, PAGE_H - 40, PAGE_W - M_RIGHT, PAGE_H - 40)
            if meta.get("marker"):
                self.setFont(FONT, 6.6)
                self.drawRightString(PAGE_W - M_RIGHT, PAGE_H - 34, meta["marker"])
        foot_left = meta.get("foot", "")
        self.setFillColor(GREY)
        self.setFont(FONT, 6.4)
        self.drawString(M_LEFT, 34, foot_left[:118])
        self.drawRightString(PAGE_W - M_RIGHT, 34, f"Seite {n} von {total}")
        self.setStrokeColor(GRID)
        self.line(M_LEFT, 46, PAGE_W - M_RIGHT, 46)


# ------------------------------------------------------------------- Builder
class Builder:
    def __init__(self, path, marker="Stand 10/2026", footer="Kein Rechtsrat – Angaben vor Abgabe prüfen."):
        self.path = path
        self.marker = marker
        self.default_footer = footer
        self.c = NumberedCanvas(path, pagesize=A4)
        self.c.setTitle("Formblätter Verkostung Berlin")
        self.c.setAuthor("KneipenCheck / Formularpaket Gewerbe Berlin")
        self.c.setSubject("Formblätter für Selbständige mit Verkaufs- und Verkostungsaufträgen in Berlin")
        self.doc = None
        self.field_no = 0
        self._start_page()

    # -- Seiten ------------------------------------------------------------
    def _start_page(self):
        self.y = TOP_Y
        idx = self.c._count
        self.c.page_meta.setdefault(idx, {"head": self.doc or "", "foot": self.default_footer,
                                          "marker": self.marker})

    def new_page(self):
        self.c.showPage()
        self._start_page()

    def ensure(self, h):
        if self.y - h < BOTTOM_Y:
            self.new_page()

    def begin(self, doc_key, title, subtitle=None, intro=None, foot=None, boxes=False):
        self.box_fields = boxes
        if self.doc is not None:
            self.new_page()
        self.doc = doc_key
        self.c.page_meta[self.c._count] = {
            "head": doc_key,
            "foot": foot or self.default_footer,
            "marker": self.marker,
        }
        self._doc_title = title
        self.y -= 6
        self._inline(title, 17, 21, FONT_B, INK)
        if subtitle:
            self.y -= 1
            self._inline(subtitle, 9.6, 13, FONT_I, GREY)
        self.y -= 4
        self.rule(self.y + 4)
        self.y -= 8
        if intro:
            for b in intro:
                self.block(b)
        return self

    # -- Primitive ---------------------------------------------------------
    def rule(self, y=None, color=GRID, w=0.7):
        y = self.y if y is None else y
        self.c.setStrokeColor(color)
        self.c.setLineWidth(w)
        self.c.line(M_LEFT, y, PAGE_W - M_RIGHT, y)

    def _inline(self, text, size, lead, font, color, x=M_LEFT, maxw=None):
        """Absatz mit **fett**-Segmenten; setzt y auf die nächste Zeile."""
        maxw = maxw or CONTENT_W
        lines = []          # list of list of (txt, font, w)
        cur = []
        curw = 0.0
        space = stringWidth(" ", font, size)
        for txt, bold in _segments(text):
            f = FONT_B if bold else font
            for j, word in enumerate(txt.split(" ")):
                w = stringWidth(word, f, size)
                if cur and curw + space + w > maxw:
                    lines.append(cur)
                    cur, curw = [], 0.0
                if cur:
                    cur.append((" ", font, space))
                    curw += space
                cur.append((word, f, w))
                curw += w
            # Leerzeichen am Segmentende bleiben erhalten
        if cur:
            lines.append(cur)
        self.c.setFillColor(color)
        for ln in lines:
            cx = x
            for txt, f, w in ln:
                self.c.setFont(f, size)
                self.c.drawString(cx, self.y, txt)
                cx += w
            self.y -= lead
        return self

    def p(self, text, size=BODY, lead=None, color=INK, indent=0):
        lead = lead or (size * 1.42)
        for para in str(text).split("\n"):
            self.ensure(lead)
            self._inline(para, size, lead, FONT, color, x=M_LEFT + indent,
                         maxw=CONTENT_W - indent)
            self.y -= 2.5
        self.y -= 3

    def title(self, text):
        self.ensure(30)
        self._inline(text, 15, 19, FONT_B, INK)
        self.y -= 4

    def h(self, text):
        self.ensure(74)
        self.y -= 11
        self._inline(text, 11.2, 14, FONT_B, BLUE)
        self.y -= 1
        self.rule(self.y + 1, color=Color(0.80, 0.84, 0.90), w=0.6)
        self.y -= 7

    def h2(self, text):
        self.ensure(24)
        self.y -= 2
        self._inline(text, 9.6, 12.5, FONT_B, INK)
        self.y -= 3

    def bullets(self, items, marker="•", size=BODY):
        for it in items:
            self.ensure(LEAD)
            self.c.setFillColor(BLUE)
            self.c.setFont(FONT_B, size)
            self.c.drawString(M_LEFT + 2, self.y, marker)
            self._inline(it, size, size * 1.4, FONT, INK, x=M_LEFT + 14,
                         maxw=CONTENT_W - 14)
            self.y -= 1.5
        self.y -= 3

    def numbered(self, items, size=BODY):
        for i, it in enumerate(items, 1):
            self.ensure(LEAD)
            self.c.setFillColor(BLUE)
            self.c.setFont(FONT_B, size)
            self.c.drawString(M_LEFT + 1, self.y, f"{i}.")
            self._inline(it, size, size * 1.4, FONT, INK, x=M_LEFT + 15,
                         maxw=CONTENT_W - 15)
            self.y -= 1.5
        self.y -= 3

    def hint(self, text):
        size = 8.0
        lead = 10.6
        lines = _wrap(_plain(text), FONT_I, size, CONTENT_W - 22)
        h = lead * len(lines) + 8
        self.ensure(h + 4)
        self.c.setFillColor(SOFT)
        self.c.rect(M_LEFT, self.y - h + 6, CONTENT_W, h, stroke=0, fill=1)
        self.c.setFillColor(BLUE)
        self.c.rect(M_LEFT, self.y - h + 6, 2.2, h, stroke=0, fill=1)
        self.c.setFillColor(Color(0.28, 0.32, 0.38))
        yy = self.y - 4
        for ln in lines:
            self.c.setFont(FONT_I, size)
            self.c.drawString(M_LEFT + 11, yy, ln)
            yy -= lead
        self.y -= h + 6

    def box(self, spec):
        tone = spec.get("tone", "info")
        color = {"info": BLUE, "warn": RED, "ok": GREEN, "amber": AMBER}.get(tone, BLUE)
        fill = {"warn": Color(0.99, 0.95, 0.94), "ok": Color(0.94, 0.98, 0.95),
                "amber": Color(1.0, 0.97, 0.92)}.get(tone, Color(0.95, 0.97, 1.0))
        head = spec.get("title")
        body = spec.get("lines", [])
        pad = 7
        # Höhe vorab schätzen
        rows = []           # (text, font, size, lead, indent)
        if head:
            rows.append((head, FONT_B, 8.8, 11.5, 0))
        for ln in body:
            if ln.startswith("- "):
                text = ln[2:]
                wrapped = _wrap(_plain(text), FONT, 8.3, CONTENT_W - 2 * pad - 14)
                for i, w in enumerate(wrapped):
                    rows.append((w, FONT, 8.3, 10.7, 10 if i else 4))
            else:
                wrapped = _wrap(_plain(ln), FONT, 8.3, CONTENT_W - 2 * pad - 4)
                for w in wrapped:
                    rows.append((w, FONT, 8.3, 10.7, 0))
        h = sum(r[3] for r in rows) + 2 * pad
        self.ensure(h + 6)
        y0 = self.y - h + 6
        self.c.setFillColor(fill)
        self.c.setStrokeColor(color)
        self.c.setLineWidth(0.7)
        self.c.rect(M_LEFT, y0, CONTENT_W, h, stroke=1, fill=1)
        self.c.setFillColor(color)
        self.c.rect(M_LEFT, y0, 2.6, h, stroke=0, fill=1)
        yy = self.y - pad - 1
        if head:
            self.c.setFillColor(color)
            self.c.setFont(FONT_B, 8.8)
            self.c.drawString(M_LEFT + pad + 3, yy, _plain(head))
            yy -= 11.5
        self.c.setFillColor(Color(0.14, 0.16, 0.20))
        for txt, f, s, lead, ind in rows[len([1]) if False else (1 if head else 0):]:
            self.c.setFont(f, s)
            self.c.drawString(M_LEFT + pad + 3 + ind, yy, txt)
            yy -= lead
        self.y = y0 - 10

    def spacer(self, pts=6):
        self.y -= pts

    def pagebreak(self):
        self.new_page()

    # -- Formularfelder ----------------------------------------------------
    def _field_name(self, name):
        self.field_no += 1
        base = (self.doc or "f").split("·")[0].strip().replace(" ", "_")[:18]
        return name or f"{base}_f{self.field_no}"

    LABEL_SIZE = 6.8
    LABEL_LEAD = 7.7

    @staticmethod
    def _label_lines(label, w, max_lines=3):
        return _wrap(_plain(label), FONT, Builder.LABEL_SIZE, max(w - 2, 24))[:max_lines]

    def field(self, spec, x, w, label_height=None):
        """Zeichnet Label + Feld (Linie oder Kasten) + AcroForm-Feld."""
        label = spec.get("label", "")
        lines = self._label_lines(label, w) if label else []
        lh = label_height if label_height is not None else len(lines) * self.LABEL_LEAD
        if lines:
            self.c.setFillColor(GREY)
            self.c.setFont(FONT, self.LABEL_SIZE)
            yy = self.y - 6.4
            for ln in lines:
                self.c.drawString(x, yy, ln)
                yy -= self.LABEL_LEAD
        top = self.y - lh - 1.2
        fh = spec.get("h", 15)
        line_y = top - fh
        self.c.setStrokeColor(GRID)
        self.c.setLineWidth(0.55)
        if spec.get("box") or getattr(self, "box_fields", False):
            self.c.rect(x, line_y, w, fh, stroke=1, fill=0)
        elif spec.get("type") == "multi" and fh >= 26:
            n = 3 if fh >= 34 else 2
            for i in range(n):
                yy = top - (fh * (i + 1) / n)
                self.c.line(x, yy, x + w, yy)
        else:
            self.c.line(x, line_y, x + w, line_y)
        name = self._field_name(spec.get("name"))
        value = spec.get("value")
        try:
            self.c.acroForm.textfield(
                name=name, tooltip=_plain(label) or name, x=x + 1, y=line_y + 0.6,
                width=w - 2, height=fh - 1.2, fontName=FONT, fontSize=8.6,
                textColor=INK, borderWidth=0, borderColor=None,
                fillColor=None, forceBorder=False,
                fieldFlags="multiline" if spec.get("type") == "multi" else "",
            )
        except Exception:
            pass
        if value:
            # zusätzlich sichtbar drucken (unabhängig von der Feld-Darstellung des Readers)
            self.c.setFillColor(Color(0.12, 0.18, 0.35))
            if spec.get("type") == "multi":
                vlines = _wrap(_plain(value), FONT, 7.9, w - 8)
                yy = top - 7.2
                for ln in vlines:
                    self.c.setFont(FONT, 7.9)
                    self.c.drawString(x + 4, yy, ln)
                    yy -= 9.6
            else:
                txt = _plain(value)
                fs = 8.6
                while fs > 6.0 and stringWidth(txt, FONT, fs) > w - 8:
                    fs -= 0.2
                self.c.setFont(FONT, fs)
                self.c.drawString(x + 4, line_y + fh / 2 - fs * 0.36, txt)
        if spec.get("hint"):
            self.c.setFillColor(LIGHT)
            self.c.setFont(FONT_I, 6.2)
            for i, ln in enumerate(_wrap(_plain(spec["hint"]), FONT_I, 6.2, w)[:2]):
                self.c.drawString(x, line_y - 6.4 - i * 7.2, ln)
            return line_y - 6.4 - (min(2, len(_wrap(_plain(spec["hint"]), FONT_I, 6.2, w))) - 1) * 7.2 - 5
        return line_y - 4

    def row(self, specs, gap=12):
        widths = [s.get("w", 1.0) for s in specs]
        total = sum(widths)
        avail = CONTENT_W - gap * (len(specs) - 1)
        ws = [avail * w / total for w in widths]
        max_lines = max((len(self._label_lines(s.get("label", ""), w)) for s, w in zip(specs, ws)),
                        default=0)
        lh = max_lines * self.LABEL_LEAD
        x = M_LEFT
        ends = []
        for s, w in zip(specs, ws):
            ends.append(self.field(s, x, w, label_height=lh))
            x += w + gap
        self.y = min(ends)

    def checks(self, spec):
        label = spec.get("label")
        options = spec["options"]
        cols = spec.get("cols", 3)
        size = 8.0
        cellw = CONTENT_W / cols
        rows = [options[i:i + cols] for i in range(0, len(options), cols)]
        if label:
            self.ensure(12)
            self.c.setFillColor(GREY)
            self.c.setFont(FONT, self.LABEL_SIZE)
            self.c.drawString(M_LEFT, self.y - 6.4, _plain(label))
            self.y -= self.LABEL_LEAD + 1
        for r in rows:
            wrapped = []
            for opt in r:
                txt = _plain(opt)
                sz = size
                while sz > 6.2 and stringWidth(txt, FONT, sz) > cellw - 14:
                    sz -= 0.2
                lines = _wrap(txt, FONT, sz, cellw - 14) if stringWidth(txt, FONT, sz) > cellw - 14 else [txt]
                wrapped.append((opt, lines, sz))
            h = max(len(w[1]) for w in wrapped) * 8.4 + 5
            self.ensure(h + 2)
            for ci, (opt, lines, sz) in enumerate(wrapped):
                x = M_LEFT + ci * cellw
                by = self.y - 9
                self.c.setStrokeColor(GRID)
                self.c.setLineWidth(0.65)
                self.c.rect(x, by, 8.2, 8.2, stroke=1, fill=0)
                is_checked = False
                marks = spec.get("checked")
                if marks:
                    is_checked = marks[spec["options"].index(opt)] if opt in spec["options"] else False
                try:
                    self.c.acroForm.checkbox(
                        name=self._field_name(spec.get("name")), x=x, y=by,
                        size=8.2, checked=is_checked, buttonStyle="check",
                        borderWidth=0, borderColor=None, fillColor=None,
                        textColor=INK, forceBorder=False)
                except Exception:
                    pass
                if is_checked:
                    self.c.setStrokeColor(INK)
                    self.c.setLineWidth(1.1)
                    self.c.line(x + 1.6, by + 2.0, x + 3.6, by + 6.2)
                    self.c.line(x + 3.6, by + 6.2, x + 6.8, by + 1.4)
                self.c.setFillColor(INK)
                yy = by + 1.6
                for ln in lines[:2]:
                    self.c.setFont(FONT, sz)
                    self.c.drawString(x + 11.5, yy, ln)
                    yy -= sz + 1.2
            self.y -= h
        self.y -= 5

    def table(self, spec):
        headers = spec.get("headers", [])
        widths = spec.get("widths") or [1 / len(headers)] * len(headers)
        rows = spec.get("rows", [])
        empty = spec.get("empty", 0)
        row_h = spec.get("row_h", 15)
        fillable = spec.get("fillable", False)
        size = spec.get("size", 8.0)
        cols = [w / sum(widths) * CONTENT_W for w in widths]

        def head():
            hl = 1
            for i, hd in enumerate(headers):
                hl = max(hl, len(_wrap(_plain(hd), FONT_B, size - 0.3, cols[i] - 6)))
            hh = max(14, hl * (size + 1.2) + 5)
            self.c.setFillColor(Color(0.93, 0.94, 0.96))
            self.c.rect(M_LEFT, self.y - hh, CONTENT_W, hh, stroke=0, fill=1)
            self.c.setStrokeColor(GRID)
            self.c.setLineWidth(0.6)
            self.c.rect(M_LEFT, self.y - hh, CONTENT_W, hh, stroke=1, fill=0)
            x = M_LEFT
            for i, hd in enumerate(headers):
                self.c.setFillColor(Color(0.20, 0.23, 0.28))
                fs = size - 0.3
                word = max(_plain(hd).split(), key=len, default="")
                while fs > 5.4 and stringWidth(word, FONT_B, fs) > cols[i] - 6:
                    fs -= 0.2
                self.c.setFont(FONT_B, fs)
                for j, line in enumerate(_wrap(_plain(hd), FONT_B, fs, cols[i] - 6)):
                    self.c.drawString(x + 3, self.y - 9.5 - j * (fs + 1.4), line)
                if i:
                    self.c.setStrokeColor(GRID)
                    self.c.line(x, self.y - hh, x, self.y)
                x += cols[i]
            self.y -= hh

        def data_row(cells, height, zebra=False):
            if zebra:
                self.c.setFillColor(Color(0.975, 0.978, 0.985))
                self.c.rect(M_LEFT, self.y - height, CONTENT_W, height, stroke=0, fill=1)
            self.c.setStrokeColor(GRID)
            self.c.setLineWidth(0.45)
            self.c.rect(M_LEFT, self.y - height, CONTENT_W, height, stroke=1, fill=0)
            x = M_LEFT
            for i, cell in enumerate(cells):
                if i:
                    self.c.line(x, self.y - height, x, self.y)
                if cell:
                    wrapped = _wrap(_plain(str(cell)), FONT, size, cols[i] - 6)
                    yy = self.y - size - 3.4
                    for line in wrapped[:8]:
                        self.c.setFillColor(INK)
                        self.c.setFont(FONT, size)
                        self.c.drawString(x + 3, yy, line)
                        yy -= size + 1.6
                    if fillable and not str(cell or "").strip():
                        try:
                            self.c.acroForm.textfield(
                                name=self._field_name(None), x=x + 1, y=self.y - height + 1,
                                width=cols[i] - 2, height=height - 2,
                                fontName=FONT, fontSize=size, borderWidth=0,
                                fillColor=None, borderColor=None, textColor=INK,
                                forceBorder=False,
                            )
                        except Exception:
                            pass
                x += cols[i]
            self.y -= height

        self.ensure(row_h * 3)
        head()
        for i, r in enumerate(rows):
            h = row_h
            wrapped_max = max(
                (len(_wrap(_plain(str(c)), FONT, size, cols[i] - 6)) for i, c in enumerate(r)),
                default=1)
            h = max(row_h, wrapped_max * (size + 1.6) + 4)
            if self.y - h < BOTTOM_Y:
                self.new_page()
                head()
            data_row(r, h, zebra=i % 2 == 1)
        for _ in range(empty):
            if self.y - row_h < BOTTOM_Y:
                self.new_page()
                head()
            data_row([""] * len(headers), row_h, zebra=fillable)
        self.y -= 7


    def checktable(self, spec):
        """Tabelle: erste Spalte Text, weitere Spalten Ankreuzfelder oder Schreibfelder."""
        headers = spec["headers"]
        widths = spec.get("widths") or [1 / len(headers)] * len(headers)
        rows = spec.get("rows", [])
        row_h = spec.get("row_h", 16)
        size = spec.get("size", 8.0)
        boxes = spec.get("checkbox_cols", [])       # Spalten mit Kästchen
        cols = [w / sum(widths) * CONTENT_W for w in widths]

        def draw_head():
            self.c.setFillColor(Color(0.93, 0.94, 0.96))
            self.c.rect(M_LEFT, self.y - 14, CONTENT_W, 14, stroke=0, fill=1)
            self.c.setStrokeColor(GRID)
            self.c.setLineWidth(0.6)
            self.c.rect(M_LEFT, self.y - 14, CONTENT_W, 14, stroke=1, fill=0)
            x = M_LEFT
            for i, hd in enumerate(headers):
                self.c.setFillColor(Color(0.20, 0.23, 0.28))
                self.c.setFont(FONT_B, size - 0.3)
                self.c.drawString(x + 3, self.y - 9.5, _plain(hd))
                if i:
                    self.c.setStrokeColor(GRID)
                    self.c.line(x, self.y - 14, x, self.y)
                x += cols[i]
            self.y -= 14

        def draw_row(label, height):
            self.c.setStrokeColor(GRID)
            self.c.setLineWidth(0.45)
            self.c.rect(M_LEFT, self.y - height, CONTENT_W, height, stroke=1, fill=0)
            x = M_LEFT
            for i in range(len(headers)):
                if i:
                    self.c.line(x, self.y - height, x, self.y)
                if i == 0:
                    wrapped = _wrap(_plain(label), FONT, size, cols[0] - 6)
                    yy = self.y - size - 3.2
                    for line in wrapped[:6]:
                        self.c.setFillColor(INK)
                        self.c.setFont(FONT, size)
                        self.c.drawString(x + 3, yy, line)
                        yy -= size + 1.4
                elif i in boxes:
                    s = 8.0
                    bx = x + (cols[i] - s) / 2
                    by = self.y - height / 2 - s / 2
                    self.c.setStrokeColor(GRID)
                    self.c.setLineWidth(0.65)
                    self.c.rect(bx, by, s, s, stroke=1, fill=0)
                    try:
                        self.c.acroForm.checkbox(
                            name=self._field_name(None), x=bx, y=by, size=s,
                            checked=False, buttonStyle="check", borderWidth=0,
                            borderColor=None, fillColor=None, textColor=INK,
                            forceBorder=False)
                    except Exception:
                        pass
                else:
                    try:
                        self.c.acroForm.textfield(
                            name=self._field_name(None), x=x + 2, y=self.y - height + 1.5,
                            width=cols[i] - 4, height=height - 3, fontName=FONT,
                            fontSize=size, borderWidth=0, fillColor=None,
                            borderColor=None, textColor=INK, forceBorder=False)
                    except Exception:
                        pass
                x += cols[i]
            self.y -= height

        self.ensure(row_h * 4)
        draw_head()
        for label in rows:
            h = max(row_h, len(_wrap(_plain(label), FONT, size, cols[0] - 6)) * (size + 1.4) + 6)
            if self.y - h < BOTTOM_Y:
                self.new_page()
                draw_head()
            draw_row(label, h)
        self.y -= 10

    def signature(self, spec=None):
        spec = spec or {}
        left = spec.get("left", "Ort, Datum")
        right = spec.get("right", "Unterschrift / Stempel")
        self.ensure(46)
        self.y -= 12
        y = self.y
        half = CONTENT_W / 2 - 12
        for x, label in ((M_LEFT, left), (M_LEFT + CONTENT_W / 2 + 12, right)):
            self.c.setStrokeColor(GRID)
            self.c.setLineWidth(0.7)
            self.c.line(x, y, x + half, y)
            self.c.setFillColor(GREY)
            self.c.setFont(FONT, 7.2)
            self.c.drawString(x, y - 9, label)
        self.y = y - 24

    # -- Dokument rendern --------------------------------------------------
    def render(self, docs):
        for d in docs:
            self.begin(d["key"], d["title"], d.get("subtitle"),
                       d.get("intro"), d.get("foot"), boxes=d.get("boxes", False))
            for b in d["blocks"]:
                if b[0] == "title":
                    self.title(b[1])
                elif b[0] == "h":
                    self.h(b[1])
                elif b[0] == "h2":
                    self.h2(b[1])
                elif b[0] == "p":
                    self.p(b[1])
                elif b[0] == "bullets":
                    self.bullets(b[1])
                elif b[0] == "numbered":
                    self.numbered(b[1])
                elif b[0] == "hint":
                    self.hint(b[1])
                elif b[0] == "box":
                    self.box(b[1])
                elif b[0] == "label":
                    self.ensure(16)
                    self.c.setFillColor(GREY)
                    self.c.setFont(FONT_B, 7.4)
                    self.c.drawString(M_LEFT, self.y - 7, b[1].upper())
                    self.y -= 9
                elif b[0] == "field":
                    self.ensure(26)
                    self.y = self.field(b[1], M_LEFT, CONTENT_W)
                    self.y -= 7
                elif b[0] == "row":
                    self.ensure(26)
                    self.row(b[1])
                    self.y -= 7
                elif b[0] == "checks":
                    self.checks(b[1])
                elif b[0] == "table":
                    self.table(b[1])
                elif b[0] == "checktable":
                    self.checktable(b[1])
                elif b[0] == "signature":
                    self.signature(b[1] if len(b) > 1 else None)
                elif b[0] == "spacer":
                    self.spacer(b[1])
                elif b[0] == "pagebreak":
                    self.pagebreak()
                else:
                    raise ValueError(f"Unbekannter Block: {b[0]}")
        self.c.showPage()          # letzte Seite erfassen, sonst geht sie verloren
        self.c.save()
        return len(self.c._saved)

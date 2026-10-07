/* ==========================================================================
   pdf-lite.js – winziger PDF-Erzeuger ohne Bibliothek
   Läuft im Browser UND in Node (dieselbe Datei, keine Abhängigkeiten).
   Reicht für saubere, textbasierte Berichte: Überschriften, Tabellen,
   Kopf-/Fußzeilen. Deutsche Umlaute laufen über WinAnsiEncoding korrekt.
   ========================================================================== */

const PAGE_W = 595.28;   // A4 in Punkten (72 dpi)
const PAGE_H = 841.89;
export const MARGIN = 48;

const WINANSI_EXTRA = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '“': 0x93, '”': 0x94, '–': 0x96, '—': 0x97,
  '•': 0x95, '…': 0x85, '‰': 0x89, '‹': 0x8b, '›': 0x9b, '™': 0x99,
  '´': 0xb4, '¨': 0xa8, '°': 0xb0, '§': 0xa7, '²': 0xb2, '³': 0xb3, '·': 0xb7,
};

/** Text für PDF-Inhaltsströme maskieren (Klammern, Backslash, Sonderzeichen). */
export function pdfEscape(str) {
  let out = '';
  for (const ch of String(str ?? '')) {
    const code = ch.codePointAt(0);
    let byte;
    if (code === 10 || code === 13 || code === 9) byte = 32;
    else if (code < 128) byte = code;
    else if (WINANSI_EXTRA[ch] !== undefined) byte = WINANSI_EXTRA[ch];
    else if (code <= 255) byte = code;
    else byte = 0x3f;                                  // unbekannt → „?“
    const c = String.fromCharCode(byte);
    if (c === '(' || c === ')' || c === '\\') out += '\\' + c;
    else if (byte < 32 || byte > 126) out += '\\' + byte.toString(8).padStart(3, '0');
    else out += c;
  }
  return out;
}

/** String → Bytes (Latin-1, wie PDF sie im Inhaltsstrom erwartet). */
function latin1Bytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

/** Effizientes Zusammensetzen vieler Byte-Blöcke. */
class ByteWriter {
  constructor() { this.chunks = []; this.length = 0; }
  push(u8) { this.chunks.push(u8); this.length += u8.length; }
  pushText(str) { this.push(latin1Bytes(str)); }
  concat() {
    const out = new Uint8Array(this.length);
    let o = 0;
    for (const c of this.chunks) { out.set(c, o); o += c.length; }
    return out;
  }
}

export class Pdf {
  constructor(title = 'KneipenCheck Bericht') {
    this.pages = [];
    this.title = title;
    this.author = 'KneipenCheck';
    this.newPage();
  }

  newPage() {
    this.pages.push([]);
    this.cur = this.pages.at(-1);
    this.y = PAGE_H - MARGIN;
    this.x = MARGIN;
    return this;
  }

  get pageCount() { return this.pages.length; }
  get contentWidth() { return PAGE_W - 2 * MARGIN; }
  get bottom() { return MARGIN + 36; }

  /** Neue Seite, wenn der Platz nicht reicht. */
  ensure(space) {
    if (this.y - space < this.bottom) { this.newPage(); return true; }
    return false;
  }

  textAt(str, x, y, { size = 10, font = 'F1', color = [0, 0, 0] } = {}) {
    const [r, g, b] = color;
    this.cur.push(`BT /${font} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(str)}) Tj ET`);
    return this;
  }

  text(str, { size = 10, font = 'F1', color = [0, 0, 0], x = this.x, dy = 0 } = {}) {
    this.textAt(str, x, this.y, { size, font, color });
    this.y -= dy;
    return this;
  }

  line(y = this.y, { x1 = MARGIN, x2 = PAGE_W - MARGIN, color = [0.6, 0.6, 0.6], w = 0.6 } = {}) {
    const [r, g, b] = color;
    this.cur.push(`${r} ${g} ${b} RG ${w} w ${x1} ${y.toFixed(2)} m ${x2} ${y.toFixed(2)} l S`);
    return this;
  }

  rect(x, y, w, h, { fill = null, stroke = null, lw = 0.7 } = {}) {
    if (fill) { const [r, g, b] = fill; this.cur.push(`${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f`); }
    if (stroke) { const [r, g, b] = stroke; this.cur.push(`${r} ${g} ${b} RG ${lw} w ${x} ${y} ${w} ${h} re S`); }
    return this;
  }

  build() {
    const objects = [];
    const pageObjNums = [];
    const contentObjNums = [];
    let n = 3;
    for (let i = 0; i < this.pages.length; i++) { pageObjNums.push(n++); contentObjNums.push(n++); }
    const fontRegular = n++;
    const fontBold = n++;

    objects.push(null);                                  // 0 = Platzhalter
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push(`<< /Type /Pages /Kids [${pageObjNums.map((p) => `${p} 0 R`).join(' ')}] /Count ${pageObjNums.length} >>`);

    for (let i = 0; i < this.pages.length; i++) {
      const bytes = latin1Bytes(this.pages[i].join('\n'));
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
        `/Contents ${contentObjNums[i]} 0 R >>`
      );
      objects.push({ stream: bytes });
    }
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const w = new ByteWriter();
    let offset = 0;
    const put = (text) => { const b = latin1Bytes(text); w.push(b); offset += b.length; };
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const xref = [];
    for (let i = 1; i < objects.length; i++) {
      xref.push(offset);
      const obj = objects[i];
      put(`${i} 0 obj\n`);
      if (obj && typeof obj === 'object' && obj.stream) {
        put(`<< /Length ${obj.stream.length} >>\nstream\n`);
        w.push(obj.stream); offset += obj.stream.length;
        put('\nendstream\n');
      } else {
        put(obj + '\n');
      }
      put('endobj\n');
    }
    const xrefStart = offset;
    let x = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (const off of xref) x += String(off).padStart(10, '0') + ' 00000 n \n';
    put(x);
    put(`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info << /Title (${pdfEscape(this.title)}) /Producer (KneipenCheck) /Author (${pdfEscape(this.author)}) >> >>\nstartxref\n${xrefStart}\n%%EOF`);
    return w.concat();
  }
}

/* ---------- Tabellen- und Texthelfer ------------------------------------ */

export function wrapText(text, maxChars) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const candidate = cur ? cur + ' ' + word : word;
    if (candidate.length <= maxChars || !cur) cur = candidate;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/** Schätzung der Textbreite in Punkten (Helvetica ~0,5 em pro Zeichen). */
export const textWidth = (str, size) => String(str ?? '').length * size * 0.5;

/**
 * Tabelle mit automatischem Seitenumbruch und wiederholter Kopfzeile.
 * columns: [{ key, label, w (0..1), align: 'left'|'right' }]
 */
export function table(pdf, { columns, rows, size = 8.5, rowHeight = 15, headFill = [0.95, 0.95, 0.93] }) {
  const total = pdf.contentWidth;
  const widths = columns.map((c) => c.w * total);

  const drawHead = () => {
    pdf.rect(MARGIN, pdf.y - rowHeight + 4, total, rowHeight, { fill: headFill });
    let x = MARGIN + 3;
    columns.forEach((c, i) => {
      const label = String(c.label);
      const tx = c.align === 'right' ? x + widths[i] - 6 - textWidth(label, size - 0.5) : x;
      pdf.textAt(label, tx, pdf.y - rowHeight + 9, { size: size - 0.5, font: 'F2' });
      x += widths[i];
    });
    pdf.y -= rowHeight;
  };

  pdf.ensure(rowHeight * 3);
  drawHead();

  for (const row of rows) {
    const cells = columns.map((c, i) =>
      wrapText(row[c.key] ?? '', Math.max(6, Math.floor(widths[i] / (size * 0.5)))));
    const lines = Math.max(...cells.map((c) => c.length));
    const h = Math.max(rowHeight, lines * (size + 2.2) + 4);
    if (pdf.ensure(h + 2)) drawHead();
    let x = MARGIN + 3;
    columns.forEach((c, i) => {
      let yy = pdf.y - size - 1;
      for (const lineTxt of cells[i]) {
        const tx = c.align === 'right' ? x + widths[i] - 6 - textWidth(lineTxt, size) : x;
        pdf.textAt(lineTxt, tx, yy, { size });
        yy -= size + 2;
      }
      x += widths[i];
    });
    pdf.y -= h;
    pdf.line(pdf.y + 2, { color: [0.87, 0.87, 0.87], w: 0.4 });
  }
  return pdf;
}

export const COLORS = {
  ink: [0.06, 0.09, 0.16],
  grey: [0.42, 0.45, 0.5],
  red: [0.71, 0.14, 0.09],
  green: [0.02, 0.46, 0.28],
  amber: [0.71, 0.28, 0.03],
  yellowFill: [1, 0.78, 0.25],
  paper: [0.98, 0.98, 0.96],
};

export { PAGE_H, PAGE_W };

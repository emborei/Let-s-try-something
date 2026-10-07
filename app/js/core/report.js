/* ==========================================================================
   report.js – Berichte als PDF (Monat, Tag, offene Kontrollen)
   Dieselbe Datei läuft im Browser (Ein-Klick-Export, auch offline) und auf
   dem Server (automatische Monatsberichte). Liefert Uint8Array.
   ========================================================================== */

import { Pdf, table, COLORS, MARGIN, textWidth } from './pdf-lite.js';
import { dueTasks, dayOverview, rangeStats, slotsForTask } from './logic.js';
import { fmtTemp, fmtDate, dayKey } from './util.js';
import { KIND_LABEL } from './model.js';

export { KIND_LABEL };
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function deDate(key) {
  const [y, m, d] = String(key).split('-');
  return `${Number(d)}. ${MONTHS[Number(m) - 1]} ${y}`;
}
export function deMonth(key) {
  const [y, m] = String(key).split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}
const p2 = (n) => String(n).padStart(2, '0');
const hhmm = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const dm = (ts) => { const d = new Date(ts); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`; };

/* ---------- Bausteine ---------------------------------------------------- */

function stampBlock(pdf, lines) {
  pdf.y -= 6;
  for (const line of lines) {
    pdf.ensure(12);
    pdf.textAt(line, MARGIN, pdf.y, { size: 8.3, color: line.startsWith('ACHTUNG') ? COLORS.red : COLORS.ink });
    pdf.y -= 11.5;
  }
}

function footer(pdf, leftText) {
  const total = pdf.pageCount;
  for (let i = 0; i < total; i++) {
    pdf.pages[i].push(`q 0.96 0.96 0.94 rg 0 ${pdf.bottom - 36} 595.28 36 re f Q`);
    pdf.pages[i].push(`BT /F1 7 Tf 0.42 0.45 0.5 rg 1 0 0 1 48 ${pdf.bottom - 21} Tm (${esc(leftText)}) Tj ET`);
    pdf.pages[i].push(`BT /F1 7 Tf 0.42 0.45 0.5 rg 1 0 0 1 470 ${pdf.bottom - 21} Tm (Seite ${i + 1} von ${total}) Tj ET`);
  }
}

function esc(s) {
  return String(s ?? '').replace(/([()\\])/g, '\\$1').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
}

/* ---------- 1) Monatsbericht (das Hauptdokument) ------------------------- */

/**
 * @param {object} o
 * @param {object[]} o.entries  alle Einträge
 * @param {object[]} o.tasks    Stammdaten
 * @param {object}   o.business Betriebsdaten
 * @param {object}   o.settings Einstellungen (Schichten, Aufbewahrung)
 * @param {string}   o.fromKey  „2026-09-01“
 * @param {string}   o.toKey    „2026-09-30“
 * @param {string}   o.generatedBy
 * @param {object}   o.integrity { chainOk, chainHead, checkedCount, serverTime, note }
 */
export function buildMonthlyReport(o) {
  const {
    entries = [], tasks = [], settings = {},
    fromKey, toKey, generatedBy = 'Betrieb', integrity = {},
  } = o;
  // Betriebsdaten: direkt übergeben oder aus den Einstellungen – nie „–“ anzeigen,
  // wenn der Name vorhanden ist.
  const business = (o.business && Object.keys(o.business).length) ? o.business : (settings.business || {});

  const stats = rangeStats({ tasks, entries, settings, fromKey, toKey });
  const pdf = new Pdf(`Hygienenachweis ${business.name || ''} ${fromKey.slice(0, 7)}`);
  pdf.author = business.name || 'KneipenCheck';

  const full = pdf.contentWidth;
  const monthLabel = fromKey.slice(0, 7) === toKey.slice(0, 7)
    ? deMonth(fromKey)
    : `${deDate(fromKey)} – ${deDate(toKey)}`;
  const now = Date.now();

  /* Kopfzeile */
  pdf.textAt('Nachweis der täglichen Hygienekontrollen', MARGIN, 802, { size: 17, font: 'F2' });
  pdf.textAt(monthLabel, MARGIN, 784, { size: 11.5, color: COLORS.grey });
  pdf.line(772, { color: COLORS.ink, w: 1.4 });
  pdf.y = 752;

  /* Betrieb */
  const rows = [
    ['Betrieb', business.name || '–'],
    ['Anschrift', [business.street, business.city].filter(Boolean).join(', ') || '–'],
    ['Verantwortlich', business.owner || '–'],
    ['Zeitraum', `${deDate(fromKey)} bis ${deDate(toKey)} · ${stats.days} Tage`],
    ['Erstellt von', generatedBy],
    ['Erstellt am', `${fmtDate(now)}, ${hhmm(now)} Uhr`],
    ['Aufbewahrung', `mindestens ${settings?.compliance?.retentionMonths || 24} Monate (VO (EG) 852/2004, § 4 LMHV)`],
  ];
  for (const [k, v] of rows) {
    pdf.textAt(k, MARGIN, pdf.y, { size: 9, font: 'F2' });
    pdf.textAt(String(v), MARGIN + 105, pdf.y, { size: 9 });
    pdf.y -= 13.5;
  }
  pdf.y -= 12;

  /* Kennzahlen-Kasten */
  pdf.ensure(120);
  const boxTop = pdf.y;
  pdf.rect(MARGIN, boxTop - 72, full, 74, { fill: COLORS.paper, stroke: [0.78, 0.78, 0.76] });
  const cells = [
    ['Geplante Kontrollen', String(stats.planned)],
    ['Durchgeführt', String(stats.done)],
    ['Erfüllungsquote', `${stats.quote} %`],
    ['Abweichungen', String(stats.deviations)],
    ['Tage ohne Eintrag', String(stats.missedDays.length)],
  ];
  let cx = MARGIN + 14;
  for (const [label, val] of cells) {
    pdf.textAt(label, cx, boxTop - 24, { size: 7.4, color: COLORS.grey });
    pdf.textAt(val, cx, boxTop - 50, { size: 19, font: 'F2' });
    cx += full / cells.length;
  }
  pdf.y = boxTop - 88;

  if (stats.deviations > 0) {
    pdf.textAt(`Bei ${stats.deviations} Kontrolle(n) lag ein Messwert außerhalb des Sollbereichs. Die Maßnahmen stehen in Abschnitt 2.`, MARGIN, pdf.y, { size: 8.5, color: COLORS.amber });
    pdf.y -= 14;
  }
  if (stats.missedDays.length > 0) {
    pdf.textAt(`An ${stats.missedDays.length} Tag(en) fehlen einzelne Kontrollen – aufgeführt in Abschnitt 3.`, MARGIN, pdf.y, { size: 8.5, color: COLORS.red });
    pdf.y -= 14;
  }

  /* 1) Übersicht */
  pdf.ensure(80);
  pdf.textAt('1. Kontrollen im Überblick', MARGIN, pdf.y, { size: 12, font: 'F2' });
  pdf.y -= 17;
  table(pdf, {
    columns: [
      { key: 'title', label: 'Kontrolle', w: 0.34 },
      { key: 'kind', label: 'Art', w: 0.13 },
      { key: 'soll', label: 'Sollbereich / Rhythmus', w: 0.2 },
      { key: 'planned', label: 'geplant', w: 0.1, align: 'right' },
      { key: 'done', label: 'erledigt', w: 0.11, align: 'right' },
      { key: 'dev', label: 'Abweich.', w: 0.12, align: 'right' },
    ],
    rows: stats.perTask.map((r) => ({
      title: r.task.title,
      kind: KIND_LABEL[r.task.kind] || r.task.kind,
      soll: r.task.kind === 'temp' && r.task.min !== null
        ? `${fmtTemp(r.task.min)} bis ${fmtTemp(r.task.max)} °C`
        : (r.task.everyDays > 1 ? `alle ${r.task.everyDays} Tage` : 'täglich'),
      planned: r.planned, done: r.done, dev: r.deviations,
    })),
  });
  pdf.y -= 16;

  /* 2) Abweichungen */
  const deviations = stats.allEntries.filter((e) => e.ok === false);
  pdf.ensure(80);
  pdf.textAt('2. Abweichungen und ergriffene Maßnahmen', MARGIN, pdf.y, { size: 12, font: 'F2' });
  pdf.y -= 17;
  if (!deviations.length) {
    pdf.textAt('Im Berichtszeitraum wurden keine Grenzwertüberschreitungen festgestellt.', MARGIN, pdf.y - 4, { size: 9, color: COLORS.green });
    pdf.y -= 24;
  } else {
    table(pdf, {
      columns: [
        { key: 'datum', label: 'Datum', w: 0.09 },
        { key: 'zeit', label: 'Zeit', w: 0.08 },
        { key: 'was', label: 'Kontrolle', w: 0.2 },
        { key: 'wert', label: 'Messwert', w: 0.13 },
        { key: 'massnahme', label: 'Maßnahme / Bemerkung', w: 0.34 },
        { key: 'wer', label: 'Person', w: 0.16 },
      ],
      rows: deviations.map((e) => ({
        datum: dm(e.tsClient), zeit: hhmm(e.tsClient), was: e.taskTitle,
        wert: `${fmtTemp(e.value)} ${e.unit || '°C'}`,
        massnahme: [e.corrective?.actions?.join('; '), e.note, e.corrective?.note].filter(Boolean).join(' | ') || '(keine Maßnahme notiert)',
        wer: e.userName,
      })),
    });
  }
  pdf.y -= 16;

  /* 3) Lücken */
  pdf.ensure(80);
  pdf.textAt('3. Fehlende Einträge', MARGIN, pdf.y, { size: 12, font: 'F2' });
  pdf.y -= 17;
  if (!stats.missedDays.length) {
    pdf.textAt('Alle geplanten Kontrollen wurden durchgeführt – keine Lücken im Zeitraum.', MARGIN, pdf.y - 4, { size: 9, color: COLORS.green });
    pdf.y -= 24;
  } else {
    pdf.textAt('Diese Kontrollen fehlen (bewusst ausgewiesen, statt zu beschönigen):', MARGIN, pdf.y - 4, { size: 8.5, color: COLORS.grey });
    pdf.y -= 16;
    for (const d of stats.missedDays) {
      pdf.ensure(12);
      pdf.textAt(`${deDate(d.key)} – ${d.count} Kontrolle(n) nicht eingetragen`, MARGIN + 8, pdf.y, { size: 8.8 });
      pdf.y -= 11.5;
    }
    pdf.y -= 8;
  }

  /* 4) Protokoll */
  pdf.ensure(80);
  pdf.textAt('4. Einzelne Kontrollen (vollständiges Protokoll)', MARGIN, pdf.y, { size: 12, font: 'F2' });
  pdf.y -= 17;
  table(pdf, {
    columns: [
      { key: 'datum', label: 'Datum', w: 0.1 },
      { key: 'zeit', label: 'Zeit', w: 0.07 },
      { key: 'was', label: 'Kontrolle', w: 0.26 },
      { key: 'wert', label: 'Messwert / Ergebnis', w: 0.19 },
      { key: 'ergebnis', label: 'Bewertung', w: 0.14 },
      { key: 'wer', label: 'Person', w: 0.24 },
    ],
    rows: stats.allEntries
      .slice()
      .sort((a, b) => a.tsClient - b.tsClient)
      .map((e) => ({
        datum: dm(e.tsClient) + (new Date(e.tsClient).getFullYear() !== new Date().getFullYear() ? String(new Date(e.tsClient).getFullYear()).slice(2) : ''),
        zeit: hhmm(e.tsClient),
        was: e.taskTitle + (e.action === 'correct' ? ' (Korrektur)' : ''),
        wert: e.kind === 'temp' && e.value !== null ? `${fmtTemp(e.value)} ${e.unit || '°C'}`
          : e.kind === 'goods' && e.goods ? `${e.goods.supplier || 'Ware'}${e.goods.temp !== null && e.goods.temp !== undefined ? ' · ' + fmtTemp(e.goods.temp) + ' °C' : ''}`
            : 'durchgeführt',
        ergebnis: e.ok === false ? 'Abweichung' : 'in Ordnung',
        wer: e.userName,
      })),
  });

  /* 5) Revisionssicherheit */
  pdf.y -= 18;
  pdf.ensure(150);
  pdf.textAt('5. Hinweis zur Revisionssicherheit', MARGIN, pdf.y, { size: 12, font: 'F2' });
  pdf.y -= 16;
  stampBlock(pdf, [
    'Jeder Eintrag enthält Datum, Uhrzeit, messende Person, Messwert und Bewertung.',
    'Die Uhrzeit stammt aus einer geprüften Zeitquelle (Server), nicht aus der Geräteuhr.',
    'Alle Einträge sind über eine kryptografische Hash-Kette (SHA-256) verknüpft:',
    'nachträgliche Änderungen sind erkennbar, Korrekturen werden als eigener',
    'Eintrag mit Begründung dokumentiert – der ursprüngliche Wert bleibt erhalten.',
    '',
    `Hash-Kette beim Export: ${integrity.chainOk === false ? 'ACHTUNG – Prüfung fehlgeschlagen' : 'unversehrt (' + (integrity.checkedCount ?? stats.allEntries.length) + ' Einträge geprüft)'}`,
    `Kopf der Kette: ${String(integrity.chainHead || '–').slice(0, 56)}`,
    `Zeitquelle: ${integrity.note || 'Serverzeit'}${integrity.serverTime ? ' · ' + new Date(integrity.serverTime).toLocaleString('de-DE') : ''}`,
    `Bericht erzeugt: ${fmtDate(now)}, ${hhmm(now)} Uhr`,
  ]);

  pdf.y -= 22;
  pdf.ensure(56);
  pdf.textAt('Ort, Datum, Unterschrift der verantwortlichen Person', MARGIN, pdf.y, { size: 8.5, color: COLORS.grey });
  pdf.y -= 32;
  pdf.line(pdf.y, { x1: MARGIN, x2: MARGIN + 250, color: [0.2, 0.2, 0.2], w: 0.9 });

  footer(pdf, `${business.name || 'KneipenCheck'} · Hygienenachweis ${monthLabel} · erzeugt am ${fmtDate(now)}`);
  return { bytes: pdf.build(), stats, fileName: `Hygienenachweis-${business.name ? business.name.replace(/[^\w]+/g, '-') + '-' : ''}${fromKey.slice(0, 7)}.pdf` };
}

/* ---------- 2) Tagesnachweis -------------------------------------------- */

export function buildDailyReport({ entries = [], business = {}, settings = {}, key = dayKey(), generatedBy = 'Betrieb', integrity = {} }) {
  if (!business?.name && settings?.business) business = settings.business;
  const pdf = new Pdf(`Tagesnachweis ${key}`);
  const day = entries.filter((e) => e.dayKey === key).sort((a, b) => a.tsClient - b.tsClient);
  pdf.textAt('Tagesnachweis Hygienekontrollen', MARGIN, 800, { size: 16, font: 'F2' });
  pdf.textAt(`${business.name || ''} · ${deDate(key)}`, MARGIN, 781, { size: 11, color: COLORS.grey });
  pdf.line(768, { color: COLORS.ink, w: 1.2 });
  pdf.y = 742;
  table(pdf, {
    columns: [
      { key: 'zeit', label: 'Zeit', w: 0.1 },
      { key: 'was', label: 'Kontrolle', w: 0.3 },
      { key: 'wert', label: 'Wert / Ergebnis', w: 0.22 },
      { key: 'ergebnis', label: 'Bewertung', w: 0.15 },
      { key: 'wer', label: 'Person', w: 0.23 },
    ],
    rows: day.map((e) => ({
      zeit: hhmm(e.tsClient), was: e.taskTitle,
      wert: e.kind === 'temp' && e.value !== null ? `${fmtTemp(e.value)} ${e.unit || '°C'}` : 'durchgeführt',
      ergebnis: e.ok === false ? 'Abweichung' : 'in Ordnung',
      wer: e.userName,
    })),
  });
  pdf.y -= 22;
  stampBlock(pdf, [
    `Erstellt von ${generatedBy} am ${fmtDate(Date.now())}, ${hhmm(Date.now())} Uhr`,
    `Hash-Kette: ${integrity.chainOk === false ? 'ACHTUNG – Prüfung fehlgeschlagen' : 'geprüft & unversehrt'} · ${String(integrity.chainHead || '–').slice(0, 32)}…`,
    `${day.length} Einträge an diesem Tag`,
  ]);
  footer(pdf, `${business.name || 'KneipenCheck'} · Tagesnachweis ${deDate(key)}`);
  return { bytes: pdf.build(), count: day.length, fileName: `Tagesnachweis-${key}.pdf` };
}

/* ---------- 3) Arbeitsliste „was ist noch offen“ ------------------------ */

export function buildOpenTasksReport({ tasks = [], entries = [], settings = {}, business = {}, key = dayKey(), generatedBy = 'Betrieb' }) {
  const pdf = new Pdf(`Offene Kontrollen ${key}`);
  const ov = dayOverview({ tasks, entries, settings, key, now: Date.now() });
  const open = ov.items.filter((i) => i.state !== 'fertig' && i.state !== 'abweichung');
  const done = ov.items.filter((i) => i.state === 'fertig' || i.state === 'abweichung');
  pdf.textAt('Was ist heute noch offen?', MARGIN, 800, { size: 16, font: 'F2' });
  pdf.textAt(`${business.name || ''} · ${deDate(key)}`, MARGIN, 781, { size: 11, color: COLORS.grey });
  pdf.line(768, { color: COLORS.ink, w: 1.2 });
  pdf.y = 740;
  pdf.textAt(`Erledigt: ${done.length} von ${ov.items.length} (${ov.percent} %)`, MARGIN, pdf.y, { size: 11, font: 'F2' });
  pdf.y -= 22;
  table(pdf, {
    columns: [
      { key: 'was', label: 'Noch offen', w: 0.42 },
      { key: 'schicht', label: 'Schicht', w: 0.24 },
      { key: 'bis', label: 'bis', w: 0.14 },
      { key: 'haken', label: 'erledigt', w: 0.2 },
    ],
    rows: open.map((i) => ({ was: i.task.title, schicht: i.slotLabel || 'ganztags', bis: i.slot?.to || '–', haken: '[      ]' })),
  });
  pdf.y -= 22;
  stampBlock(pdf, [
    'Diese Liste ist eine Arbeitshilfe und kein Nachweis.',
    'Erledigte Kontrollen bitte in der App abhaken – dort mit Zeitstempel und Person.',
    `Erstellt von ${generatedBy} am ${fmtDate(Date.now())}, ${hhmm(Date.now())} Uhr`,
  ]);
  footer(pdf, `${business.name || 'KneipenCheck'} · offene Kontrollen ${deDate(key)}`);
  return { bytes: pdf.build(), open: open.length, fileName: `Offene-Kontrollen-${key}.pdf` };
}

/* ---------- 4) Aushang für die Wand (Schichtplan) ----------------------- */

export function buildWallSheet({ tasks = [], settings = {}, business = {} }) {
  const pdf = new Pdf('Aushang');
  const slots = settings?.slots?.length ? settings.slots : [{ id: 'all', label: 'Tag', from: '00:00', to: '23:59' }];
  pdf.textAt('Wer macht heute was?', MARGIN, 800, { size: 18, font: 'F2' });
  pdf.textAt(`${business.name || ''} · zum Aufhängen in der Küche`, MARGIN, 782, { size: 10, color: COLORS.grey });
  pdf.line(770, { color: COLORS.ink, w: 1.4 });
  pdf.y = 740;
  table(pdf, {
    columns: [
      { key: 'was', label: 'Kontrolle', w: 0.4 },
      { key: 'soll', label: 'Sollwert', w: 0.2 },
      ...slots.map((s, i) => ({ key: 's' + i, label: s.label, w: 0.4 / slots.length })),
    ],
    rows: dueTasks(tasks, dayKey()).map((t) => {
      const row = {
        was: t.title + (t.hint ? ` (${t.hint})` : ''),
        soll: t.kind === 'temp' && t.min !== null ? `${fmtTemp(t.min)} bis ${fmtTemp(t.max)} °C` : '—',
      };
      slots.forEach((s, i) => { row['s' + i] = !t.slots?.length || t.slots.includes(s.id) ? '[    ]' : ''; });
      return row;
    }),
    size: 9.5, rowHeight: 18,
  });
  footer(pdf, `${business.name || 'KneipenCheck'} · Aushang erzeugt am ${fmtDate(Date.now())}`);
  return { bytes: pdf.build(), fileName: 'Aushang-Kontrollen.pdf' };
}

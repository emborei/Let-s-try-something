#!/usr/bin/env node
/* ==========================================================================
   Testserver für das Formularpaket „Gewerbe, Verkostung & Verkauf in Berlin“
   • /                 – Übersichtsseite mit allen PDFs (öffnen / herunterladen)
   • /formulare/<x>.pdf – PDF inline im Browser, mit Range-Support
   • /app/             – KneipenCheck-PWA (statisch)
   • /api/health       – Status als JSON
   • /api/formulare    – Liste der PDFs als JSON

   Keine Abhängigkeiten, bindet an 0.0.0.0. TLS übernimmt der HTTPS-Proxy
   der Plattform (https://<port>-<sandbox>.e2b.app) – der Server selbst
   spricht HTTP, weil das Zertifikat dort terminiert wird.
   ========================================================================== */

import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.join(__dirname, 'formulare');
const APP_DIR = path.join(ROOT, 'app');

const PORT = Number(process.env.PORT || 8080);
/* Optionaler KneipenCheck-Sync-Server (läuft intern, nicht öffentlich) */
const UPSTREAM = process.env.UPSTREAM || 'http://127.0.0.1:4173';
const HOST = process.env.HOST || '0.0.0.0';
const START = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/* Beschreibungen und Seitenzahlen der Formblätter (Stand: Build 26.10.2026) */
const META = {
  '00-Leitfaden-Ablauf-und-Kosten': {
    nr: '00', titel: 'Leitfaden: Ablauf, Fristen, Kosten',
    text: 'Einordnung der Tätigkeit, Zeitplan, Gebühren, Kurzmatrix „welches Papier wann“, Aufbewahrung, Rechtsgrundlagen.',
    seiten: 4, tag: 'Orientierung',
  },
  '01-Unterlagen-Checkliste': {
    nr: '01', titel: 'Unterlagen-Checkliste',
    text: 'Acht Blöcke zum Abhaken: Person, Gewerbe, Lebensmittel, IfSG, Gaststätte, Event, Steuern, Versicherung.',
    seiten: 3, tag: 'Checkliste',
  },
  '02-Gewerbeanmeldung-GewA1': {
    nr: '02', titel: 'Gewerbeanmeldung (GewA 1)',
    text: 'Felder 1–33 im Aufbau der Anlage 1 GewAnzV, dazu Ausfüllhilfe mit drei fertigen Tätigkeitstexten.',
    seiten: 5, tag: 'Behörde',
  },
  '02b-Gewerbeanmeldung-GewA1-vorausgefuellt': {
    nr: '02b', titel: 'GewA 1 – vorausgefüllt',
    text: 'Tätigkeit (Feld 18), Betriebsart, Neugründung und „keine Erlaubnis“ gesetzt. Personalien bleiben leer.',
    seiten: 6, tag: 'vorausgefüllt',
  },
  '03-Meldung-Lebensmittelunternehmer': {
    nr: '03', titel: 'Meldung Lebensmittelunternehmer',
    text: 'Registrierung nach Art. 6 VO (EG) 852/2004 im Berliner Aufbau, Bezirksliste und Muster-E-Mail.',
    seiten: 4, tag: 'Behörde',
  },
  '03b-Meldung-Lebensmittelunternehmer-vorausgefuellt': {
    nr: '03b', titel: 'LMU-Meldung – vorausgefüllt',
    text: 'Betriebsart, Sortiment und Kostproben gesetzt; Adressen und Personalien ergänzt du selbst.',
    seiten: 4, tag: 'vorausgefüllt',
  },
  '04-IfSG-Belehrung': {
    nr: '04', titel: 'IfSG-Belehrung § 43',
    text: 'Terminblatt Gesundheitsamt, Erklärung in Textform, Merkblatt § 42 und Folgebelehrungstabelle.',
    seiten: 2, tag: 'Gesundheitsamt',
  },
  '05-Hygienekonzept': {
    nr: '05', titel: 'Hygienekonzept',
    text: 'Gefahrenanalyse über zehn Prozessschritte, fünf CCPs mit Grenzwerten, Reinigungsplan, Rückruf, Verifizierung.',
    seiten: 4, tag: 'Lebensmittelaufsicht',
  },
  '05b-Hygienekonzept-vorausgefuellt': {
    nr: '05b', titel: 'Hygienekonzept – vorausgefüllt',
    text: 'Typische Tätigkeiten einer Verkostungskraft angekreuzt, Wein/Sekt ab 16, keine tierischen Produkte.',
    seiten: 4, tag: 'vorausgefüllt',
  },
  '06-Tagesprotokoll-Temperatur-Reinigung': {
    nr: '06', titel: 'Tagesprotokoll',
    text: 'Temperaturen, Wareneingang, Reinigung, Hygienekontrolle und Abweichungen – ein Blatt je Einsatztag.',
    seiten: 2, tag: 'Aufzeichnung',
  },
  '07-Verkostungsprotokoll': {
    nr: '07', titel: 'Verkostungsprotokoll',
    text: 'Produkte mit Charge, Sulfiten und Ausgabetemperatur, Hygienekontrolle, Vorfälle, Abnahme durch Auftraggeber.',
    seiten: 2, tag: 'Aufzeichnung',
  },
  '08-Abweichungsprotokoll': {
    nr: '08', titel: 'Abweichungsprotokoll',
    text: 'Vorfall, Ursache, Sofortmaßnahme, Vorbeugung und Rückruf-Checkliste – sauber abgeschlossen.',
    seiten: 2, tag: 'Aufzeichnung',
  },
  '09-Gaststaettenrecht-Gestattung-Erlaubnis': {
    nr: '09', titel: 'Gaststättenrecht',
    text: 'Gestattung § 12 GastG (Anlass) und Erlaubnis § 2 GastG (dauerhaft), Fristen, Prüfpunkte, häufige Fehler.',
    seiten: 4, tag: 'Behörde',
  },
  '10-Sondernutzung-und-Event-Checkliste': {
    nr: '10', titel: 'Sondernutzung & Event-Checkliste',
    text: 'Antrag für öffentliche Flächen, Vorbereitung eine Woche vorher, Ablauf am Veranstaltungstag.',
    seiten: 2, tag: 'Behörde',
  },
  '11-Verkostungsvertrag': {
    nr: '11', titel: 'Verkostungsvertrag',
    text: 'Leistungen, Ware und Schwund, Honorar mit USt-Varianten, Selbständigkeitsklausel, Haftung, Kündigung.',
    seiten: 5, tag: 'Vertrag',
  },
  '12-Rechnung-und-Quittung': {
    nr: '12', titel: 'Rechnung & Quittung',
    text: 'Rechnungsvorlage, Quittung und Selbstkontrolle der Pflichtangaben nach § 14 UStG.',
    seiten: 2, tag: 'Abrechnung',
  },
  '13-Datenschutz-und-Impressum': {
    nr: '13', titel: 'Impressum, Datenschutz, DSGVO',
    text: 'Impressum nach § 5 DDG, Datenschutzbausteine, Verarbeitungsverzeichnis, TOM, Fotoeinwilligung.',
    seiten: 2, tag: 'Website',
  },
  'Startpaket-Verkostung-Berlin-komplett': {
    nr: '★', titel: 'Gesamtpaket – alle Dokumente',
    text: 'Alle 17 Formblätter in einer Datei, 57 Seiten, mit Seitenzahlen und Inhaltsverzeichnis-Charakter.',
    seiten: 57, tag: 'Komplett',
  },
};

/* ---------- Helfer -------------------------------------------------------- */

async function listPdfs() {
  const names = (await readdir(PDF_DIR)).filter((f) => f.endsWith('.pdf'));
  const out = [];
  for (const file of names) {
    const base = file.replace(/\.pdf$/, '');
    const st = await stat(path.join(PDF_DIR, file));
    const meta = META[base] || {};
    out.push({
      file,
      base,
      nr: meta.nr || '–',
      titel: meta.titel || base,
      text: meta.text || '',
      seiten: meta.seiten || null,
      tag: meta.tag || 'Dokument',
      bytes: st.size,
      mtime: st.mtime.toISOString(),
      url: `/formulare/${encodeURIComponent(file)}`,
    });
  }
  const rank = (d) => {
    if (d.base.startsWith('Startpaket')) return -1;
    const n = parseFloat(d.nr.replace('b', '.5'));
    return Number.isFinite(n) ? n : 99;
  };
  return out.sort((a, b) => rank(a) - rank(b));
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

/* ---------- Landingpage --------------------------------------------------- */

function landingPage(pdfs) {
  const cards = pdfs
    .filter((p) => !p.base.startsWith('Startpaket'))
    .map((p) => `
      <article class="card${p.tag === 'vorausgefüllt' ? ' card--pre' : ''}">
        <div class="card__top">
          <span class="nr">${p.nr}</span>
          <span class="tag">${p.tag}</span>
        </div>
        <h3>${p.titel}</h3>
        <p>${p.text}</p>
        <div class="meta">${p.seiten} Seiten · ${kb(p.bytes)}</div>
        <div class="actions">
          <a class="btn btn--primary" href="${p.url}" target="_blank" rel="noopener">Öffnen</a>
          <a class="btn" href="${p.url}" download>Laden</a>
        </div>
      </article>`)
    .join('\n');

  const total = pdfs.find((p) => p.base.startsWith('Startpaket'));
  const pages = pdfs.filter((p) => !p.base.startsWith('Startpaket')).reduce((s, p) => s + (p.seiten || 0), 0);

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Formularpaket · Gewerbe & Verkostung Berlin</title>
<style>
  :root {
    --ink: #10141c; --ink-2: #3b4353; --mut: #6b7384; --line: #e2e5ec;
    --bg: #f7f8fa; --paper: #fff; --blue: #1b4f8f; --blue-soft: #eaf1fa;
    --gold: #b8860b; --green: #1f7a4d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--blue); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  header.hero {
    background: linear-gradient(160deg, #10243e 0%, #1b4f8f 60%, #2b6cb0 100%);
    color: #fff; padding: 40px 0 34px; margin-bottom: 30px;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
    background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22);
    padding: 5px 11px; border-radius: 999px; letter-spacing: .02em;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #57d38c; box-shadow: 0 0 0 3px rgba(87,211,140,.25); }
  h1 { font-size: 30px; line-height: 1.2; margin: 16px 0 8px; letter-spacing: -.01em; }
  .lead { color: #d6e3f5; max-width: 720px; margin: 0; font-size: 16px; }
  .hero-links { margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
  .btn {
    display: inline-block; padding: 9px 15px; border-radius: 9px; font-size: 14px; font-weight: 600;
    text-decoration: none; border: 1px solid var(--line); background: #fff; color: var(--ink);
    transition: transform .06s ease, box-shadow .12s ease;
  }
  .btn:hover { box-shadow: 0 2px 10px rgba(16,20,28,.10); transform: translateY(-1px); }
  .btn--primary { background: var(--blue); border-color: var(--blue); color: #fff; }
  .hero .btn--primary { background: #fff; border-color: #fff; color: #10243e; }
  .hero .btn { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.30); color: #fff; }
  .notice {
    background: var(--paper); border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; padding: 14px 16px; margin: 0 0 26px; font-size: 14px; color: var(--ink-2);
  }
  .notice strong { color: var(--ink); }
  h2 { font-size: 19px; margin: 32px 0 6px; letter-spacing: -.01em; }
  .sub { color: var(--mut); font-size: 14px; margin: 0 0 16px; }
  .big {
    display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center;
    background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px;
    box-shadow: 0 1px 2px rgba(16,20,28,.04); margin-bottom: 8px;
  }
  .big h3 { margin: 0 0 4px; font-size: 18px; }
  .big p { margin: 0; color: var(--mut); font-size: 14px; }
  .big .actions { display: flex; gap: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 8px; }
  .card {
    display: flex; flex-direction: column; background: var(--paper); border: 1px solid var(--line);
    border-radius: 13px; padding: 16px 17px 15px; box-shadow: 0 1px 2px rgba(16,20,28,.04);
  }
  .card--pre { border-color: #cfe3d5; background: linear-gradient(180deg, #fbfefc 0%, #fff 40%); }
  .card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .nr {
    font-size: 12px; font-weight: 700; letter-spacing: .04em; color: var(--blue);
    background: var(--blue-soft); border-radius: 6px; padding: 3px 7px;
  }
  .tag { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--mut); }
  .card--pre .tag { color: var(--green); }
  .card h3 { font-size: 15.5px; margin: 0 0 6px; line-height: 1.3; }
  .card p { margin: 0 0 10px; font-size: 13.5px; color: var(--ink-2); flex: 1; }
  .meta { font-size: 12px; color: var(--mut); margin-bottom: 12px; }
  .card .actions { display: flex; gap: 8px; }
  .card .btn { padding: 7px 12px; font-size: 13px; }
  #suche {
    width: 100%; padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px;
    font-size: 14.5px; background: var(--paper); margin-bottom: 14px; color: var(--ink);
  }
  #suche:focus { outline: 2px solid #bcd4f0; border-color: #9dc0e6; }
  .app-card {
    display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center;
    background: #fffdf6; border: 1px solid #f0e2bd; border-radius: 14px; padding: 20px 22px; margin-top: 8px;
  }
  .app-card h3 { margin: 0 0 4px; font-size: 18px; }
  .app-card p { margin: 0; font-size: 14px; color: var(--ink-2); }
  footer { margin: 42px 0 34px; color: var(--mut); font-size: 13px; border-top: 1px solid var(--line); padding-top: 18px; }
  footer code { background: #eef0f4; padding: 2px 6px; border-radius: 5px; font-size: 12.5px; color: var(--ink-2); }
  .none { color: var(--mut); padding: 18px 0; }
  @media (max-width: 640px) {
    h1 { font-size: 24px; }
    .big, .app-card { grid-template-columns: 1fr; }
    .big .actions, .app-card .actions { flex-wrap: wrap; }
  }
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <span class="pill"><span class="dot"></span> Testserver läuft · HTTPS über Proxy</span>
    <h1>Formularpaket: Gewerbe, Verkostung &amp; Verkauf in Berlin</h1>
    <p class="lead">
      ${pdfs.filter((p) => !p.base.startsWith('Startpaket')).length} ausfüllbare PDF-Formblätter,
      ${pages} Seiten: Gewerbeanmeldung, Lebensmittel-Meldung, IfSG-Belehrung, Hygienekonzept,
      Gaststättenrecht, Sondernutzung, Vertrag, Rechnung und Datenschutz.
      Alle Felder leer – Personalien trägst du selbst ein.
    </p>
    <div class="hero-links">
      ${total ? `<a class="btn btn--primary" href="${total.url}" target="_blank" rel="noopener">Gesamtpaket öffnen</a>` : ''}
      ${total ? `<a class="btn" href="${total.url}" download>Gesamtpaket laden</a>` : ''}
      <a class="btn" href="/app/" target="_blank" rel="noopener">KneipenCheck-PWA</a>
    </div>
  </div>
</header>

<main class="wrap">
  <div class="notice">
    <strong>So funktioniert das Ausfüllen:</strong> PDF im Browsertab öffnen – die grauen Linien sind echte
    Formularfelder. Am Rechner tippen, am Handy drucken und per Hand ausfüllen.
    „vorausgefüllt“ bedeutet: Tätigkeit, Betriebsart und typische Häkchen sind gesetzt, Name, Adresse,
    Datum und Unterschrift bleiben offen. Beträge und Fristen: Stand 26.10.2026, keine Rechtsberatung.
  </div>

  ${total ? `
  <div class="big">
    <div>
      <h3>${total.titel}</h3>
      <p>${total.text}</p>
      <p class="meta" style="margin-top:8px">${total.seiten} Seiten · ${kb(total.bytes)}</p>
    </div>
    <div class="actions">
      <a class="btn btn--primary" href="${total.url}" target="_blank" rel="noopener">Öffnen</a>
      <a class="btn" href="${total.url}" download>Herunterladen</a>
    </div>
  </div>` : ''}

  <h2>Einzelne Dokumente</h2>
  <p class="sub">Klick auf „Öffnen“ zeigt das PDF im Browser, „Laden“ speichert es lokal.</p>
  <input id="suche" type="search" placeholder="Filtern nach Titel, Nummer oder Stichwort … (z. B. Rechnung, IfSG, vorausgefüllt)" autocomplete="off">
  <div class="grid" id="grid">
    ${cards}
  </div>
  <p class="none" id="none" hidden>Kein Dokument passt zu diesem Filter.</p>

  <h2>KneipenCheck-App</h2>
  <p class="sub">Die PWA aus diesem Repository: Temperatur- und Reinigungskontrollen mit Server-Zeitstempel und PDF-Bericht.</p>
  <div class="app-card">
    <div>
      <h3>KneipenCheck · Hygienedokumentation</h3>
      <p>Offline-fähig, Ein-Klick-PDF für die Lebensmittelkontrolle, Hash-Kette als Manipulationsnachweis.
         Beim ersten Start führt die Einrichtung durch Betrieb, Kontrollen und Team.</p>
    </div>
    <div class="actions">
      <a class="btn btn--primary" href="/app/" target="_blank" rel="noopener">App öffnen</a>
    </div>
  </div>

  <footer>
    <p>
      Testserver ohne Abhängigkeiten · <code>node gewerbe-berlin/testserver.mjs</code> ·
      Port <code>${PORT}</code> · Laufzeit seit Start: <span id="up"></span>
    </p>
    <p>
      Öffentliche Adresse: <code>https://${PORT}-&lt;sandbox&gt;.e2b.app</code> (Port wird vom Proxy auf HTTPS abgebildet).
      Inhalte liegen im Repository unter <code>gewerbe-berlin/</code>, erzeugt mit <code>build/build.py</code>.
    </p>
  </footer>
</main>

<script>
  const input = document.getElementById('suche');
  const cards = Array.from(document.querySelectorAll('#grid .card'));
  const none = document.getElementById('none');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const c of cards) {
      const hit = !q || c.textContent.toLowerCase().includes(q);
      c.style.display = hit ? '' : 'none';
      if (hit) shown++;
    }
    none.hidden = shown > 0;
  });
  // Laufzeit grob anzeigen
  const start = Date.now() - ${Date.now() - START};
  const up = document.getElementById('up');
  function tick() {
    const s = Math.floor((Date.now() - start) / 1000);
    up.textContent = s < 60 ? s + ' s' : Math.floor(s / 60) + ' min';
  }
  tick(); setInterval(tick, 10000);
</script>
</body>
</html>`;
}

/* ---------- Proxy für die KneipenCheck-API -------------------------------- */

function proxyToUpstream(req, res) {
  const target = new URL(UPSTREAM);
  const upReq = httpRequest(
    {
      hostname: target.hostname,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${target.hostname}:${target.port}` },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  upReq.on('error', () => {
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: false,
      error: 'Sync-Server nicht gestartet',
      hinweis: 'Starte node server/index.mjs (Port 4173) oder setze UPSTREAM.',
    }));
  });
  req.pipe(upReq);
}

/* ---------- Statische Dateien mit Range-Support --------------------------- */

async function serveFile(req, res, filePath, { download = false } = {}) {
  let st;
  try {
    st = await stat(filePath);
    if (!st.isFile()) throw new Error('not a file');
  } catch {
    return send(res, 404, '<h1>404</h1><p>Datei nicht gefunden.</p>');
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const headers = {
    'content-type': type,
    'cache-control': ext === '.pdf' ? 'public, max-age=300' : 'no-cache',
    'accept-ranges': 'bytes',
  };
  if (download) {
    headers['content-disposition'] = `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`;
  }
  if (ext === '.pdf') {
    // Inline-Anzeige erzwingen, damit der Browser-Tab das Formular zeigt
    headers['content-disposition'] = download
      ? `attachment; filename="${path.basename(filePath)}"`
      : `inline; filename="${path.basename(filePath)}"`;
  }

  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
    let start = startRaw ? parseInt(startRaw, 10) : 0;
    let end = endRaw ? parseInt(endRaw, 10) : st.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= st.size) {
      res.writeHead(416, { 'content-range': `bytes */${st.size}` });
      return res.end();
    }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${start}-${end}/${st.size}`,
      'content-length': end - start + 1,
    });
    return readFile(filePath).then((buf) => res.end(buf.subarray(start, end + 1)));
  }

  res.writeHead(200, { ...headers, 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  return readFile(filePath).then((buf) => res.end(buf));
}

/* ---------- Server -------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = decodeURIComponent(url.pathname);
  const p0 = url.pathname;
  const method = req.method || 'GET';

  if (method !== 'GET' && method !== 'HEAD' && !p0.startsWith('/api/')) {
    return send(res, 405, 'Methode nicht erlaubt', { allow: 'GET, HEAD' });
  }

  try {
    // Redirects für aufgeräumte URLs
    if (p === '/formulare' || p === '/formulare/') {
      res.writeHead(302, { location: '/' });
      return res.end();
    }
    if (p === '/app') {
      res.writeHead(302, { location: '/app/' });
      return res.end();
    }

    if (p === '/' || p === '/index.html') {
      const pdfs = await listPdfs();
      return send(res, 200, landingPage(pdfs));
    }

    if (p === '/api/health') {
      const pdfs = await listPdfs();
      const body = JSON.stringify({
        ok: true,
        uptimeSekunden: Math.round((Date.now() - START) / 1000),
        port: PORT,
        pdfs: pdfs.length,
        seiten: pdfs.reduce((s, d) => s + (d.seiten || 0), 0),
        app: true,
        time: new Date().toISOString(),
      }, null, 2);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(body);
    }

    if (p === '/api/formulare') {
      const pdfs = await listPdfs();
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(pdfs, null, 2));
    }

    // Alles andere unter /api/ geht an den KneipenCheck-Sync-Server
    if (p.startsWith('/api/')) return proxyToUpstream(req, res);

    if (p.startsWith('/formulare/')) {
      const name = path.basename(p.slice('/formulare/'.length));
      if (!name || name.includes('..')) return send(res, 400, 'Ungültiger Dateiname');
      const dl = url.searchParams.has('download');
      return serveFile(req, res, path.join(PDF_DIR, name), { download: dl });
    }

    if (p === '/app/' || p.startsWith('/app/')) {
      const rel = p.replace(/^\/app\/?/, '');
      const target = path.resolve(APP_DIR, rel || 'index.html');
      if (!target.startsWith(APP_DIR)) return send(res, 403, 'Zugriff verweigert');
      return serveFile(req, res, target);
    }

    return send(res, 404, `<!doctype html><meta charset="utf-8">
      <body style="font:16px system-ui;padding:40px">
      <h1>404</h1><p>Diese Adresse gibt es nicht.</p>
      <p><a href="/">Zur Übersicht</a></p></body>`);
  } catch (err) {
    console.error('Fehler:', err);
    return send(res, 500, 'Interner Fehler');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Testserver läuft auf http://${HOST}:${PORT}`);
  console.log(`  Übersicht:  http://localhost:${PORT}/`);
  console.log(`  PDFs:       http://localhost:${PORT}/formulare/<datei>.pdf`);
  console.log(`  App:        http://localhost:${PORT}/app/`);
  console.log(`  Status:     http://localhost:${PORT}/api/health`);
});

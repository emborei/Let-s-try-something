#!/usr/bin/env node
/* ==========================================================================
   KneipenCheck Sync-Server
   • liefert die PWA aus (statische Dateien aus ../app)
   • /api/time            – echte Serverzeit für unverfälschbare Zeitstempel
   • /api/devices/register – Gerät anmelden, Token bekommen
   • /api/sync            – Einträge aufnehmen, Server-Zeitstempel + Hash-Kette
   • /api/export/:monat.pdf – Monatsbericht für die Lebensmittelkontrolle
   • /api/verify          – Prüfung der Hash-Kette (Manipulationsnachweis)
   • /api/stats           – Zahlen für die Betreiber-Übersicht

   Bewusst ohne Datenbank und ohne npm-Abhängigkeiten: eine JSON-Datei plus
   ein unveränderliches Journal (data/journal.jsonl). Läuft auf jedem Hoster,
   der Node ausführen kann – und auf einem Raspberry Pi in der Kneipe.
   ========================================================================== */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.mjs';
// Berichts-Erzeugung teilt sich der Server mit der App (eine Quelle der Wahrheit):
import { buildMonthlyReport, buildDailyReport, buildOpenTasksReport } from '../app/js/core/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, '..', 'app'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const VERSION = '2.0.0-prototype';

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
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const store = await new Store(DATA_DIR).init();

/* ---------- Helfer ------------------------------------------------------- */

function json(res, code, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    ...extra,
  });
  res.end(body);
}

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Zu groß')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('Ungültiges JSON')); }
    });
    req.on('error', reject);
  });
}

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

/* ---------- API ---------------------------------------------------------- */

async function handleApi(req, res, url) {
  const p = url.pathname;

  if (p === '/api/health') {
    return json(res, 200, { ok: true, app: 'kneipencheck-sync', version: VERSION, now: Date.now(), storage: 'json+journal' });
  }

  // 1) Echte Serverzeit – Grundlage aller manipulationssicheren Zeitstempel
  if (p === '/api/time') {
    const chain = store.verifyChain();
    return json(res, 200, {
      now: Date.now(),
      iso: new Date().toISOString(),
      timezone: 'UTC',
      seq: store.db.seq,
      chainValid: chain.valid,
      checked: chain.checked,
      version: VERSION,
    });
  }

  // 2) Gerät anmelden
  if (p === '/api/devices/register' && req.method === 'POST') {
    const body = await readBody(req, 64 * 1024);
    const dev = store.registerDevice(body);
    await store.save();
    await store.logJournal({ type: 'device.register', deviceId: dev.id, ts: Date.now(), business: dev.businessName });
    log('Gerät registriert:', dev.id, dev.businessName || '');
    return json(res, 200, { deviceId: dev.id, token: dev.token, serverTime: Date.now(), version: VERSION });
  }

  // 3) Synchronisation
  if (p === '/api/sync' && req.method === 'POST') {
    const body = await readBody(req);
    const token = req.headers['x-device-token'];
    const device = store.deviceByToken(token);
    if (!device) return json(res, 401, { ok: false, error: 'Gerät nicht angemeldet' });
    device.lastSeen = Date.now();

    // Geräte-Hash-Kette validieren (nur Protokollierung, kein Blockieren –
    // ein einzelner fehlerhafter Eintrag darf den Betrieb nicht lahmlegen)
    const result = store.ingest({ ...body, device });
    const chain = store.verifyChain();
    await store.save();
    await store.logJournal({
      type: 'sync', deviceId: device.id, ts: Date.now(), accepted: result.accepted,
      skipped: result.skipped, seq: result.seq, chainValid: chain.valid,
    });
    if (result.accepted) log(`Sync: +${result.accepted} Einträge von ${device.businessName || device.id} (seq ${result.seq})`);
    return json(res, 200, {
      ok: true, serverTime: Date.now(), seq: result.seq,
      accepted: result.accepted, skipped: result.skipped, clockCorrected: result.corrected,
      stamped: result.stamped, chainValid: chain.valid,
    });
  }

  // 4) Berichte
  const exportMatch = p.match(/^\/api\/export\/(\d{4}-\d{2})(?:-(\d{2}))?\.pdf$/);
  if (exportMatch && req.method === 'GET') {
    const token = req.headers['x-device-token'] || url.searchParams.get('token');
    const device = store.deviceByToken(token);
    if (!device) return json(res, 401, { ok: false, error: 'Gerät nicht angemeldet (Token fehlt)' });

    const ym = exportMatch[1];
    const fromKey = `${ym}-01`;
    const lastDay = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
    const toKey = `${ym}-${String(lastDay).padStart(2, '0')}`;
    const chain = store.verifyChain();
    const { bytes } = await buildMonthlyReport({
      entries: store.db.entries.map(stripInternal),
      tasks: store.db.tasks || [],
      business: { name: device.businessName || 'Betrieb', ...(store.db.business || {}) },
      settings: { compliance: { retentionMonths: 24 }, slots: [] },
      fromKey, toKey,
      generatedBy: device.userName || 'Betrieb',
      integrity: { chainOk: chain.valid, chainHead: store.db.chain.last, serverTime: Date.now(), note: 'Serverzeit dieses Servers' },
    });
    res.writeHead(200, {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="kneipencheck-${ym}.pdf"`,
      'content-length': bytes.length,
      'cache-control': 'no-store',
    });
    return res.end(Buffer.from(bytes));
  }

  // Tageszettel
  const dailyMatch = p.match(/^\/api\/export\/tag\/(\d{4}-\d{2}-\d{2})\.pdf$/);
  if (dailyMatch && req.method === 'GET') {
    const token = req.headers['x-device-token'] || url.searchParams.get('token');
    const device = store.deviceByToken(token);
    if (!device) return json(res, 401, { ok: false, error: 'Token fehlt' });
    const { bytes } = await buildDailyReport({
      entries: store.db.entries.map(stripInternal), business: store.db.business || { name: device.businessName || '' },
      key: dailyMatch[1], generatedBy: device.userName || 'Betrieb',
      integrity: { chainOk: store.verifyChain().valid, chainHead: store.db.chain.last },
    });
    res.writeHead(200, {
      'content-type': 'application/pdf', 'content-length': bytes.length, 'cache-control': 'no-store',
    });
    return res.end(Buffer.from(bytes));
  }

  // Offene Kontrollen (Arbeitsliste zum Ausdrucken)
  if (p === '/api/export/offen.pdf' && req.method === 'GET') {
    const { bytes } = await buildOpenTasksReport({
      tasks: store.db.tasks || [], entries: store.db.entries.map(stripInternal),
      settings: { slots: [] }, business: store.db.business || {},
      key: url.searchParams.get('tag') || undefined,
    });
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': bytes.length, 'cache-control': 'no-store' });
    return res.end(Buffer.from(bytes));
  }

  // 5) Integrität & Statistik
  if (p === '/api/verify') {
    const chain = store.verifyChain();
    return json(res, 200, {
      ok: chain.valid, ...chain, head: store.db.chain.last,
      checkedAt: Date.now(), journal: 'data/journal.jsonl',
    });
  }
  if (p === '/api/stats') return json(res, 200, store.stats());

  return json(res, 404, { ok: false, error: 'Unbekannte API-Adresse' });
}

function stripInternal(e) {
  const { receivedAt, ...rest } = e;
  return rest;
}

/* ---------- Statische Dateien ------------------------------------------- */

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403).end('Verboten'); return; }
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) return serveStatic(req, res, new URL(url.pathname.replace(/\/?$/, '/index.html'), url));
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': data.length,
      // Service Worker und HTML immer frisch prüfen, Rest darf kurz cachen
      'cache-control': ext === '.html' || filePath.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300',
      'service-worker-allowed': '/',
      'x-content-type-options': 'nosniff',
    };
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    // SPA-Fallback: unbekannte Pfade ohne Endung → index.html
    if (!path.extname(filePath)) {
      try {
        const data = await readFile(path.join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'content-type': MIME['.html'], 'content-length': data.length, 'cache-control': 'no-cache' });
        return res.end(data);
      } catch { /* weiter */ }
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Nicht gefunden: ' + rel);
  }
}

/* ---------- Server ------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type,x-device-token',
        'access-control-allow-methods': 'GET,POST,HEAD,OPTIONS',
      });
      return res.end();
    }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (e) {
    log('Fehler:', e.message);
    if (!res.headersSent) json(res, 500, { ok: false, error: e.message });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  log(`KneipenCheck Sync-Server läuft auf http://${HOST}:${PORT}`);
  log(`App:   http://localhost:${PORT}/`);
  log(`Daten: ${DATA_DIR}`);
  log(`Prüfe: http://localhost:${PORT}/api/health`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    log('Beende … speichere Daten.');
    try { await store.save(); } catch {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500);
  });
}

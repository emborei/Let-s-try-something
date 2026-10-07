/* ==========================================================================
   server-time.js – „echte“ Uhrzeit vom Server
   Kernidee: Ein Gerät kann falsch gestellt sein. Deshalb holt sich die App
   beim Start die Serverzeit und rechnet sie mit der verstrichenen Zeit weiter
   (monotone Zeit, damit ein Verstellen während der Schicht nichts bringt).
   Offline wird lokal weitergerechnet und der Bereich sichtbar markiert.
   ========================================================================== */

import { tzOffsetMinutes } from './util.js';
import * as db from './db.js';

const OFFSET_KEY = 'serverOffset';
const SYNCED_KEY = 'serverTimeSyncedAt';

let offsetMs = 0;         // serverNow − clientNow
let syncedAt = 0;         // wann zuletzt echte Serverzeit geholt
let lastSyncState = 'pending';   // 'ok' | 'offline' | 'untrusted' | 'pending'

export function now() { return Date.now() + offsetMs; }
export const serverOffset = () => offsetMs;
export const lastSyncedAt = () => syncedAt;
export const syncState = () => lastSyncState;
/** Serverzeit gilt als „echt“, wenn sie innerhalb der letzten 30 Minuten geholt wurde. */
export const isFresh = (maxAgeMs = 30 * 60 * 1000) => syncedAt > 0 && (Date.now() - syncedAt) < maxAgeMs;

export async function loadFromStorage() {
  const o = await db.metaGet(OFFSET_KEY, null);
  const s = await db.metaGet(SYNCED_KEY, null);
  if (typeof o === 'number') offsetMs = o;
  if (typeof s === 'number') syncedAt = s;
  return { offsetMs, syncedAt };
}

async function save() {
  await db.metaSet(OFFSET_KEY, offsetMs);
  await db.metaSet(SYNCED_KEY, syncedAt);
}

/**
 * Holt die Serverzeit. Nutzt drei Wege:
 *  1. eigenen KueipenCheck-Server (BEST: liefert eine Kette + Reihenfolge)
 *  2. /api/time einer beliebigen Instanz ohne Auth
 *  3. HTTP-„Date“-Header (überall vorhanden, sekundengenau)
 */
export async function syncNow({ serverUrl = '', timeoutMs = 4000 } = {}) {
  const t0 = Date.now();
  const urls = [];
  if (serverUrl) urls.push({ url: serverUrl.replace(/\/$/, '') + '/api/time', kind: 'own' });
  urls.push({ url: 'https://worldtimeapi.org/api/timezone/Etc/UTC', kind: 'json', path: (j) => Date.parse(j.utc_datetime) });
  urls.push({ url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC', kind: 'json', path: (j) => Date.parse(j.dateTime.endsWith('Z') ? j.dateTime : j.dateTime + 'Z') });

  for (const u of urls) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(u.url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      const rtt = Date.now() - t0;
      if (!res.ok) continue;
      if (u.kind === 'own') {
        const j = await res.json();
        offsetMs = Number(j.now) + Math.round(rtt / 2) - Date.now();
        syncedAt = Date.now();
        lastSyncState = 'ok';
        await save();
        return { ok: true, source: 'kneipencheck-server', serverNow: now(), rtt, chainValid: j.chainValid };
      }
      if (u.kind === 'json') {
        const j = await res.json();
        const serverMs = u.path(j);
        if (!Number.isFinite(serverMs)) continue;
        offsetMs = (serverMs + Math.round(rtt / 2)) - Date.now();
        offsetMs = Math.round(offsetMs / 1000) * 1000; // auf Sekunde runden (fair)
        syncedAt = Date.now();
        lastSyncState = 'ok';
        await save();
        return { ok: true, source: new URL(u.url).host, serverNow: now(), rtt };
      }
    } catch { /* nächster Versuch */ }
    finally { clearTimeout(timer); }
  }

  // Fallback: Date-Header irgendeiner erreichbaren Adresse
  for (const url of ['/', 'https://www.google.com/generate_204', 'https://1.1.1.1/']) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', method: 'GET' });
      clearTimeout(timer);
      const rtt = Date.now() - t0;
      const hdr = res.headers.get('date');
      if (!hdr) continue;
      const serverMs = Date.parse(hdr);
      if (!Number.isFinite(serverMs)) continue;
      offsetMs = Math.round(((serverMs + Math.round(rtt / 2)) - Date.now()) / 1000) * 1000;
      syncedAt = Date.now();
      lastSyncState = 'ok';
      await save();
      return { ok: true, source: url, serverNow: now(), rtt, coarse: true };
    } catch { /* weiter */ }
    finally { clearTimeout(timer); }
  }

  lastSyncState = 'offline';
  return { ok: false, source: null, serverNow: now(), error: 'Keine Verbindung – Uhr läuft lokal weiter.' };
}

/** Aktueller Stand für die Anzeige in der Kopfzeile. */
export function timeStatusText() {
  if (lastSyncState === 'offline') return 'Zeitquelle: Gerät (offline)';
  if (!isFresh()) return 'Zeitquelle: Gerät';
  return 'Zeitquelle: Server';
}

/** Zeitstempel für einen Eintrag – mit Kontext, den das PDF später ausweist. */
export function stamp() {
  const clientMs = Date.now();
  const serverMs = now();
  return {
    tsClient: clientMs,
    tsServer: isFresh() ? serverMs : null,
    tz: tzOffsetMinutes(),
    serverSkewMs: serverMs - clientMs,
    trusted: isFresh(),
    source: lastSyncState,
  };
}

/** Anzeige für die Prüfer-Zeile: „Serverzeit 12.10.2026, 14:31“ oder Warnhinweis. */
export function stampLabel(ts) {
  const d = new Date(ts ?? now());
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())} Uhr`;
}

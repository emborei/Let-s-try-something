/* ==========================================================================
   sync.js – Offline-Warteschlange + Abgleich mit dem Server
   Grundgedanke: Jede Aktion landet ZUERST lokal (und ist damit gespeichert).
   Danach wandert sie in eine Warteschlange und wird synchronisiert, sobald
   wieder Internet da ist. Nichts geht verloren, auch wenn wochenlang kein
   Netz da ist.
   ========================================================================== */

import * as db from './db.js';
import { uuid, canonical, sha256Hex } from './util.js';
import { entryDigestPayload, entryHash } from './model.js';
import { now as serverNow, isFresh } from './server-time.js';

const STATE_KEY = 'syncState';
let running = false;
let listeners = new Set();

export function onSyncChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) { try { fn(); } catch {} } }

/** Etwas in die Warteschlange legen. */
export async function enqueue(type, payload) {
  const item = { id: uuid(), type, payload, createdAt: Date.now(), tries: 0, lastError: null };
  await db.put('outbox', item);
  emit();
  return item;
}

export async function queueLength() {
  return (await db.all('outbox')).length;
}

export async function state() {
  const q = await queueLength();
  return {
    queue: q,
    lastAttempt: await db.metaGet('lastSyncAttempt', null),
    lastSuccess: await db.metaGet('lastSyncSuccess', null),
    lastError: await db.metaGet('lastSyncError', null),
    serverSeq: await db.metaGet('serverSeq', 0),
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  };
}

function base(settings) {
  return (settings?.server?.url || '').replace(/\/$/, '');
}
function deviceId() {
  return db.metaGet('deviceId', null);
}
function token() {
  return db.metaGet('deviceToken', null);
}

/**
 * Einen Eintrag fertigstellen: lokaler Hash (Kette) berechnen, ablegen,
 * in die Warteschlange legen.
 */
export async function commitEntry(entry) {
  const prev = await db.metaGet('lastHash', null);
  entry.hashPrev = prev;
  entry.hash = await entryHash(entry);
  await db.put('entries', entry);
  await db.metaSet('lastHash', entry.hash);
  await db.metaSet('entryCount', (await db.metaGet('entryCount', 0)) + 1);
  await enqueue('entry.add', {
    id: entry.id, digest: entryDigestPayload(entry), hash: entry.hash, hashPrev: entry.hashPrev,
  });
  return entry;
}

/**
 * Abweichung korrigieren OHNE die Vergangenheit zu verändern:
 * Der alte Eintrag wird als „ersetzt“ markiert (bleibt im Archiv!), ein neuer
 * Eintrag verweist auf ihn. Genau so arbeiten revisionssichere Systeme.
 */
export async function correctEntry(oldEntry, { user, ts, reason, value, ok, note, corrective, photoIds = [] }) {
  const { makeEntry } = await import('./model.js');
  const task = oldEntry.taskSnapshot;
  const corrected = await db.get('entries', oldEntry.id);
  corrected.replacedBy = null;          // wird gleich gesetzt
  corrected.replacedAt = ts;
  corrected.replacedReason = (reason || '').trim();
  const fresh = makeEntry({
    task, user, ts, tz: oldEntry.tzOffset, value, ok, note, corrective, photoIds,
    action: 'correct', correction: { of: oldEntry.id, reason },
  });
  fresh.id = uuid();
  // Der alte Eintrag bleibt unangetastet. Der neue Eintrag wird ganz normal an
  // das Ende der Kette gehängt und verweist über correctionOf auf den alten.
  fresh.hashPrev = (await db.metaGet('lastHash', null)) || null;
  fresh.hash = await sha256Hex(`${fresh.hashPrev || 'GENESIS'}|${entryDigestPayload(fresh)}`);
  corrected.replacedBy = fresh.id;
  await db.put('entries', corrected);   // Korrekturhinweis (mit Audit-Spur)
  await db.put('entries', fresh);
  await db.metaSet('lastHash', fresh.hash);
  await enqueue('entry.correct', {
    id: fresh.id, replaces: corrected.id, reason: reason || '',
    digest: entryDigestPayload(fresh), hash: fresh.hash, hashPrev: fresh.hashPrev,
    correction: { of: corrected.id, reason: reason || '' },
  });
  return { corrected, fresh };
}

/** Registriert dieses Gerät beim Server (einmalig). */
export async function registerDevice(settings, { businessName, userName } = {}) {
  const url = base(settings);
  if (!url) return { ok: false, error: 'Kein Server eingestellt' };
  try {
    const res = await fetch(`${url}/api/devices/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ businessName, userName, deviceId: await deviceId() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    await db.metaSet('deviceId', j.deviceId);
    await db.metaSet('deviceToken', j.token);
    return { ok: true, ...j };
  } catch (e) {
    await db.metaSet('lastSyncError', String(e.message || e));
    return { ok: false, error: String(e.message || e) };
  }
}

/** Alles, was in der Warteschlange steht, zum Server schicken. */
export async function flush(settings) {
  if (running) return { ok: false, error: 'läuft schon' };
  running = true;
  emit();
  try {
    const url = base(settings);
    const queue = (await db.all('outbox')).sort((a, b) => a.createdAt - b.createdAt);
    const seq = await db.metaGet('serverSeq', 0);
    await db.metaSet('lastSyncAttempt', Date.now());

    if (!url) {
      return finish({ ok: false, error: 'Noch kein Server eingetragen (nur lokal gespeichert).', offline: true });
    }
    const settingsDoc = settings;
    if (!settingsDoc.server?.url) return finish({ ok: false, error: 'Noch kein Server eingetragen.', offline: true });

    // Wird beim allerersten Mal gebraucht
    if (!(await token())) {
      const r = await registerDevice(settings, { businessName: settings.business?.name, userName: '' });
      if (!r.ok) return finish({ ok: false, error: r.error, offline: true });
    }

    // Auch Stammdaten mitschicken (Kühlschränke, Bereiche, Einstellungen)
    const tasks = (await db.all('tasks')).map((t) => ({ ...t }));
    const res = await fetch(`${url}/api/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': (await token()) || '' },
      body: JSON.stringify({
        deviceId: await deviceId(),
        sinceSeq: seq,
        clientTime: Date.now(),
        business: settings.business,
        plan: settings.plan,
        tasks,
        events: queue.map((q) => ({ ...q.payload, localTs: q.createdAt })),
      }),
    });
    if (!res.ok) throw new Error(`Server antwortete ${res.status}`);
    const j = await res.json();

    // Warteschlange leeren (nur die, die wir wirklich verschickt haben)
    for (const q of queue) await db.del('outbox', q.id);
    await db.metaSet('serverSeq', j.seq ?? seq);

    // Server-Zeitstempel zurück ins Archiv schreiben
    if (Array.isArray(j.stamped)) {
      for (const s of j.stamped) {
        const e = await db.get('entries', s.id);
        if (e) {
          e.tsServer = s.tsServer;
          e.serverSeq = s.seq;
          e.serverHash = s.serverHash || null;
          e.serverHashPrev = s.serverHashPrev || null;
          await db.put('entries', e);
        }
      }
    }
    if (j.serverTime) {
      // zusätzliche Absicherung: Serverzeit kommt direkt vom eigenen Server
      await db.metaSet('serverTimeFix', j.serverTime);
    }
    return finish({ ok: true, sent: queue.length, seq: j.seq });
  } catch (e) {
    const err = String(e?.message || e);
    await db.metaSet('lastSyncError', err);
    const queue = await db.all('outbox');
    for (const q of queue) { q.tries = (q.tries || 0) + 1; q.lastError = err; await db.put('outbox', q); }
    return finish({ ok: false, error: err, offline: true });
  } finally {
    running = false;
  }
}

async function finish(result) {
  if (result.ok) { await db.metaSet('lastSyncSuccess', Date.now()); await db.metaSet('lastSyncError', null); }
  else await db.metaSet('lastSyncError', result.error);
  emit();
  return result;
}

export const isRunning = () => running;

/** Zeitversatz lokal vs. Server (Anzeige im Bericht). */
export async function skewLabel() {
  const fix = await db.metaGet('serverTimeFix', null);
  if (!fix) return null;
  const diff = fix - serverNow();
  return diff;
}

/**
 * Prüft die Hash-Kette. Zwei Dinge werden kontrolliert:
 *   1. Stimmt der gespeicherte Hash zum Inhalt? (wurde etwas verändert?)
 *   2. Hängt jeder Eintrag wirklich an seinem Vorgänger? (wurde etwas entfernt?)
 * Die Reihenfolge kommt aus der Kette selbst, nicht aus den Uhrzeiten –
 * sonst würden Nachträge fälschlich als Manipulation gemeldet.
 */
export async function verifyChain() {
  const entries = await db.all('entries');
  const problems = [];
  const byHash = new Map();
  for (const e of entries) byHash.set(e.hash, e);

  // 1) Inhalt gegen Prüfsumme
  for (const e of entries) {
    const expect = await sha256Hex(`${e.hashPrev || 'GENESIS'}|${entryDigestPayload(e)}`);
    if (e.hash !== expect) {
      problems.push({ id: e.id, type: 'hash', taskTitle: e.taskTitle, dayKey: e.dayKey, message: 'Inhalt passt nicht zur Prüfsumme' });
    }
  }

  // 2) Kette vom Anfang durchlaufen
  const children = new Map();
  const roots = [];
  for (const e of entries) {
    const prev = e.hashPrev || null;
    if (!prev) roots.push(e);
    else {
      if (!children.has(prev)) children.set(prev, []);
      children.get(prev).push(e);
    }
  }
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const e = queue.shift();
    if (!e || seen.has(e.id)) continue;
    seen.add(e.id);
    for (const kid of children.get(e.hash) || []) queue.push(kid);
  }
  for (const e of entries) {
    if (!seen.has(e.id)) {
      problems.push({ id: e.id, type: 'chain', taskTitle: e.taskTitle, dayKey: e.dayKey, message: 'Hängt nicht an der Kette' });
    }
  }

  return { ok: problems.length === 0, checked: entries.length, problems, head: await db.metaGet('lastHash', null) };
}

export { isFresh, canonical };
